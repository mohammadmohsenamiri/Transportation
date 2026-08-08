import { haversineDistanceMeters } from "@/lib/geo/distance";

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

export interface MapPickedPoint {
  organizationUnitId: string | null;
  latitude: number;
  longitude: number;
}

export interface ShipmentDestinationPoint {
  destinationOrganizationUnitId: string | null;
  destinationLatitude: number;
  destinationLongitude: number;
}

/**
 * تطبیق مقصد یک مرسوله با نقطه انتخاب‌شده روی نقشه (Phase 8، ساخت مأموریت از داخل نقشه):
 * تطبیق دقیق در صورت یکسان بودن شناسه گره سازمانی، وگرنه نزدیکی مختصات در محدوده tolerance
 * (چون Tap کاربر روی نقشه نمی‌تواند به دقت مختصات ثبت‌شده مرسوله برسد).
 */
export function shipmentMatchesDestinationPoint(
  shipment: ShipmentDestinationPoint,
  point: MapPickedPoint,
  toleranceMeters: number,
): boolean {
  if (point.organizationUnitId && shipment.destinationOrganizationUnitId === point.organizationUnitId) {
    return true;
  }
  const distance = haversineDistanceMeters(
    { latitude: shipment.destinationLatitude, longitude: shipment.destinationLongitude },
    { latitude: point.latitude, longitude: point.longitude },
  );
  return distance <= toleranceMeters;
}

export interface MissionTimeRange {
  startAt: Date;
  estimatedArrivalAt: Date;
}

/** هم‌پوشانی زمانی دو مأموریت طبق ARCHITECTURE_AND_DATA_MODEL.md بخش ۸ (بازه startAt تا estimatedArrivalAt). */
export function missionTimeRangesOverlap(a: MissionTimeRange, b: MissionTimeRange): boolean {
  return a.startAt.getTime() < b.estimatedArrivalAt.getTime() && b.startAt.getTime() < a.estimatedArrivalAt.getTime();
}

/** وضعیت *ثبت‌شده* — ستون DB. شش مقدار. */
export type MissionPersistedStatus = "DRAFT" | "SCHEDULED" | "COMPLETED" | "FAILED" | "CANCELLED" | "ARCHIVED";

/** وضعیت *نمایشی* — خروجی `deriveMissionDisplayStatus`. هشت مقدار. */
export type MissionDisplayStatus =
  | "DRAFT"
  | "WAITING"
  | "IN_PROGRESS"
  | "ARRIVED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "ARCHIVED";

export type MissionFailureClassificationValue =
  | "VEHICLE_BREAKDOWN"
  | "ACCIDENT"
  | "CARGO_ISSUE"
  | "ROUTE_BLOCKED"
  | "WEATHER"
  | "DRIVER_UNAVAILABLE"
  | "OTHER";

export interface MissionStatusInput {
  persistedStatus: MissionPersistedStatus;
  startAt: Date;
  estimatedArrivalAt: Date;
}

/**
 * وضعیت‌های پایانی *ثبت‌شده* — بر وضعیت ساعت‌محور اولویت دارند.
 * `SCHEDULED` تنها مقداری است که به سه وضعیت نمایشی باز می‌شود؛ بقیه ۱:۱ نگاشت می‌شوند و
 * دقیقاً به همین دلیل می‌توانند مقایسه با ساعت را کوتاه کنند.
 */
const TERMINAL_PERSISTED: readonly MissionPersistedStatus[] = ["COMPLETED", "FAILED", "CANCELLED", "ARCHIVED"];

export function isTerminalPersistedStatus(status: MissionPersistedStatus): boolean {
  return TERMINAL_PERSISTED.includes(status);
}

/**
 * تنها داور وضعیت نمایشی مأموریت — نقشه (فاز ۱۰)، جدول (فاز ۱۱)، خط زمان (فاز ۱۲) و فرانما
 * (فاز ۱۳) همگی از همین یک تابع می‌خوانند. ترتیب ارزیابی الزام‌آور است و نخستین تطابق برنده است.
 *
 * فاز ۱۵ فقط دو ردیف افزود (`COMPLETED` و `FAILED`) و آن‌ها را دقیقاً همان‌جایی گذاشت که
 * `CANCELLED`/`ARCHIVED` از قبل بودند: پیش از هر مقایسه‌ای با ساعت. همین باعث می‌شود وضعیت
 * ثبت‌شده همیشه بر وضعیت تخمینی مقدم باشد و هر چهار مصرف‌کننده بدون هیچ تغییری هماهنگ بمانند.
 *
 * تابع محض و total است: برای هر مأموریتی تعریف شده و هرگز throw نمی‌کند (I-13).
 */
export function deriveMissionDisplayStatus(mission: MissionStatusInput, now: Date): MissionDisplayStatus {
  if (mission.persistedStatus === "DRAFT") return "DRAFT";
  if (mission.persistedStatus === "CANCELLED") return "CANCELLED";
  if (mission.persistedStatus === "ARCHIVED") return "ARCHIVED";
  if (mission.persistedStatus === "COMPLETED") return "COMPLETED";
  if (mission.persistedStatus === "FAILED") return "FAILED";
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
