import { ApiError } from "@/lib/http/api-client-error";
import type { PagedAuditEntries } from "@/features/audit/types";

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) throw new ApiError(data.error);
  return data as T;
}

export interface AuditListParams {
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
  page?: number;
}

export async function fetchAuditEntries(params: AuditListParams): Promise<PagedAuditEntries> {
  const search = new URLSearchParams();
  if (params.action) search.set("action", params.action);
  if (params.entityType) search.set("entityType", params.entityType);
  if (params.entityId) search.set("entityId", params.entityId);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.page && params.page > 1) search.set("page", String(params.page));

  return parseResponse<PagedAuditEntries>(await fetch(`/api/v1/audit?${search.toString()}`));
}

export async function fetchAuditActions(): Promise<string[]> {
  const data = await parseResponse<{ actions: string[] }>(await fetch("/api/v1/audit?facets=actions"));
  return data.actions;
}
