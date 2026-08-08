import { DomainError } from "@/lib/errors/domain-error";
import { missionPersistedStatusLabel } from "@/lib/domain/mission-labels";
import type { MissionFailureClassificationValue, MissionPersistedStatus } from "@/lib/domain/mission-rules";

/**
 * Phase 15 — قواعد محض چرخه عمر مأموریت.
 *
 * بدون DB، بدون React، بدون Prisma. تنها ورودی‌ها داده ساده‌اند و همه خروجی‌ها قطعی، پس کل این
 * ماژول بدون هیچ mockای آزمون‌پذیر است.
 *
 * جدول گذارها عمداً **داده** است نه زنجیره `if`/`switch` (ADR-P15-10). دلیل عملی: افزودن یک
 * گذار تازه — مثلاً `PENDING_APPROVAL` برای جریان تأیید — باید یک ردیف جدول باشد، نه ویرایش چند
 * تابع پراکنده. همچنین این شکل، «فهرست کامل گذارهای مجاز» را قابل خواندن و قابل آزمون نگه می‌دارد.
 */

export type MissionAction =
  | "publish"
  | "cancel"
  | "complete"
  | "fail"
  | "archive"
  | "unarchive"
  | "reopen"
  | "softDelete";

export interface TransitionSpec {
  action: MissionAction;
  from: readonly MissionPersistedStatus[];
  /**
   * وضعیت مقصد، یا `null` وقتی مقصد محاسبه‌شونده است.
   * تنها `unarchive` مقصد ثابت ندارد: به همان وضعیت پایانی پیش از بایگانی برمی‌گردد (LR-10).
   */
  to: MissionPersistedStatus | null;
}

/** جدول مرجع گذارها — منطبق بر §۲٫۲ سند `02-REQUIREMENTS.md`. */
export const MISSION_TRANSITIONS: readonly TransitionSpec[] = [
  { action: "publish", from: ["DRAFT"], to: "SCHEDULED" },
  { action: "cancel", from: ["DRAFT", "SCHEDULED"], to: "CANCELLED" },
  { action: "complete", from: ["SCHEDULED"], to: "COMPLETED" },
  { action: "fail", from: ["SCHEDULED"], to: "FAILED" },
  { action: "archive", from: ["COMPLETED", "FAILED", "CANCELLED"], to: "ARCHIVED" },
  { action: "unarchive", from: ["ARCHIVED"], to: null },
  { action: "reopen", from: ["COMPLETED", "FAILED"], to: "SCHEDULED" },
  { action: "softDelete", from: ["DRAFT"], to: null },
] as const;

export function canTransition(from: MissionPersistedStatus, action: MissionAction): boolean {
  const spec = MISSION_TRANSITIONS.find((item) => item.action === action);
  return spec ? spec.from.includes(from) : false;
}

/**
 * هر جفت (وضعیت، عملیات) که در جدول نباشد **نامعتبر** است و باید صریحاً رد شود — نه اینکه
 * بی‌صدا نادیده گرفته شود. پیام خطا نام فارسی وضعیت فعلی را می‌برد تا اپراتور بداند چرا رد شد.
 */
export function assertTransitionAllowed(from: MissionPersistedStatus, action: MissionAction): void {
  if (!canTransition(from, action)) {
    throw new DomainError(
      "MISSION_INVALID_TRANSITION",
      `انجام این عملیات روی مأموریتی با وضعیت «${missionPersistedStatusLabel[from]}» ممکن نیست.`,
    );
  }
}

export function resolveTargetStatus(
  action: MissionAction,
  mission: { persistedStatus: MissionPersistedStatus; statusBeforeArchive: MissionPersistedStatus | null },
): MissionPersistedStatus {
  const spec = MISSION_TRANSITIONS.find((item) => item.action === action);
  if (!spec) throw new DomainError("MISSION_INVALID_TRANSITION", "این عملیات تعریف‌شده نیست.");
  if (spec.to) return spec.to;

  if (action === "unarchive") {
    if (!mission.statusBeforeArchive) {
      throw new DomainError("MISSION_INVALID_TRANSITION", "وضعیت پیش از بایگانی ثبت نشده است.");
    }
    return mission.statusBeforeArchive;
  }

  throw new DomainError("MISSION_INVALID_TRANSITION", "هدف این گذار قابل تعیین نیست.");
}

// ---------------------------------------------------------------------------
// گاردها
// ---------------------------------------------------------------------------

export interface CompletionTimesInput {
  actualArrivalAt: Date;
  actualDepartureAt?: Date | null;
}

/**
 * LR-01 … LR-04.
 *
 * ⚠️ عمداً **هیچ** مقایسه‌ای با `estimatedArrivalAt` انجام نمی‌شود: زود یا دیر رسیدن *داده* است،
 * نه خطا (LR-03). رد کردن یک رسیدن دیرهنگام، دقیقاً همان واقعیتی را حذف می‌کرد که این فاز برای
 * ثبتش ساخته شده است.
 */
