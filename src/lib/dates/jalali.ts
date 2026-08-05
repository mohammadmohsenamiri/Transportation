import { toGregorian, toJalaali, isValidJalaaliDate, jalaaliMonthLength } from "jalaali-js";

/**
 * منطقه زمانی پیش‌فرض سامانه طبق CLAUDE.md: Asia/Tehran (UTC+۳:۳۰، بدون DST از سال ۱۴۰۱).
 * تنظیم قابل‌ویرایش از UI در Phase 14 اضافه می‌شود؛ فعلاً مقدار ثابت است.
 */
const TEHRAN_OFFSET_MINUTES = 3 * 60 + 30;

export interface JalaliDateTime {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  hour: number; // 0..23
  minute: number; // 0..59
}

/** تبدیل تاریخ/ساعت شمسی (به‌وقت تهران) به رشته ISO-8601 UTC برای ذخیره در DB. */
export function jalaliToUtcIso(input: JalaliDateTime): string {
  const { gy, gm, gd } = toGregorian(input.year, input.month, input.day);
  const utcMs = Date.UTC(gy, gm - 1, gd, input.hour, input.minute, 0, 0) - TEHRAN_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs).toISOString();
}

/** تبدیل یک لحظه UTC (رشته ISO یا Date) به تاریخ/ساعت شمسی به‌وقت تهران. */
export function utcIsoToJalali(isoOrDate: string | Date): JalaliDateTime {
  const utcDate = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const tehranMs = utcDate.getTime() + TEHRAN_OFFSET_MINUTES * 60 * 1000;
  const tehranDate = new Date(tehranMs);
  const { jy, jm, jd } = toJalaali(tehranDate.getUTCFullYear(), tehranDate.getUTCMonth() + 1, tehranDate.getUTCDate());
  return { year: jy, month: jm, day: jd, hour: tehranDate.getUTCHours(), minute: tehranDate.getUTCMinutes() };
}

export function isValidJalaliDateTime(input: JalaliDateTime): boolean {
  if (!isValidJalaaliDate(input.year, input.month, input.day)) return false;
  if (input.hour < 0 || input.hour > 23) return false;
  if (input.minute < 0 || input.minute > 59) return false;
  return true;
}

export const jalaliMonthNames = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

export { jalaaliMonthLength };
