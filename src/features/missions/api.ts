import { ApiError } from "@/lib/http/api-client-error";
import type {
  Mission,
  MissionEstimateResult,
  MissionHistoryEntry,
  MissionPersistedStatusValue,
  MissionSummary,
} from "@/features/missions/types";

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

export interface MissionCreatePayload {
  shipmentIds: string[];
  vehicleId: string;
  startAt: string;
  routeId: string | null;
  notes: string | null;
}

export interface MissionUpdatePayload {
  shipmentIds?: string[];
  vehicleId?: string;
  startAt?: string;
  routeId?: string | null;
  notes?: string | null;
}

export interface MissionEstimateRequest {
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  speedKmh: number;
  routeId?: string | null;
  fuelConsumptionPer100Km?: number | null;
}

export async function fetchMissions(
  params: { q?: string; persistedStatus?: MissionPersistedStatusValue; vehicleId?: string } = {},
): Promise<Mission[]> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.persistedStatus) searchParams.set("persistedStatus", params.persistedStatus);
  if (params.vehicleId) searchParams.set("vehicleId", params.vehicleId);
  const query = searchParams.toString();
  const response = await fetch(`/api/v1/missions${query ? `?${query}` : ""}`);
  const data = await parseResponse<{ items: Mission[] }>(response);
  return data.items;
}

export async function fetchMissionSummary(): Promise<MissionSummary> {
  const response = await fetch("/api/v1/missions/summary");
  return parseResponse<MissionSummary>(response);
}

export async function fetchMissionById(id: string): Promise<Mission> {
  const response = await fetch(`/api/v1/missions/${id}`);
  return parseResponse<Mission>(response);
}

export async function fetchMissionHistory(id: string): Promise<MissionHistoryEntry[]> {
  const response = await fetch(`/api/v1/missions/${id}/history`);
  const data = await parseResponse<{ items: MissionHistoryEntry[] }>(response);
  return data.items;
}

export async function estimateMissionRequest(payload: MissionEstimateRequest): Promise<MissionEstimateResult> {
  const response = await fetch("/api/v1/missions/estimate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<MissionEstimateResult>(response);
}

export async function createMissionDraftRequest(payload: MissionCreatePayload): Promise<Mission> {
  const response = await fetch("/api/v1/missions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Mission>(response);
}

export async function updateMissionRequest(id: string, payload: MissionUpdatePayload): Promise<Mission> {
  const response = await fetch(`/api/v1/missions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Mission>(response);
}

export async function deleteMissionRequest(id: string): Promise<void> {
  const response = await fetch(`/api/v1/missions/${id}`, { method: "DELETE" });
  await parseResponse<void>(response);
}

export async function publishMissionRequest(id: string): Promise<Mission> {
  const response = await fetch(`/api/v1/missions/${id}/publish`, { method: "POST" });
  return parseResponse<Mission>(response);
}

export async function cancelMissionRequest(id: string, cancellationReason: string): Promise<Mission> {
  const response = await fetch(`/api/v1/missions/${id}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cancellationReason }),
  });
  return parseResponse<Mission>(response);
}

export async function duplicateMissionRequest(id: string, startAt: string): Promise<Mission> {
  const response = await fetch(`/api/v1/missions/${id}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startAt }),
  });
  return parseResponse<Mission>(response);
}
