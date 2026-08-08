import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { DomainError } from "@/lib/errors/domain-error";
import { hashPassword } from "@/lib/security/password";
import { logAudit } from "@/server/services/audit-service";
import type { ActorContext } from "@/server/services/permission-service";
import { RoleCode } from "@/lib/permissions/roles";
import {
  assertRolesNotEmpty,
  deriveUserStatus,
  normalizeUsername,
  validateDisplayName,
  validatePassword,
  validateReason,
  validateUsername,
  type UserStatus,
} from "@/lib/domain/user-rules";

/**
 * Phase 14 — چرخه عمر کاربر.
 *
 * دو قاعده حیاتی که کل این فایل حولشان می‌چرخد:
 *  ۱) نگهبان «آخرین مدیر فعال» **داخل** تراکنش و پس از اعمال تغییر با FOR UPDATE اجرا می‌شود؛
 *     بررسی پیش از تراکنش نژادی است و دقیقاً همان شکستی را ممکن می‌کند که این قاعده برای
 *     جلوگیری از آن وجود دارد (دو مدیر که هم‌زمان یکدیگر را غیرفعال کنند).
 *  ۲) payload های audit **فهرست‌سفید** ساخته می‌شوند، نه spread کردن موجودیت — وگرنه
 *     `passwordHash` وارد لاگ می‌شود (SEC-15).
 */

