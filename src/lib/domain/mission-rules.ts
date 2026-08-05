export interface ShipmentCompatibilitySummary {
  originWarehouseId: string;
  destinationOrganizationUnitId: string | null;
  destinationLatitude: number;
  destinationLongitude: number;
}

const COORDINATE_PRECISION = 6;

/** کلید مقایسه مقصد: شناسه گره سازمانی در صورت وجود، وگرنه مختصات دقیق. */
export function shipmentDestinationKey(shipment: ShipmentCompatibilitySummary): string {
  if (shipment.destinationOrganizationUnitId) return `unit:${shipment.destinationOrganizationUnitId}`;
  return `coord:${shipment.destinationLatitude.toFixed(COORDINATE_PRECISION)},${shipment.destinationLongitude.toFixed(COORDINATE_PRECISION)}`;
}

/**
 * مرسوله‌های یک مأموریت باید هم‌مبدأ و هم‌مقصد باشند (PROJECT_SPEC بخش ۶).
 * فهرست خالی یا تک‌عضوی همیشه سازگار است.
 */
export function areShipmentsCompatible(shipments: readonly ShipmentCompatibilitySummary[]): boolean {
  if (shipments.length <= 1) return true;
  const originId = shipments[0].originWarehouseId;
  const destinationKey = shipmentDestinationKey(shipments[0]);
  return shipments.every((s) => s.originWarehouseId === originId && shipmentDestinationKey(s) === destinationKey);
}

export interface MissionTimeRange {
  startAt: Date;
  estimatedArrivalAt: Date;
}

/** هم‌پوشانی زمانی دو مأموریت طبق ARCHITECTURE_AND_DATA_MODEL.md بخش ۸ (بازه startAt تا estimatedArrivalAt). */
export function missionTimeRangesOverlap(a: MissionTimeRange, b: MissionTimeRange): boolean {
  return a.startAt.getTime() < b.estimatedArrivalAt.getTime() && b.startAt.getTime() < a.estimatedArrivalAt.getTime();
}

export type MissionDisplayStatus = "DRAFT" | "WAITING" | "IN_PROGRESS" | "ARRIVED" | "CANCELLED" | "ARCHIVED";

export interface MissionStatusInput {
  persistedStatus: "DRAFT" | "SCHEDULED" | "CANCELLED" | "ARCHIVED";
  startAt: Date;
  estimatedArrivalAt: Date;
}

/**
 * وضعیت نمایشی مشتق‌شده صرفاً برای تعیین قفل ویرایش (ADR-018) در این فاز استفاده می‌شود؛
 * موتور کامل موقعیت تقریبی (interpolation روی مسیر) در Phase 9 پیاده می‌شود.
 */
export function deriveMissionDisplayStatus(mission: MissionStatusInput, now: Date): MissionDisplayStatus {
  if (mission.persistedStatus === "DRAFT") return "DRAFT";
  if (mission.persistedStatus === "CANCELLED") return "CANCELLED";
  if (mission.persistedStatus === "ARCHIVED") return "ARCHIVED";
  if (now.getTime() < mission.startAt.getTime()) return "WAITING";
  if (now.getTime() >= mission.estimatedArrivalAt.getTime()) return "ARRIVED";
  return "IN_PROGRESS";
}

/** طبق ADR-018: پس از شروع (WAITING نیست)، فیلدهای عملیاتی مأموریت SCHEDULED دیگر قابل ویرایش مستقیم نیستند. */
export function isMissionOperationallyLocked(mission: MissionStatusInput, now: Date): boolean {
  if (mission.persistedStatus !== "SCHEDULED") return false;
  const status = deriveMissionDisplayStatus(mission, now);
  return status === "IN_PROGRESS" || status === "ARRIVED";
}
