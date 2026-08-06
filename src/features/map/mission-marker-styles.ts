import type { MissionDisplayStatusValue } from "@/features/missions/types";

/**
 * رنگ marker خودرو بر اساس وضعیت نمایشی مأموریت (Phase 10). این مأموریت‌ها فقط از میان مأموریت‌های
 * SCHEDULED می‌آیند (map-scene-service.ts)، پس عملاً همیشه WAITING/IN_PROGRESS/ARRIVED هستند؛ مقادیر
 * DRAFT/CANCELLED/ARCHIVED فقط برای کامل بودن نوع اضافه شده‌اند.
 */
export const vehicleStatusColor: Record<MissionDisplayStatusValue, string> = {
  DRAFT: "#94a3b8",
  WAITING: "#f59e0b",
  IN_PROGRESS: "#2f6fed",
  ARRIVED: "#16a34a",
  CANCELLED: "#ef4444",
  ARCHIVED: "#94a3b8",
};
