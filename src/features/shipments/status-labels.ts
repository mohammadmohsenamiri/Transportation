import type { ShipmentStatusValue } from "@/features/shipments/types";
import type { StatTone } from "@/components/ui/stat-card";

export const shipmentStatusValues: ShipmentStatusValue[] = [
  "DRAFT",
  "WAITING_FOR_DISPATCH",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
];

export const shipmentStatusLabel: Record<ShipmentStatusValue, string> = {
  DRAFT: "پیش‌نویس",
  WAITING_FOR_DISPATCH: "در انتظار ارسال",
  IN_TRANSIT: "در مسیر",
  DELIVERED: "تحویل‌شده",
  CANCELLED: "لغوشده",
};

export const shipmentStatusTone: Record<ShipmentStatusValue, StatTone> = {
  DRAFT: "info",
  WAITING_FOR_DISPATCH: "warning",
  IN_TRANSIT: "primary",
  DELIVERED: "success",
  CANCELLED: "danger",
};
