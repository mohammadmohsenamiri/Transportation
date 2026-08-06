import { ApiError } from "@/lib/http/api-client-error";
import type { ActiveMapProvider, MapScene, OrgMapMarker } from "@/features/map/types";

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) throw new ApiError(data.error);
  return data as T;
}

export async function fetchActiveMapProvider(): Promise<ActiveMapProvider | null> {
  const response = await fetch("/api/v1/map-providers/active");
  const data = await parseResponse<{ provider: ActiveMapProvider | null }>(response);
  return data.provider;
}

export async function fetchOrgUnitsForMap(): Promise<OrgMapMarker[]> {
  const response = await fetch("/api/v1/map/organization-units");
  const data = await parseResponse<{ items: OrgMapMarker[] }>(response);
  return data.items;
}

export async function fetchMapScene(viewTime?: string): Promise<MapScene> {
  const query = viewTime ? `?viewTime=${encodeURIComponent(viewTime)}` : "";
  const response = await fetch(`/api/v1/map/scene${query}`);
  return parseResponse<MapScene>(response);
}
