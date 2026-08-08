import { utcIsoToJalali } from "@/lib/dates/jalali";

const pad = (value: number) => String(value).padStart(2, "0");

/** تاریخ شمسی بدون ساعت — برای ستون‌های فشرده جدول. */
export function formatJalaliDate(iso: string): string {
  const jalali = utcIsoToJalali(iso);
  return `${jalali.year}/${pad(jalali.month)}/${pad(jalali.day)}`;
}

/** تاریخ و ساعت شمسی — تبدیل فقط در همین مرز نمایش انجام می‌شود. */
export function formatJalaliDateTime(iso: string): string {
  const jalali = utcIsoToJalali(iso);
  return `${formatJalaliDate(iso)} — ${pad(jalali.hour)}:${pad(jalali.minute)}`;
}

/** حجم فایل با واحد فارسی؛ مقدار عددی LTR می‌ماند. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes.toLocaleString("fa-IR")} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toLocaleString("fa-IR", { maximumFractionDigits: 2 })} مگابایت`;
}
