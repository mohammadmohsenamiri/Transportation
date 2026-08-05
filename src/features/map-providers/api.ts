import { ApiError } from "@/lib/http/api-client-error";
import type { MapProvider, MapProviderKind, TestConnectionResult } from "@/features/map-providers/types";

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const data = await response.json();
  if (!response.ok) throw new ApiError(data.error);
  return data as T;
}

export interface MapProviderPayload {
  name: string;
  kind: MapProviderKind;
  urlTemplate: string;
  attribution: string | null;
  minZoom: number;
  maxZoom: number;
  tileSize: 256 | 512;
  subdomains: string[] | null;
  requiresApiKey: boolean;
  secretReference: string | null;
  isDefault: boolean;
  isEnabled: boolean;
}

export type MapProviderUpdatePayload = Partial<Omit<MapProviderPayload, "kind">>;

export async function fetchMapProviders(): Promise<MapProvider[]> {
  const response = await fetch("/api/v1/map-providers");
  const data = await parseResponse<{ items: MapProvider[] }>(response);
  return data.items;
}

export async function createMapProviderRequest(payload: MapProviderPayload): Promise<MapProvider> {
  const response = await fetch("/api/v1/map-providers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<MapProvider>(response);
}

export async function updateMapProviderRequest(
  id: string,
  payload: MapProviderUpdatePayload,
): Promise<MapProvider> {
  const response = await fetch(`/api/v1/map-providers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<MapProvider>(response);
}

export async function deleteMapProviderRequest(id: string): Promise<void> {
  const response = await fetch(`/api/v1/map-providers/${id}`, { method: "DELETE" });
  await parseResponse<void>(response);
}

export async function testMapProviderConnectionRequest(id: string): Promise<TestConnectionResult> {
  const response = await fetch(`/api/v1/map-providers/${id}/test`, { method: "POST" });
  return parseResponse<TestConnectionResult>(response);
}
