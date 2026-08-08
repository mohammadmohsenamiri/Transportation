import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { transitionUser } from "@/server/services/user-service";
import { userSuspendSchema, userVersionSchema } from "@/lib/validation/admin";
import { adminErrorResponse, guardAdminWrite, validationErrorResponse } from "@/lib/http/admin-errors";
import { DomainError } from "@/lib/errors/domain-error";

/**
 * Phase 14 — بدنه مشترک routeهای گذار وضعیت کاربر.
 *
 * پنج route (فعال‌سازی، غیرفعال‌سازی، تعلیق، رفع تعلیق، بازگردانی) شکل یکسانی دارند؛ نگه‌داشتن
 * آن در یک جا مانع از این می‌شود که یکی از آن‌ها به‌مرور گیت نقش یا اعتبارسنجی نسخه را از دست بدهد.
 * مسیرها عمداً صریح و ایستا می‌مانند (نه یک segment پویا) تا فهرست عملیات مجاز از روی ساختار
 * فایل‌ها خوانده شود، نه از یک allowlist درون کد.
 */
export type UserTransition = "activate" | "deactivate" | "suspend" | "unsuspend" | "restore";

export function createUserTransitionHandler(transition: UserTransition) {
  return async function handler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ): Promise<NextResponse> {
    const result = await requireActor([RoleCode.ADMIN]);
    if ("response" in result) return result.response;

    const limited = guardAdminWrite(result.actor);
    if (limited) return limited;

    const { id } = await params;
    const body = await request.json().catch(() => null);

    // فقط تعلیق دلیل می‌گیرد؛ بقیه گذارها فقط توکن نسخه — پس هر شاخه جدا parse می‌شود تا
    // schemaی ضعیف‌تری که `reason` را اختیاری کند، اجبار آن را در تعلیق از دست ندهد.
    if (transition === "suspend") {
      const parsed = userSuspendSchema.safeParse(body);
      if (!parsed.success) return validationErrorResponse(parsed.error);
      return runTransition(id, transition, parsed.data.version, parsed.data.reason, result.actor);
    }

    const parsed = userVersionSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);
    return runTransition(id, transition, parsed.data.version, undefined, result.actor);
  };
}

async function runTransition(
  id: string,
  transition: UserTransition,
  version: number,
  reason: string | undefined,
  actor: Parameters<typeof transitionUser>[3],
): Promise<NextResponse> {
  try {
    return NextResponse.json(await transitionUser(id, transition, { version, reason }, actor));
  } catch (error) {
    if (error instanceof DomainError) return adminErrorResponse(error);
    throw error;
  }
}