export interface UserDTO {
  id: string;
  username: string;
  displayName: string | null;
  status: UserStatus;
  isActive: boolean;
  suspendedAt: string | null;
  suspensionReason: string | null;
  deletedAt: string | null;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  roles: RoleCode[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

const USER_INCLUDE = { roles: { include: { role: true } } } satisfies Prisma.UserInclude;

type UserWithRoles = Prisma.UserGetPayload<{ include: typeof USER_INCLUDE }>;

function toDTO(user: UserWithRoles): UserDTO {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    status: deriveUserStatus(user),
    isActive: user.isActive,
    suspendedAt: user.suspendedAt?.toISOString() ?? null,
    suspensionReason: user.suspensionReason,
    deletedAt: user.deletedAt?.toISOString() ?? null,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    roles: user.roles.map((link) => link.role.code),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    version: user.version,
  };
}

/** فقط فیلدهای بی‌خطر — هرگز passwordHash. */
function auditSafe(user: UserWithRoles): Prisma.InputJsonValue {
  return {
    username: user.username,
    displayName: user.displayName,
    isActive: user.isActive,
    suspendedAt: user.suspendedAt?.toISOString() ?? null,
    deletedAt: user.deletedAt?.toISOString() ?? null,
    roles: user.roles.map((link) => link.role.code),
  };
}

// ---------------------------------------------------------------------------
// نگهبان آخرین مدیر
// ---------------------------------------------------------------------------

/**
 * پس از اعمال تغییر و **داخل همان تراکنش** اجرا می‌شود.
 * `FOR UPDATE OF u` دو تراکنش هم‌زمان را سریالی می‌کند تا هر دو «شمارش امن» نبینند.
 */
async function assertActiveAdminRemains(tx: Prisma.TransactionClient): Promise<void> {
  const rows = await activeAdminIds(tx);
  if (rows.length === 0) {
    throw new DomainError(
      "LAST_ADMIN_PROTECTED",
      "این عملیات آخرین مدیر فعال سامانه را از دسترس خارج می‌کند و مجاز نیست.",
    );
  }
}

async function activeAdminIds(tx: Prisma.TransactionClient, lock = false): Promise<{ id: string }[]> {
  // شناسه‌ها برگردانده می‌شوند و شمارش در JS انجام می‌گیرد، چون PostgreSQL اجازه `FOR UPDATE`
  // همراه تابع تجمیعی را نمی‌دهد.
  const base = Prisma.sql`
    SELECT u.id
    FROM "User" u
    JOIN "UserRole" ur ON ur."userId" = u.id
    JOIN "Role" r ON r.id = ur."roleId"
    WHERE r.code = 'ADMIN'
      AND u."isActive" = true
      AND u."suspendedAt" IS NULL
      AND u."deletedAt" IS NULL
  `;

  // `ORDER BY u.id` پیش از `FOR UPDATE` حیاتی است: قفل باید روی *همه* مدیران فعال بیفتد (با قفل
  // یک ردیف، دو تراکنش می‌توانستند ردیف‌های متفاوتی بگیرند و هر دو از گیت رد شوند) و ترتیب ثابت
  // شناسه تضمین می‌کند همه تراکنش‌ها قفل‌ها را به یک ترتیب بگیرند، وگرنه دو غیرفعال‌سازی موازی
  // بن‌بست می‌سازند و به‌جای ۴۰۹ خطای ۵۰۰ برمی‌گردد.
  return tx.$queryRaw<{ id: string }[]>(
    lock ? Prisma.sql`${base} ORDER BY u.id FOR UPDATE OF u` : base,
  );
}

/**
 * قفل‌گذاری روی مجموعه مدیران فعال، *پیش از* هر نوشتن.
 *
 * ترتیب عمدی است: اگر اول ردیف هدف به‌روزرسانی شود و بعد مجموعه قفل شود، دو تراکنشی که هرکدام
 * مدیر دیگری را غیرفعال می‌کنند، هرکدام یک ردیف در دست دارند و منتظر دیگری می‌مانند — بن‌بست
 * کلاسیک. با گرفتن کل مجموعه در ابتدا و به ترتیب شناسه، تراکنش دوم به‌سادگی منتظر می‌ماند و پس از
 * commit اولی وضعیت تازه را می‌بیند.
 */
async function lockActiveAdmins(tx: Prisma.TransactionClient): Promise<void> {
  await activeAdminIds(tx, true);
}

/** به‌روزرسانی مشروط به نسخه — بررسی در WHERE، نه در یک SELECT جداگانه. */
async function updateGuarded(
  tx: Prisma.TransactionClient,
  id: string,
  expectedVersion: number,
  data: Prisma.UserUpdateManyMutationInput,
  options: { allowDeleted?: boolean } = {},
): Promise<void> {
  const result = await tx.user.updateMany({
    where: { id, version: expectedVersion, ...(options.allowDeleted ? {} : { deletedAt: null }) },
    data: { ...data, version: { increment: 1 } },
  });
  if (result.count === 0) {
    throw new DomainError(
      "USER_VERSION_CONFLICT",
      "این کاربر توسط کاربر دیگری تغییر کرده است. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.",
    );
  }
}

async function revokeSessions(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function loadOrThrow(id: string, options: { allowDeleted?: boolean } = {}): Promise<UserWithRoles> {
  const user = await prisma.user.findFirst({
    where: { id, ...(options.allowDeleted ? {} : { deletedAt: null }) },
    include: USER_INCLUDE,
  });
  if (!user) throw new DomainError("USER_NOT_FOUND", "کاربر یافت نشد.");
  return user;
}

async function reload(id: string): Promise<UserWithRoles> {
  return prisma.user.findFirstOrThrow({ where: { id }, include: USER_INCLUDE });
}

async function roleIdsFor(tx: Prisma.TransactionClient, codes: RoleCode[]): Promise<string[]> {
  const roles = await tx.role.findMany({ where: { code: { in: codes } } });
  if (roles.length !== codes.length) {
    throw new DomainError("USER_ROLES_REQUIRED", "یکی از نقش‌های انتخاب‌شده معتبر نیست.");
  }
  return roles.map((role) => role.id);
}

// ---------------------------------------------------------------------------
// خواندن
// ---------------------------------------------------------------------------

export interface ListUsersFilters {
  q?: string;
  role?: RoleCode;
  status?: UserStatus;
  includeDeleted?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PagedUsers {
  items: UserDTO[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listUsers(filters: ListUsersFilters): Promise<PagedUsers> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));

  const where: Prisma.UserWhereInput = {
    ...(filters.includeDeleted ? {} : { deletedAt: null }),
    ...(filters.q
      ? {
          OR: [
            { username: { contains: filters.q, mode: "insensitive" } },
            { displayName: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filters.role ? { roles: { some: { role: { code: filters.role } } } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: USER_INCLUDE,
      orderBy: { username: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  let items = rows.map(toDTO);
  // فیلتر وضعیت پس از مشتق‌شدن اعمال می‌شود چون وضعیت ستون DB نیست.
  if (filters.status) items = items.filter((item) => item.status === filters.status);

  return { items, total, page, pageSize };
}

export async function getUserById(id: string): Promise<UserDTO | null> {
  const user = await prisma.user.findFirst({ where: { id }, include: USER_INCLUDE });
  return user ? toDTO(user) : null;
}

// ---------------------------------------------------------------------------
// ایجاد و ویرایش
// ---------------------------------------------------------------------------

export interface CreateUserInput {
  username: string;
  displayName?: string | null;
  password: string;
  roles: RoleCode[];
}

export async function createUser(input: CreateUserInput, actor: ActorContext): Promise<UserDTO> {
  const username = validateUsername(input.username);
  const displayName = validateDisplayName(input.displayName);
  validatePassword(input.password, username);
  assertRolesNotEmpty(input.roles);

  // یکتایی بدون حساسیت به بزرگی حروف، شامل کاربران حذف‌شده (BR-U06):
  // آزاد کردن نام کاربری یک کاربر حذف‌شده، تاریخچه ممیزی را بی‌صدا به فرد دیگری نسبت می‌داد.
  const clash = await prisma.user.findFirst({
    where: { username: { equals: normalizeUsername(username), mode: "insensitive" } },
  });
  if (clash) {
    throw new DomainError("USER_USERNAME_TAKEN", "این نام کاربری قبلاً استفاده شده است.", {
      username: "این نام کاربری در دسترس نیست.",
    });
  }

  const passwordHash = await hashPassword(input.password);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { username, displayName, passwordHash, mustChangePassword: true, isActive: true },
    });
    const roleIds = await roleIdsFor(tx, input.roles);
    await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: user.id, roleId })) });
    return user.id;
  });

