export type ShipmentStatusValue = "DRAFT" | "WAITING_FOR_DISPATCH" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
export type ShipmentDestinationMode = "ORGANIZATION_UNIT" | "COORDINATES";

export interface Shipment {
  id: string;
  trackingCode: string;
  title: string;
  cargoTypeId: string;
  cargoTypeName: string;
  originWarehouseId: string;
  originWarehouseName: string;
  originLatitude: number | null;
  originLongitude: number | null;
  destinationMode: ShipmentDestinationMode;
  destinationOrganizationUnitId: string | null;
  destinationOrganizationUnitName: string | null;
  destinationTitle: string;
  destinationLatitude: number;
  destinationLongitude: number;
  weightKg: number | null;
  volumeM3: number | null;
  notes: string | null;
  status: ShipmentStatusValue;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentSummary {
  total: number;
  waitingForDispatch: number;
  inTransit: number;
  delivered: number;
}

export interface ShipmentHistoryEntry {
  id: string;
  action: string;
  actorUserId: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  occurredAt: string;
}

export type { ApiFieldError } from "@/lib/http/api-client-error";
export { ApiError } from "@/lib/http/api-client-error";
