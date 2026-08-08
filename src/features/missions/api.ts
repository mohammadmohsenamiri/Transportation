import { ApiError } from "@/lib/http/api-client-error";
import type {
  Mission,
  MissionEstimateResult,
  MissionHistoryEntry,
  MissionFailureClassificationValue,
  MissionNote,
  MissionPersistedStatusValue,
  MissionSummary,
  MissionType,
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
  /** Phase 15 (FR-10) — آخرین نسخه خوانده‌شده؛ ناهماهنگی ۴۰۹ می‌دهد نه بازنویسی بی‌صدا. */
  version: number;
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

/** Phase 15 — `version` اکنون اجباری است (ADR-P15-05). */
export async function cancelMissionRequest(
  id: string,
  cancellationReason: string,
  version: number,
): Promise<Mission> {
  const response = await fetch(`/api/v1/missions/${id}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cancellationReason, version }),
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

// ---------------------------------------------------------------------------
// Phase 15 — گذارهای چرخه عمر
// ---------------------------------------------------------------------------

function postLifecycle(id: string, action: string, body: unknown): Promise<Mission> {
  return fetch(`/api/v1/missions/${id}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(parseResponse<Mission>);
}

export function completeMissionRequest(
  id: string,
  payload: { version: number; actualArrivalAt: string; actualDepartureAt?: string | null },
): Promise<Mission> {
  return postLifecycle(id, "complete", payload);
}

export function failMissionRequest(
  id: string,
  payload: {
    version: number;
    failedAt: string;
    failureReason: string;
    failureClassification: MissionFailureClassificationValue;
  },
): Promise<Mission> {
  return postLifecycle(id, "fail", payload);
}

export function archiveMissionRequest(id: string, version: number): Promise<Mission> {
  return postLifecycle(id, "archive", { version });
}

export function unarchiveMissionRequest(id: string, version: number): Promise<Mission> {
  return postLifecycle(id, "unarchive", { version });
}

export function reopenMissionRequest(id: string, payload: { version: number; reopenReason: string }): Promise<Mission> {
  return postLifecycle(id, "reopen", payload);
}

export async function fetchMissionNotes(id: string): Promise<MissionNote[]> {
  const data = await parseResponse<{ items: MissionNote[] }>(await fetch(`/api/v1/missions/${id}/notes`));
  return data.items;
}

/** CC-04 — یادداشت توکن نسخه نمی‌گیرد. */
export function addMissionNoteRequest(id: string, body: string): Promise<MissionNote> {
  return fetch(`/api/v1/missions/${id}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  }).then(parseResponse<MissionNote>);
}

export function deleteMissionNoteRequest(id: string, noteId: string): Promise<void> {
  return fetch(`/api/v1/missions/${id}/notes/${noteId}`, { method: "DELETE" }).then(parseResponse<void>);
}

export async function fetchMissionTypes(activeOnly = false): Promise<MissionType[]> {
  const query = activeOnly ? "?activeOnly=true" : "";
  const data = await parseResponse<{ items: MissionType[] }>(await fetch(`/api/v1/mission-types${query}`));
  return data.items;
}

export interface MissionTypePayload {
  code?: string | null;
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export function createMissionTypeRequest(payload: MissionTypePayload): Promise<MissionType> {
  return fetch("/api/v1/mission-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(parseResponse<MissionType>);
}

export function updateMissionTypeRequest(id: string, payload: MissionTypePayload): Promise<MissionType> {
  return fetch(`/api/v1/mission-types/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(parseResponse<MissionType>);
}

export function deleteMissionTypeRequest(id: string): Promise<void> {
  return fetch(`/api/v1/mission-types/${id}`, { method: "DELETE" }).then(parseResponse<void>);
}
