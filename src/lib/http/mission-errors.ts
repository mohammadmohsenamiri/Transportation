import { NextResponse } from "next/server";
import { DomainError } from "@/lib/errors/domain-error";
import { domainErrorResponse } from "@/lib/http/api-auth";
import { flattenIssues } from "@/lib/validation/utils";
import type { ZodError } from "zod";

/**
 * Phase 15 — نگاشت واحد کد خطای چرخه عمر مأموریت به وضعیت HTTP.
 *
 * در یک جا نگه داشته می‌شود چون ده route از آن استفاده می‌کنند؛ تکرار جدول در هر فایل دیر یا زود
 * به ناسازگاری می‌انجامید — مثلاً یک route تعارض نسخه را ۴۲۲ برگرداند و دیگری ۴۰۹، در حالی که
 * رابط کاربری برای نمایش «صفحه را تازه‌سازی کنید» دقیقاً به ۴۰۹ تکیه می‌کند.
 */
const STATUS_BY_CODE: Record<string, number> = {
  MISSION_NOT_FOUND: 404,
  MISSION_TYPE_NOT_FOUND: 404,
  MISSION_NOTE_NOT_FOUND: 404,

  MISSION_INVALID_TRANSITION: 409,
  MISSION_VERSION_CONFLICT: 409,
  MISSION_NOT_CANCELLABLE: 409,
  MISSION_ALREADY_STARTED: 409,
  MISSION_NOT_EDITABLE: 409,
  SHIPMENT_ALREADY_ASSIGNED: 409,
  MISSION_TYPE_IN_USE: 409,
  MISSION_TYPE_NAME_TAKEN: 409,
};

/** هر کد ثبت‌نشده‌ای یک نقض گارد یا اعتبارسنجی است ⇒ ۴۲۲. */
export function missionLifecycleErrorResponse(error: DomainError): NextResponse {
  return domainErrorResponse(error, STATUS_BY_CODE[error.code] ?? 422);
}

export function missionValidationErrorResponse(error: ZodError): NextResponse {
  return NextResponse.json(
    { error: { code: "VALIDATION_ERROR", message: "ورودی نامعتبر است.", fieldErrors: flattenIssues(error) } },
    { status: 422 },
  );
}
