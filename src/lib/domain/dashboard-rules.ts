import { deriveMissionDisplayStatus, type MissionStatusInput } from "@/lib/domain/mission-rules";
import { tehranCalendarDayRange } from "@/lib/dates/jalali";

/**
 * Phase 13 — لایه محض تجمیع آمار «فرانمای وضعیت».
 *
 * این فایل هیچ منطق کسب‌وکار جدیدی تعریف نمی‌کند: وضعیت نمایشی هر مأموریت همچنان منحصراً از
 * `deriveMissionDisplayStatus` فاز ۷/۹ گرفته می‌شود (همان تابعی که موتور شبیه‌سازی فاز ۹ و صحنه
 * نقشه فاز ۱۰ استفاده می‌کنند). کار این فایل فقط «شمردن» و «درصد گرفتن» است تا داشبورد هرگز
 * تعریف دوم و واگرایی از وضعیت نقشه نداشته باشد (CLAUDE.md §۲: business logic تکرار نشود).
 *
 * توابع pure و deterministic هستند تا بدون DB/React آزمون واحد شوند.
 */

// ---------------------------------------------------------------------------
// شمارنده وضعیت مأموریت
// ---------------------------------------------------------------------------

/**
 * شمارنده مأموریت بر اساس وضعیت *نمایشی محاسبه‌شده* (نه `persistedStatus` خام DB).
 *
 * تفاوت حیاتی: یک مأموریت `SCHEDULED` در DB، بسته به لحظه مشاهده، می‌تواند «در انتظار حرکت»
 * (`waiting`)، «در حال حرکت» (`inProgress`) یا «رسیده» (`arrived`) باشد — بدون هیچ نوشتنی در DB.
 * بنابراین شمارش با `prisma.count({ persistedStatus })` هرگز نمی‌تواند به «مأموریت‌های در حال
 * حرکت» پاسخ دهد؛ باید همان تابع محض دامنه روی هر رکورد اجرا شود.
 */
export interface MissionStatusCounters {
  total: number;
  draft: number;
  waiting: number;
  inProgress: number;
  arrived: number;
  cancelled: number;
  archived: number;
}

export const EMPTY_MISSION_STATUS_COUNTERS: MissionStatusCounters = {
  total: 0,
  draft: 0,
  waiting: 0,
  inProgress: 0,
  arrived: 0,
  cancelled: 0,
  archived: 0,
};

export function countMissionsByDisplayStatus(
  missions: readonly MissionStatusInput[],
  viewTime: Date,
): MissionStatusCounters {
  const counters: MissionStatusCounters = { ...EMPTY_MISSION_STATUS_COUNTERS };

  for (const mission of missions) {
    counters.total += 1;
    switch (deriveMissionDisplayStatus(mission, viewTime)) {
      case "DRAFT":
        counters.draft += 1;
        break;
      case "WAITING":
        counters.waiting += 1;
        break;
      case "IN_PROGRESS":
        counters.inProgress += 1;
        break;
      case "ARRIVED":
        counters.arrived += 1;
        break;
      case "CANCELLED":
        counters.cancelled += 1;
        break;
      case "ARCHIVED":
        counters.archived += 1;
        break;
    }
  }

  return counters;
}

/**
 * مأموریت‌های منتشرشده‌ای که در بازه [from, to) شروع می‌شوند — طبق `PROJECT_SPEC.md` §۱۱
 * («مأموریت‌های شروع‌شونده در ۲۴ ساعت آینده»). فقط `SCHEDULED` شمرده می‌شود چون پیش‌نویس هنوز
 * تعهد عملیاتی نیست و مأموریت لغوشده/بایگانی‌شده اصلاً شروع نخواهد شد.
 */
export function countMissionsStartingWithin(
  missions: readonly MissionStatusInput[],
  from: Date,
  to: Date,
): number {
  let count = 0;
  for (const mission of missions) {
    if (mission.persistedStatus !== "SCHEDULED") continue;
    const startAt = mission.startAt.getTime();
    if (startAt >= from.getTime() && startAt < to.getTime()) count += 1;
  }
  return count;
}

