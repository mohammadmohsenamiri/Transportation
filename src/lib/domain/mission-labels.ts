import type { MissionDisplayStatus } from "@/lib/domain/mission-rules";

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
  ARRIVED: "رسیده",
  CANCELLED: "لغوشده",
  ARCHIVED: "بایگانی‌شده",
};
