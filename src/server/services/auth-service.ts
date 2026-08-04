import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import {
  generateSessionToken,
  parseSessionCookie,
  secretMatchesHash,
  SESSION_DURATION_MS,
} from "@/lib/security/session-token";
import { isRateLimited, recordFailedAttempt, clearAttempts } from "@/lib/security/rate-limit";
import { logAudit } from "@/server/services/audit-service";
import { DomainError } from "@/lib/errors/domain-error";
import { RoleCode } from "@/lib/permissions/roles";

interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface SessionUser {
  id: string;
  username: string;
  roles: RoleCode[];
  mustChangePassword: boolean;
  sessionId: string;
}

export interface LoginResult {
  cookieValue: string;
  expiresAt: Date;
  user: Omit<SessionUser, "sessionId">;
}

export async function login(
  input: { username: string; password: string } & RequestContext,
): Promise<LoginResult> {
  const rateLimitKey = `${input.username}:${input.ipAddress ?? "unknown"}`;
  if (isRateLimited(rateLimitKey)) {
    throw new DomainError(
      "LOGIN_RATE_LIMITED",
      "تعداد تلاش‌های ناموفق زیاد بوده است. چند دقیقه دیگر دوباره تلاش کنید.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { username: input.username },
    include: { roles: { include: { role: true } } },
  });

  const invalidCredentialsError = new DomainError(
    "INVALID_CREDENTIALS",
    "نام کاربری یا رمز عبور نادرست است.",
  );

  if (!user) {
    recordFailedAttempt(rateLimitKey);
    await logAudit({
      action: "auth.login.failure",
      entityType: "User",
      metadataJson: { username: input.username, reason: "user_not_found" },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
    throw invalidCredentialsError;
  }

  if (!user.isActive) {
    await logAudit({
      actorUserId: user.id,
      action: "auth.login.failure",
      entityType: "User",
      entityId: user.id,
      metadataJson: { reason: "account_disabled" },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
    throw new DomainError("ACCOUNT_DISABLED", "حساب کاربری غیرفعال شده است.");
  }

  const passwordValid = await verifyPassword(user.passwordHash, input.password);
  if (!passwordValid) {
    recordFailedAttempt(rateLimitKey);
    await logAudit({
      actorUserId: user.id,
      action: "auth.login.failure",
      entityType: "User",
      entityId: user.id,
      metadataJson: { reason: "invalid_password" },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
    throw invalidCredentialsError;
  }

  clearAttempts(rateLimitKey);

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const sessionId = crypto.randomUUID();
  const { cookieValue, secretHash } = generateSessionToken(sessionId);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      secretHash,
      expiresAt,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    },
  });

  await logAudit({
    actorUserId: user.id,
    action: "auth.login.success",
    entityType: "User",
    entityId: user.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  const roles = user.roles.map((r) => r.role.code);

  return {
    cookieValue,
    expiresAt,
    user: {
      id: user.id,
      username: user.username,
      roles,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export async function logout(
  cookieValue: string | undefined,
  context: RequestContext,
): Promise<void> {
  const parsed = parseSessionCookie(cookieValue);
  if (!parsed) return;

  const session = await prisma.session.findUnique({ where: { id: parsed.sessionId } });
  if (!session || session.revokedAt) return;

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  await logAudit({
    actorUserId: session.userId,
    action: "auth.logout",
    entityType: "User",
    entityId: session.userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });
}

export async function getSessionUser(cookieValue: string | undefined): Promise<SessionUser | null> {
  const parsed = parseSessionCookie(cookieValue);
  if (!parsed) return null;

  const session = await prisma.session.findUnique({
    where: { id: parsed.sessionId },
    include: { user: { include: { roles: { include: { role: true } } } } },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  if (!session.user.isActive) return null;
  if (!secretMatchesHash(parsed.secret, session.secretHash)) return null;

  return {
    id: session.user.id,
    username: session.user.username,
    roles: session.user.roles.map((r) => r.role.code),
    mustChangePassword: session.user.mustChangePassword,
    sessionId: session.id,
  };
}

export async function changePassword(input: {
  userId: string;
  currentSessionId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: input.userId } });

  const currentValid = await verifyPassword(user.passwordHash, input.currentPassword);
  if (!currentValid) {
    throw new DomainError(
      "INVALID_CURRENT_PASSWORD",
      "رمز عبور فعلی نادرست است.",
      { currentPassword: "رمز عبور فعلی نادرست است." },
    );
  }

  if (input.newPassword.length < 8) {
    throw new DomainError(
      "WEAK_PASSWORD",
      "رمز عبور جدید باید حداقل ۸ کاراکتر باشد.",
      { newPassword: "رمز عبور جدید باید حداقل ۸ کاراکتر باشد." },
    );
  }

  const newPasswordHash = await hashPassword(input.newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash, mustChangePassword: false },
    }),
    prisma.session.updateMany({
      where: { userId: user.id, id: { not: input.currentSessionId }, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await logAudit({
    actorUserId: user.id,
    action: "auth.password_changed",
    entityType: "User",
    entityId: user.id,
  });
}
