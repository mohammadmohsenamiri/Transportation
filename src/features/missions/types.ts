export type MissionPersistedStatusValue = "DRAFT" | "SCHEDULED" | "CANCELLED" | "ARCHIVED";
export type MissionDisplayStatusValue = "DRAFT" | "WAITING" | "IN_PROGRESS" | "ARRIVED" | "CANCELLED" | "ARCHIVED";

export interface MissionShipmentSummary {
  id: string;
  trackingCode: string;
  title: string;
  cargoTypeName: string;
}

export interface Mission {
  id: string;
  code: string;
  vehicleId: string;
  vehicleIdentifier: string;
  originWarehouseId: string;
  originTitle: string;
  originLatitude: number;
  originLongitude: number;
  destinationOrganizationUnitId: string | null;
  destinationTitle: string;
  destinationLatitude: number;
  destinationLongitude: number;
  startAt: string;
  routeId: string | null;
  routeVersion: number | null;
  speedSnapshotKmh: number;
  distanceMeters: number;
  estimatedDurationSeconds: number;
  estimatedArrivalAt: string;
  persistedStatus: MissionPersistedStatusValue;
  displayStatus: MissionDisplayStatusValue;
  notes: string | null;
  publishedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  duplicatedFromMissionId: string | null;
  shipments: MissionShipmentSummary[];
  createdAt: string;
  updatedAt: string;
}

/** بر اساس وضعیت ثبت‌شده؛ جمع سطل‌ها همیشه برابر `total` است. */
export interface MissionSummary {
  total: number;
  draft: number;
  scheduled: number;
  cancelled: number;
  archived: number;
}

export interface MissionHistoryEntry {
  id: string;
  action: string;
  actorUserId: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  occurredAt: string;
}

export interface MissionEstimateResult {
  distanceMeters: number;
  durationSeconds: number;
  isFallbackDirect: boolean;
  estimatedFuelLiters: number | null;
}

export type { ApiFieldError } from "@/lib/http/api-client-error";
export { ApiError } from "@/lib/http/api-client-error";
