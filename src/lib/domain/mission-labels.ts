import type {
  MissionDisplayStatus,
  MissionFailureClassificationValue,
  MissionPersistedStatus,
} from "@/lib/domain/mission-rules";

/**
 * برچسب فارسی وضعیت نمایشی مأموریت — واژگان ثابت `UX_MAP_AND_DESIGN_SYSTEM.md` §۱۱.
 *
 * از فاز ۱۳ در لایه domain نگهداری می‌شود، نه در `features/`: سرویس آمار سمت سرور
 * (`dashboard-service.ts`) هم برای برچسب‌گذاری قطاع‌های نمودار به آن نیاز دارد و نباید برای یک
 * ثابت متنی به لایه UI وابسته شود. `src/features/missions/status-labels.ts` همین را re-export
 * می‌کند تا مصرف‌کننده‌های UI بدون تغییر باقی بمانند.
 */
export const missionDisplayStatusLabel: Record<MissionDisplayStatus, string> = {
  DRAFT: "پیش‌نویس",
  WAITING: "در انتظار حرکت",
  IN_PROGRESS: "در حال حرکت",
  /**
   * فاز ۱۵ قید «(تخمینی)» را افزود — تغییر عمدی در متنِ شیپ‌شده.
   * `ARRIVED` یعنی «ساعت می‌گوید باید رسیده باشد»، در حالی که `COMPLETED` یعنی «اپراتور تأیید
   * کرده که رسیده است». بدون این قید، کاربر نمی‌توانست باور را از واقعیت تشخیص دهد — و تشخیص
   * همین تفاوت، کل دلیل وجود فاز ۱۵ است (ADR-P15-04).
   */
  ARRIVED: "رسیده (تخمینی)",
  COMPLETED: "تکمیل‌شده",
  FAILED: "ناموفق",
  CANCELLED: "لغوشده",
  ARCHIVED: "بایگانی‌شده",
};

/** برچسب فارسی وضعیت *ثبت‌شده* — برای پیام خطای گذار نامعتبر و صفحه‌های مدیریتی. */
export const missionPersistedStatusLabel: Record<MissionPersistedStatus, string> = {
  DRAFT: "پیش‌نویس",
  SCHEDULED: "برنامه‌ریزی‌شده",
  COMPLETED: "تکمیل‌شده",
  FAILED: "ناموفق",
  CANCELLED: "لغوشده",
  ARCHIVED: "بایگانی‌شده",
};

/** برچسب فارسی طبقه‌بندی علت شکست. */
export const missionFailureClassificationLabel: Record<MissionFailureClassificationValue, string> = {
  VEHICLE_BREAKDOWN: "خرابی خودرو",
  ACCIDENT: "تصادف",
  CARGO_ISSUE: "مشکل بار",
  ROUTE_BLOCKED: "انسداد مسیر",
  WEATHER: "شرایط جوی",
  DRIVER_UNAVAILABLE: "در دسترس نبودن راننده",
  OTHER: "سایر",
};
