import type { OrganizationLevelValue } from "@/features/organization/level-labels";
import { ApiError, type OrganizationHistoryEntry, type OrganizationUnit } from "@/features/organization/types";

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

export async function fetchOrganizationTree(): Promise<OrganizationUnit[]> {
  const response = await fetch("/api/v1/organization-tree");
  const data = await parseResponse<{ items: OrganizationUnit[] }>(response);
  return data.items;
}

export async function fetchOrganizationUnitsByLevel(level: OrganizationLevelValue): Promise<OrganizationUnit[]> {
  const response = await fetch(`/api/v1/organization-units?level=${level}`);
  const data = await parseResponse<{ items: OrganizationUnit[] }>(response);
  return data.items;
}

export interface OrganizationUnitCreatePayload {
  code: string;
  name: string;
  level: OrganizationLevelValue;
  parentId: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

export interface OrganizationUnitUpdatePayload {
  name?: string;
  parentId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  isActive?: boolean;
}

export async function createOrganizationUnitRequest(
  payload: OrganizationUnitCreatePayload,
): Promise<OrganizationUnit> {
  const response = await fetch("/api/v1/organization-units", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<OrganizationUnit>(response);
}

export async function updateOrganizationUnitRequest(
  id: string,
  payload: OrganizationUnitUpdatePayload,
): Promise<OrganizationUnit> {
  const response = await fetch(`/api/v1/organization-units/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<OrganizationUnit>(response);
}

export async function deleteOrganizationUnitRequest(id: string): Promise<void> {
  const response = await fetch(`/api/v1/organization-units/${id}`, { method: "DELETE" });
  await parseResponse<void>(response);
}

export async function fetchOrganizationUnitHistory(id: string): Promise<OrganizationHistoryEntry[]> {
  const response = await fetch(`/api/v1/organization-units/${id}/history`);
  const data = await parseResponse<{ items: OrganizationHistoryEntry[] }>(response);
  return data.items;
}