// ---------------------------------------------------------------------------
// توزیع (نمودارها)
// ---------------------------------------------------------------------------

export interface DistributionInput {
  key: string;
  label: string;
  value: number;
}

export interface DistributionSlice extends DistributionInput {
  /** درصد از کل، گرد‌شده به یک رقم اعشار. جمع درصدها ممکن است به‌دلیل گردکردن دقیقاً ۱۰۰ نشود. */
  percentage: number;
}

/**
 * مرتب‌سازی نزولی بر اساس مقدار با tie-break صریح روی برچسب — طبق همان قاعده فاز ۱۱
 * (ADR-P11-02): دو فراخوانی با ورودی یکسان هرگز نباید ترتیب متفاوتی بدهند.
 */
export function toDistribution(entries: readonly DistributionInput[]): DistributionSlice[] {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  return [...entries]
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "fa-IR"))
    .map((entry) => ({
      ...entry,
      percentage: total === 0 ? 0 : Math.round((entry.value / total) * 1000) / 10,
    }));
}

export interface DonutSegment extends DistributionSlice {
  /** مقدار `stroke-dasharray` برای یک دایره SVG با محیط `circumference`. */
  dashArray: string;
  /** مقدار `stroke-dashoffset` (منفی، انباشته) تا قطاع‌ها پشت‌سرهم بدون فاصله رسم شوند. */
  dashOffset: number;
}

/**
 * تبدیل توزیع به قطاع‌های یک نمودار دونات SVG.
 *
 * طول کمان از نسبت خام `value/total` محاسبه می‌شود، نه از `percentage` گردشده — در غیر این صورت
 * خطای گردکردن انباشته می‌شد و آخرین قطاع شکاف قابل‌مشاهده پیدا می‌کرد.
 */
export function toDonutSegments(slices: readonly DistributionSlice[], circumference: number): DonutSegment[] {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  let cumulative = 0;

  return slices.map((slice) => {
    const length = total === 0 ? 0 : (slice.value / total) * circumference;
    const segment: DonutSegment = {
      ...slice,
      dashArray: `${length} ${circumference - length}`,
      dashOffset: -cumulative,
    };
    cumulative += length;
    return segment;
  });
}

// ---------------------------------------------------------------------------
// بازه زمانی
// ---------------------------------------------------------------------------

export type DashboardRangePreset = "ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS";

export const DASHBOARD_RANGE_PRESETS = ["ALL", "TODAY", "LAST_7_DAYS", "LAST_30_DAYS"] as const;

export const DEFAULT_DASHBOARD_RANGE: DashboardRangePreset = "ALL";

/** بازه نیمه‌باز؛ `null` یعنی بدون کران در آن سمت. */
export interface OpenUtcRange {
  from: Date | null;
  to: Date | null;
}

/**
 * بازه هر preset را نسبت به لحظه `now` می‌دهد.
 *
 * `TODAY` روز *تقویمی* شمسی تهران است (همان `tehranCalendarDayRange` مشترک با فاز ۱۱/۱۲)، ولی
 * `LAST_7_DAYS`/`LAST_30_DAYS` پنجره غلتان نسبت به اکنون هستند — دقیقاً همان تفکیکی که فاز ۱۱
 * بین `TODAY` و `NEXT_*` قائل شد، تا از پیچیدگی «شروع هفته شمسی» پرهیز شود.
 */
export function resolveDashboardRange(preset: DashboardRangePreset, now: Date): OpenUtcRange {
  switch (preset) {
    case "ALL":
      return { from: null, to: null };
    case "TODAY": {
      const day = tehranCalendarDayRange(now);
      return { from: day.from, to: day.to };
    }
    case "LAST_7_DAYS":
      return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: null };
    case "LAST_30_DAYS":
      return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: null };
  }
}

export function isWithinOpenRange(value: Date, range: OpenUtcRange): boolean {
  if (range.from && value.getTime() < range.from.getTime()) return false;
  if (range.to && value.getTime() >= range.to.getTime()) return false;
  return true;
}