export function validateCompletionTimes(
  mission: { startAt: Date },
  input: CompletionTimesInput,
  now: Date,
): void {
  if (input.actualArrivalAt.getTime() > now.getTime()) {
    throw new DomainError("MISSION_ARRIVAL_IN_FUTURE", "زمان رسیدن واقعی نمی‌تواند در آینده باشد.", {
      actualArrivalAt: "زمان رسیدن واقعی نمی‌تواند در آینده باشد.",
    });
  }

  if (input.actualArrivalAt.getTime() < mission.startAt.getTime()) {
    throw new DomainError("MISSION_ARRIVAL_BEFORE_START", "زمان رسیدن واقعی نمی‌تواند پیش از زمان شروع باشد.", {
      actualArrivalAt: "زمان رسیدن واقعی نمی‌تواند پیش از زمان شروع باشد.",
    });
  }

  if (input.actualDepartureAt) {
    const departure = input.actualDepartureAt.getTime();
    if (departure < mission.startAt.getTime() || departure > input.actualArrivalAt.getTime()) {
      throw new DomainError(
        "MISSION_DEPARTURE_WINDOW_INVALID",
        "زمان حرکت واقعی باید بین زمان شروع برنامه‌ریزی‌شده و زمان رسیدن واقعی باشد.",
        { actualDepartureAt: "زمان حرکت واقعی باید بین زمان شروع و زمان رسیدن باشد." },
      );
    }
  }
}

export interface FailureInput {
  failedAt: Date;
  failureReason: string;
  failureClassification: MissionFailureClassificationValue;
}

const FAILURE_CLASSIFICATIONS: readonly MissionFailureClassificationValue[] = [
  "VEHICLE_BREAKDOWN",
  "ACCIDENT",
  "CARGO_ISSUE",
  "ROUTE_BLOCKED",
  "WEATHER",
  "DRIVER_UNAVAILABLE",
  "OTHER",
];

/** LR-06 … LR-07. متن دلیل trim‌شده برگردانده می‌شود تا فراخوان همان مقدار نرمال‌شده را ذخیره کند. */
export function validateFailureInput(mission: { startAt: Date }, input: FailureInput, now: Date): string {
  if (input.failedAt.getTime() > now.getTime()) {
    throw new DomainError("MISSION_FAILURE_TIME_IN_FUTURE", "زمان شکست نمی‌تواند در آینده باشد.", {
      failedAt: "زمان شکست نمی‌تواند در آینده باشد.",
    });
  }

  if (input.failedAt.getTime() < mission.startAt.getTime()) {
    throw new DomainError("MISSION_FAILURE_BEFORE_START", "زمان شکست نمی‌تواند پیش از زمان شروع باشد.", {
      failedAt: "زمان شکست نمی‌تواند پیش از زمان شروع باشد.",
    });
  }

  if (!FAILURE_CLASSIFICATIONS.includes(input.failureClassification)) {
    throw new DomainError("MISSION_FAILURE_CLASSIFICATION_INVALID", "طبقه‌بندی علت شکست نامعتبر است.", {
      failureClassification: "یکی از گزینه‌های مجاز را انتخاب کنید.",
    });
  }

  return validateReasonText(input.failureReason, "failureReason", "علت شکست");
}

/** LR-11 — دلیل بازگشایی همان قاعده طولی علت شکست را دارد. */
export function validateReopenReason(raw: string): string {
  return validateReasonText(raw, "reopenReason", "دلیل بازگشایی");
}

function validateReasonText(raw: string, field: string, label: string): string {
  const value = raw.trim();
  if (value.length < 3 || value.length > 500) {
    throw new DomainError("MISSION_REASON_INVALID", `${label} باید بین ۳ تا ۵۰۰ نویسه باشد.`, {
      [field]: `${label} باید بین ۳ تا ۵۰۰ نویسه باشد.`,
    });
  }
  return value;
}

/** V-10 — بدنه یادداشت. */
export function validateNoteBody(raw: string): string {
  const value = raw.trim();
  if (value.length < 1 || value.length > 2000) {
    throw new DomainError("MISSION_NOTE_INVALID", "متن یادداشت باید بین ۱ تا ۲۰۰۰ نویسه باشد.", {
      body: "متن یادداشت باید بین ۱ تا ۲۰۰۰ نویسه باشد.",
    });
  }
  return value;
}

/** CC-01 — قاعده افزایش نسخه در یک جا زندگی می‌کند تا هیچ مسیری آن را متفاوت پیاده نکند. */
export function nextVersion(current: number): number {
  return current + 1;
}

/**
 * اختلاف رسیدن واقعی از تخمین به دقیقه؛ مثبت یعنی دیرکرد.
 * **هرگز ذخیره نمی‌شود** — ذخیره‌کردنش یک منبع حقیقت دوم می‌ساخت که می‌توانست از دو ورودی خودش
 * واگرا شود. روی هر خواندن از همان دو مقدار محاسبه می‌شود.
 */
export function arrivalVarianceMinutes(mission: {
  estimatedArrivalAt: Date;
  actualArrivalAt: Date | null;
}): number | null {
  if (!mission.actualArrivalAt) return null;
  const deltaMs = mission.actualArrivalAt.getTime() - mission.estimatedArrivalAt.getTime();
  return Math.round(deltaMs / 60000);
}
