import { ApiError } from "@/lib/http/api-client-error";
import type { CargoType, FleetSummary, Vehicle, VehicleType } from "@/features/fleet/types";

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

export interface CatalogTypePayload {
  code: string | null;
  name: string;
  description: string | null;
}

export interface CatalogTypeUpdatePayload {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

// انواع خودرو
export async function fetchVehicleTypes(q?: string): Promise<VehicleType[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  const response = await fetch(`/api/v1/vehicle-types${query}`);
  const data = await parseResponse<{ items: VehicleType[] }>(response);
  return data.items;
}

export async function createVehicleTypeRequest(payload: CatalogTypePayload): Promise<VehicleType> {
  const response = await fetch("/api/v1/vehicle-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<VehicleType>(response);
}

export async function updateVehicleTypeRequest(
  id: string,
  payload: CatalogTypeUpdatePayload,
): Promise<VehicleType> {
  const response = await fetch(`/api/v1/vehicle-types/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<VehicleType>(response);
}

export async function deleteVehicleTypeRequest(id: string): Promise<void> {
  const response = await fetch(`/api/v1/vehicle-types/${id}`, { method: "DELETE" });
  await parseResponse<void>(response);
}

// انواع بار
export async function fetchCargoTypes(q?: string): Promise<CargoType[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  const response = await fetch(`/api/v1/cargo-types${query}`);
  const data = await parseResponse<{ items: CargoType[] }>(response);
  return data.items;
}

export async function createCargoTypeRequest(payload: CatalogTypePayload): Promise<CargoType> {
  const response = await fetch("/api/v1/cargo-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<CargoType>(response);
}

export async function updateCargoTypeRequest(
  id: string,
  payload: CatalogTypeUpdatePayload,
): Promise<CargoType> {
  const response = await fetch(`/api/v1/cargo-types/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<CargoType>(response);
}

export async function deleteCargoTypeRequest(id: string): Promise<void> {
  const response = await fetch(`/api/v1/cargo-types/${id}`, { method: "DELETE" });
  await parseResponse<void>(response);
}

// خودروها
export interface VehiclePayload {
  identifier: string;
  plateNumber: string | null;
  vehicleTypeId: string;
  fuelTankLiters: number;
  avgConsumptionPer100Km: number;
  avgSpeedKmh: number;
  readiness: "READY" | "OUT_OF_SERVICE";
  notes: string | null;
}

export interface VehicleUpdatePayload {
  plateNumber?: string | null;
  vehicleTypeId?: string;
  fuelTankLiters?: number;
  avgConsumptionPer100Km?: number;
  avgSpeedKmh?: number;
  readiness?: "READY" | "OUT_OF_SERVICE";
  notes?: string | null;
  isActive?: boolean;
}

export async function fetchVehicles(params: { q?: string; vehicleTypeId?: string; readiness?: string } = {}): Promise<Vehicle[]> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.vehicleTypeId) searchParams.set("vehicleTypeId", params.vehicleTypeId);
  if (params.readiness) searchParams.set("readiness", params.readiness);
  const query = searchParams.toString();
  const response = await fetch(`/api/v1/vehicles${query ? `?${query}` : ""}`);
  const data = await parseResponse<{ items: Vehicle[] }>(response);
  return data.items;
}

export async function fetchFleetSummary(): Promise<FleetSummary> {
  const response = await fetch("/api/v1/vehicles/summary");
  return parseResponse<FleetSummary>(response);
}

export async function createVehicleRequest(payload: VehiclePayload): Promise<Vehicle> {
  const response = await fetch("/api/v1/vehicles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Vehicle>(response);
}

export async function updateVehicleRequest(id: string, payload: VehicleUpdatePayload): Promise<Vehicle> {
  const response = await fetch(`/api/v1/vehicles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Vehicle>(response);
}

export async function deleteVehicleRequest(id: string): Promise<void> {
  const response = await fetch(`/api/v1/vehicles/${id}`, { method: "DELETE" });
  await parseResponse<void>(response);
}
