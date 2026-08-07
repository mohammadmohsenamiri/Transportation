import type { MissionDisplayStatusValue } from "@/features/missions/types";
import type { StatTone } from "@/components/ui/stat-card";

// از فاز ۱۳ منبع اصلی برچسب‌ها به لایه domain منتقل شد تا سرویس آمار سمت سرور بتواند بدون
// وابستگی به لایه UI از آن استفاده کند؛ این re-export مصرف‌کننده‌های موجود را دست‌نخورده نگه می‌دارد.
export { missionDisplayStatusLabel } from "@/lib/domain/mission-labels";

export const missionDisplayStatusTone: Record<MissionDisplayStatusValue, StatTone> = {
  DRAFT: "info",
  WAITING: "warning",
  IN_PROGRESS: "primary",
  ARRIVED: "success",
  CANCELLED: "danger",
  ARCHIVED: "info",
};
