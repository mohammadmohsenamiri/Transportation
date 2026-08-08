import type { MissionDisplayStatusValue } from "@/features/missions/types";

/**
 * رنگ marker خودرو بر اساس وضعیت نمایشی مأموریت (Phase 10). این مأموریت‌ها فقط از میان مأموریت‌های
 * SCHEDULED می‌آیند (map-scene-service.ts)، پس عملاً همیشه WAITING/IN_PROGRESS/ARRIVED هستند؛ بقیه
 * مقادیر برای کامل بودن نوع‌اند — و از فاز ۱۵ برای پیمایش تاریخی خط زمان هم لازم‌اند، چون آنجا
 * مأموریت تکمیل‌شده یا ناموفق در موقعیت منجمدش رسم می‌شود.
 */
export const vehicleStatusColor: Record<MissionDisplayStatusValue, string> = {
  DRAFT: "#94a3b8",
  WAITING: "#f59e0b",
  IN_PROGRESS: "#2f6fed",
  ARRIVED: "#16a34a",
  COMPLETED: "#15803d",
  FAILED: "#b91c1c",
  CANCELLED: "#ef4444",
  ARCHIVED: "#94a3b8",
};