  const user = await reload(created);
  await logAudit({
    actorUserId: actor.userId,
    action: "user.created",
    entityType: "User",
    entityId: user.id,
    afterJson: auditSafe(user),
  });
  return toDTO(user);
}

export async function updateUser(
  id: string,
  input: { version: number; displayName?: string | null },
  actor: ActorContext,
): Promise<UserDTO> {
  const before = await loadOrThrow(id);
  const displayName = validateDisplayName(input.displayName);

  await prisma.$transaction(async (tx) => {
    await updateGuarded(tx, id, input.version, { displayName });
  });

  const after = await reload(id);
  await logAudit({
    actorUserId: actor.userId,
    action: "user.updated",
    entityType: "User",
    entityId: id,
    beforeJson: auditSafe(before),
    afterJson: auditSafe(after),
  });
  return toDTO(after);
}

// ---------------------------------------------------------------------------
// گذارهای وضعیت
// ---------------------------------------------------------------------------

type Transition = "activate" | "deactivate" | "suspend" | "unsuspend" | "delete" | "restore";

const AUDIT_ACTION: Record<Transition, string> = {
  activate: "user.activated",
  deactivate: "user.deactivated",
  suspend: "user.suspended",
  unsuspend: "user.unsuspended",
  delete: "user.deleted",
  restore: "user.restored",
};

/** گذارهایی که می‌توانند آخرین مدیر را از دسترس خارج کنند و باید نگهبانی شوند. */
const GUARDED: ReadonlySet<Transition> = new Set(["deactivate", "suspend", "delete"]);

