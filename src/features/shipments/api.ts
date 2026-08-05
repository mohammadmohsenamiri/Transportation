import { ApiError } from "@/lib/http/api-client-error";
import type { Shipment, ShipmentHistoryEntry, ShipmentStatusValue, ShipmentSummary } from "@/features/shipments/types";

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }
  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(data.error);
  }
  return data as T;
}

export interface ShipmentPayload {
  trackingCode: string | null;
  title: string;
  cargoTypeId: string;
  originWarehouseId: string;
  destinationMode: "ORGANIZATION_UNIT" | "COORDINATES";
  destinationOrganizationUnitId: string | null;
  destinationTitle: string | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  weightKg: number | null;
  volumeM3: number | null;
  notes: string | null;
}

export interface ShipmentUpdatePayload extends Partial<ShipmentPayload> {
  status?: ShipmentStatusValue;
  isActive?: boolean;
}

export async function fetchShipments(
  params: { q?: string; status?: string; cargoTypeId?: string; originWarehouseId?: string } = {},
): Promise<Shipment[]> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.status) searchParams.set("status", params.status);
  if (params.cargoTypeId) searchParams.set("cargoTypeId", params.cargoTypeId);
  if (params.originWarehouseId) searchParams.set("originWarehouseId", params.originWarehouseId);
  const query = searchParams.toString();
  const response = await fetch(`/api/v1/shipments${query ? `?${query}` : ""}`);
  const data = await parseResponse<{ items: Shipment[] }>(response);
  return data.items;
}

export async function fetchShipmentSummary(): Promise<ShipmentSummary> {
  const response = await fetch("/api/v1/shipments/summary");
  return parseResponse<ShipmentSummary>(response);
}

export async function fetchShipmentById(id: string): Promise<Shipment> {
  const response = await fetch(`/api/v1/shipments/${id}`);
  return parseResponse<Shipment>(response);
}

export async function fetchShipmentHistory(id: string): Promise<ShipmentHistoryEntry[]> {
  const response = await fetch(`/api/v1/shipments/${id}/history`);
  const data = await parseResponse<{ items: ShipmentHistoryEntry[] }>(response);
  return data.items;
}

export async function createShipmentRequest(payload: ShipmentPayload): Promise<Shipment> {
  const response = await fetch("/api/v1/shipments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Shipment>(response);
}

export async function updateShipmentRequest(id: string, payload: ShipmentUpdatePayload): Promise<Shipment> {
  const response = await fetch(`/api/v1/shipments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Shipment>(response);
}

export async function deleteShipmentRequest(id: string): Promise<void> {
  const response = await fetch(`/api/v1/shipments/${id}`, { method: "DELETE" });
  await parseResponse<void>(response);
}
