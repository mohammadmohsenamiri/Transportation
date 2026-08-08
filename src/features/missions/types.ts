export type MissionPersistedStatusValue =
  | "DRAFT"
  | "SCHEDULED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "ARCHIVED";

export type MissionDisplayStatusValue =
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

  // — Phase 15 —
  /** ⚠️ توکن همروندی؛ با `routeVersion` بالا اشتباه نشود. روی هر عملیات تغییردهنده برگردانده می‌شود. */
  version: number;
  actualDepartureAt: string | null;
  actualArrivalAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  failureClassification: MissionFailureClassificationValue | null;
  archivedAt: string | null;
  statusBeforeArchive: MissionPersistedStatusValue | null;
  reopenCount: number;
  lastReopenedAt: string | null;
  missionType: { id: string; name: string } | null;
  noteCount: number;
  arrivalVarianceMinutes: number | null;
}

/** بر اساس وضعیت ثبت‌شده؛ جمع سطل‌ها همیشه برابر `total` است. */
export interface MissionSummary {
  total: number;
  draft: number;
  scheduled: number;
  completed: number;
  failed: number;
  cancelled: number;
  archived: number;
}

export interface MissionNote {
  id: string;
  missionId: string;
  body: string;
  createdById: string;
  createdByUsername: string;
  createdAt: string;
  canDelete: boolean;
}

export interface MissionType {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  missionCount: number;
  createdAt: string;
  updatedAt: string;
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