export async function transitionUser(
  id: string,
  transition: Transition,
  input: { version: number; reason?: string },
  actor: ActorContext,
): Promise<UserDTO> {
  const allowDeleted = transition === "restore";
  const before = await loadOrThrow(id, { allowDeleted });

  let data: Prisma.UserUpdateManyMutationInput;
  switch (transition) {
    case "activate":
      data = { isActive: true };
      break;
    case "deactivate":
      data = { isActive: false };
      break;
    case "suspend":
      data = {
        suspendedAt: new Date(),
        suspensionReason: validateReason(input.reason ?? "", "suspensionReason"),
      };
      break;
    case "unsuspend":
      data = { suspendedAt: null, suspensionReason: null };
      break;
    case "delete":
      data = { deletedAt: new Date() };
      break;
    case "restore":
      // بازگردانی به INACTIVE، نه ACTIVE — فعال‌کردن دوباره ورود باید یک اقدام آگاهانه دوم باشد.
      data = { deletedAt: null, isActive: false };
      break;
  }

  await prisma.$transaction(async (tx) => {
    if (GUARDED.has(transition)) await lockActiveAdmins(tx);

    await updateGuarded(tx, id, input.version, data, { allowDeleted });

    if (transition === "deactivate" || transition === "suspend" || transition === "delete") {
      await revokeSessions(tx, id);
    }
    // ارزیابی *پس از* اعمال تغییر انجام می‌شود تا شمارش، وضعیت نهایی را ببیند نه وضعیت قبلی.
    if (GUARDED.has(transition)) {
      await assertActiveAdminRemains(tx);
    }
  });

  const after = await reload(id);
  await logAudit({
    actorUserId: actor.userId,
    action: AUDIT_ACTION[transition],
    entityType: "User",
    entityId: id,
    beforeJson: auditSafe(before),
    afterJson: auditSafe(after),
  });
  return toDTO(after);
}

// ---------------------------------------------------------------------------
// نقش‌ها و رمز عبور
// ---------------------------------------------------------------------------

/** جایگزینی کل مجموعه نقش‌ها (PUT) تا دو ویرایش هم‌زمان در مجموعه‌ای ناخواسته درهم نیامیزند. */
export async function replaceUserRoles(
  id: string,
  input: { version: number; roles: RoleCode[] },
  actor: ActorContext,
): Promise<UserDTO> {
  const before = await loadOrThrow(id);
  assertRolesNotEmpty(input.roles);

  await prisma.$transaction(async (tx) => {
    await lockActiveAdmins(tx);
    await updateGuarded(tx, id, input.version, {});
    await tx.userRole.deleteMany({ where: { userId: id } });
    const roleIds = await roleIdsFor(tx, input.roles);
    await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) });
    await assertActiveAdminRemains(tx);
  });

  const after = await reload(id);
  await logAudit({
    actorUserId: actor.userId,
    action: "user.roles_changed",
    entityType: "User",
    entityId: id,
    beforeJson: { roles: before.roles.map((link) => link.role.code) },
    afterJson: { roles: after.roles.map((link) => link.role.code) },
  });
  return toDTO(after);
}

/**
 * بازنشانی رمز توسط مدیر. رمز جدید فقط یک‌بار به فراخوان بازگردانده *نمی‌شود* — فرستنده خودش
 * آن را دارد؛ هیچ ماده رمزی در پاسخ، لاگ یا audit ثبت نمی‌شود (BR-P06/P07).
 */
export async function resetUserPassword(
  id: string,
  input: { version: number; newPassword: string },
  actor: ActorContext,
): Promise<UserDTO> {
  const before = await loadOrThrow(id);
  validatePassword(input.newPassword, before.username);
  const passwordHash = await hashPassword(input.newPassword);

  await prisma.$transaction(async (tx) => {
    await updateGuarded(tx, id, input.version, { passwordHash, mustChangePassword: true });
    await revokeSessions(tx, id);
  });

  await logAudit({
    actorUserId: actor.userId,
    action: "user.password_reset",
    entityType: "User",
    entityId: id,
    // عمداً بدون هیچ فیلد رمزی — فقط این واقعیت که بازنشانی رخ داده است.
    afterJson: { username: before.username, mustChangePassword: true },
  });
  return toDTO(await reload(id));
}
