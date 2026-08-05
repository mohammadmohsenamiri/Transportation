import { ApiError } from "@/lib/http/api-client-error";
import type { RouteCsvPreview, RouteDetail, RouteStats, RouteSummary } from "@/features/routes/types";

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

export interface RoutePointPayload {
  sequence: number;
  latitude: number;
  longitude: number;
  label: string | null;
}

export async function fetchRoutes(params: { q?: string; isActive?: boolean } = {}): Promise<RouteSummary[]> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.isActive !== undefined) searchParams.set("isActive", String(params.isActive));
  const query = searchParams.toString();
  const response = await fetch(`/api/v1/routes${query ? `?${query}` : ""}`);
  const data = await parseResponse<{ items: RouteSummary[] }>(response);
  return data.items;
}

export async function fetchRouteStats(): Promise<RouteStats> {
  const response = await fetch("/api/v1/routes/summary");
  return parseResponse<RouteStats>(response);
}

export async function fetchRouteById(id: string): Promise<RouteDetail> {
  const response = await fetch(`/api/v1/routes/${id}`);
  return parseResponse<RouteDetail>(response);
}

export async function createRouteRequest(payload: {
  code: string;
  name: string;
  description: string | null;
  source: "MAP_DRAWING";
  points: RoutePointPayload[];
}): Promise<RouteDetail> {
  const response = await fetch("/api/v1/routes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<RouteDetail>(response);
}

export async function uploadRouteCsvRequest(file: File): Promise<RouteCsvPreview> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/v1/routes/import-csv", { method: "POST", body: formData });
  return parseResponse<RouteCsvPreview>(response);
}

export async function confirmRouteCsvImportRequest(payload: {
  previewToken: string;
  code: string;
  name: string;
  description: string | null;
  points: RoutePointPayload[];
}): Promise<RouteDetail> {
  const response = await fetch("/api/v1/routes/confirm-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<RouteDetail>(response);
}

export async function createRouteNewVersionRequest(
  id: string,
  payload: { source: "MAP_DRAWING"; points: RoutePointPayload[] },
): Promise<RouteDetail> {
  const response = await fetch(`/api/v1/routes/${id}/new-version`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<RouteDetail>(response);
}

export async function duplicateRouteRequest(
  id: string,
  payload: { code: string; name: string },
): Promise<RouteDetail> {
  const response = await fetch(`/api/v1/routes/${id}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<RouteDetail>(response);
}

export async function patchRouteRequest(
  id: string,
  payload: { name?: string; description?: string | null; isActive?: boolean },
): Promise<RouteSummary> {
  const response = await fetch(`/api/v1/routes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<RouteSummary>(response);
}

export function routeExportUrl(id: string): string {
  return `/api/v1/routes/${id}/export.csv`;
}
