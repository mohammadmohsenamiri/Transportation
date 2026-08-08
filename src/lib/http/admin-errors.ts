import { NextResponse } from "next/server";
import { DomainError } from "@/lib/errors/domain-error";
import { domainErrorResponse, errorResponse } from "@/lib/http/api-auth";
import { flattenIssues } from "@/lib/validation/utils";
import { consumeQuota } from "@/lib/security/rate-limit";
import type { ActorContext } from "@/server/services/permission-service";
import type { ZodError } from "zod";

/**
 * Phase 14 — نگاشت واحد کد خطای دامنه به وضعیت HTTP.
 *
 * در یک جا نگه داشته می‌شود چون ۱۹ route مدیریتی از آن استفاده می‌کنند؛ تکرار جدول در هر فایل،
 * دیر یا زود به ناسازگاری می‌انجامید (مثلاً یک route تعارض نسخه را ۴۲۲ برگرداند و دیگری ۴۰۹).
 */
const STATUS_BY_CODE: Record<string, number> = {
  USER_NOT_FOUND: 404,
  ICON_NOT_FOUND: 404,
  ASSIGNMENT_TARGET_NOT_FOUND: 404,

  USER_USERNAME_TAKEN: 409,
  ICON_NAME_TAKEN: 409,
  LAST_ADMIN_PROTECTED: 409,
  USER_VERSION_CONFLICT: 409,
  ICON_VERSION_CONFLICT: 409,
  SETTING_VERSION_CONFLICT: 409,
  SETTING_ENV_LOCKED: 409,
};

/** هر کد ثبت‌نشده‌ای یک خطای اعتبارسنجی است ⇒ ۴۲۲. */
export function adminErrorResponse(error: DomainError): NextResponse {
  return domainErrorResponse(error, STATUS_BY_CODE[error.code] ?? 422);
}

export function validationErrorResponse(error: ZodError): NextResponse {
  return NextResponse.json(
    { error: { code: "VALIDATION_ERROR", message: "ورودی نامعتبر است.", fieldErrors: flattenIssues(error) } },
    { status: 422 },
  );
}

/** حداکثر نوشتن مدیریتی در هر پنجره، به‌ازای هر actor. سخاوتمند است تا کار عادی را مختل نکند. */
const ADMIN_WRITE_MAX = 120;
const ADMIN_WRITE_WINDOW_MS = 60 * 1000;

/**
 * سهمیه نوشتن برای عملیات مدیریتی (SEC-16). کلید بر پایه شناسه actor است نه IP، چون هدف
 * محدودکردن یک حساب مدیریتیِ ربوده‌شده است، نه یک شبکه مشترک.
 *
 * پیش از خواندن بدنه و پیش از هر نوشتن صدا زده می‌شود؛ در صورت اتمام سهمیه، پاسخ 429 برمی‌گردد.
 */
export function guardAdminWrite(actor: ActorContext): NextResponse | null {
  if (consumeQuota(`admin-write:${actor.userId}`, ADMIN_WRITE_MAX, ADMIN_WRITE_WINDOW_MS)) return null;
  return errorResponse(
    "ADMIN_RATE_LIMITED",
    "تعداد عملیات مدیریتی در بازه کوتاه بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.",
    429,
  );
}

/** پوشش یکسان برای بدنه هر route مدیریتی. */
export async function handleAdminRoute<T>(run: () => Promise<T>): Promise<NextResponse> {
  try {
    const result = await run();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DomainError) return adminErrorResponse(error);
    throw error;
  }
}
