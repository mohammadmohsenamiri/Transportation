import { tehranCalendarDayRange, type UtcRange } from "@/lib/dates/jalali";

/**
 * Phase 12 — لایه محض «موتور زمان‌بندی»: فقط حساب‌کتاب مربوط به بازه نمایش، پیشرفت روی نوار زمان
 * و سرعت پخش را انجام می‌دهد. هیچ موقعیت/فاصله/وضعیت مأموریتی اینجا محاسبه نمی‌شود — آن مسئولیت
 * همچنان منحصراً بر عهده موتور شبیه‌سازی فاز ۹ (src/lib/domain/mission-simulation.ts) است؛ این
 * فایل صرفاً تعیین می‌کند «الان کدام viewTime روی نوار زمان انتخاب شده»، نه «در آن viewTime چه اتفاقی می‌افتد».
 */

export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4 | 8;

export const PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = [0.25, 0.5, 1, 2, 4, 8];

export type TimeRange = UtcRange;

/** بازه نمایش پیش‌فرض نوار زمان: یک روز تقویمی تهران که `instant` در آن قرار دارد (طبق docs/PROJECT_SPEC.md §10). */
export function defaultTimeRange(instant: Date): TimeRange {
  return tehranCalendarDayRange(instant);
}

/** `time` را به داخل بازه [from, to] محدود می‌کند. */
export function clampToRange(time: Date, range: TimeRange): Date {
  if (time.getTime() < range.from.getTime()) return range.from;
  if (time.getTime() > range.to.getTime()) return range.to;
  return time;
}

/** آیا `time` (پس از کلمپ نکردن) واقعاً درون بازه [from, to] است — برای تشخیص رسیدن پخش به انتهای بازه. */
export function isWithinRange(time: Date, range: TimeRange): boolean {
  return time.getTime() >= range.from.getTime() && time.getTime() <= range.to.getTime();
}

/**
 * پیشروی زمان انتخاب‌شده در طول پخش: هر تیک واقعی به‌اندازه `elapsedRealMs * speed` میلی‌ثانیه
 * زمان شبیه‌سازی را جلو می‌برد. نتیجه کلمپ‌نشده برمی‌گردد — تصمیم توقف/کلمپ در سطح hook گرفته می‌شود.
 */
export function advanceBySpeed(current: Date, elapsedRealMs: number, speed: PlaybackSpeed): Date {
  return new Date(current.getTime() + elapsedRealMs * speed);
}

/** موقعیت `time` روی نوار به‌صورت درصد [0,100] نسبت به بازه؛ بازه صفر‌طول همیشه ۰ برمی‌گرداند. */
export function percentForTime(time: Date, range: TimeRange): number {
  const total = range.to.getTime() - range.from.getTime();
  if (total <= 0) return 0;
  const clamped = clampToRange(time, range);
  return ((clamped.getTime() - range.from.getTime()) / total) * 100;
}

/** معکوس percentForTime — درصد [0,100] روی نوار را به یک لحظه درون بازه تبدیل می‌کند. */
export function timeForPercent(percent: number, range: TimeRange): Date {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const total = range.to.getTime() - range.from.getTime();
  return new Date(range.from.getTime() + (clampedPercent / 100) * total);
}

/** جابه‌جایی گام‌محور (دکمه‌های ±۵/±۱۵ دقیقه) با کلمپ به بازه. */
export function stepMinutes(time: Date, minutes: number, range: TimeRange): Date {
  return clampToRange(new Date(time.getTime() + minutes * 60 * 1000), range);
}
