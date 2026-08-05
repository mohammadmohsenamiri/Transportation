import type { MissionDisplayStatusValue } from "@/features/missions/types";
import type { StatTone } from "@/components/ui/stat-card";

export const missionDisplayStatusLabel: Record<MissionDisplayStatusValue, string> = {
  DRAFT: "پیش‌نویس",
  WAITING: "در انتظار حرکت",
  IN_PROGRESS: "در حال حرکت",
  ARRIVED: "رسیده",
  CANCELLED: "لغوشده",
  ARCHIVED: "بایگانی‌شده",
};

export const missionDisplayStatusTone: Record<MissionDisplayStatusValue, StatTone> = {
  DRAFT: "info",
  WAITING: "warning",
  IN_PROGRESS: "primary",
  ARRIVED: "success",
  CANCELLED: "danger",
  ARCHIVED: "info",
};
