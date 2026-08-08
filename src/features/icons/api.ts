import { ApiError } from "@/lib/http/api-client-error";
import type { IconAsset, IconCategory, PagedIcons } from "@/features/icons/types";

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const data = await response.json();
  if (!response.ok) throw new ApiError(data.error);
  return data as T;
}

export interface IconListParams {
  category?: IconCategory | "";
  q?: string;
  includeDeleted?: boolean;
  page?: number;
}

export async function fetchIcons(params: IconListParams): Promise<PagedIcons> {
  const search = new URLSearchParams();
  if (params.category) search.set("category", params.category);
  if (params.q) search.set("q", params.q);
  if (params.includeDeleted) search.set("includeDeleted", "true");
  if (params.page && params.page > 1) search.set("page", String(params.page));

  return parseResponse<PagedIcons>(await fetch(`/api/v1/icons?${search.toString()}`));
}

/**
 * آپلود با `FormData` انجام می‌شود، نه JSON با base64: بایت‌ها بدون تورم ۳۳ درصدی منتقل می‌شوند
 * و `Content-Type` عمداً تنظیم *نمی‌شود* تا مرورگر خودش boundary را بسازد.
 */
export function uploadIconRequest(input: { file: File; name: string; category: IconCategory }): Promise<IconAsset> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("name", input.name);
  form.append("category", input.category);
  return fetch("/api/v1/icons", { method: "POST", body: form }).then(parseResponse<IconAsset>);
}

export function replaceIconRequest(id: string, input: { file: File; version: number }): Promise<IconAsset> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("version", String(input.version));
  return fetch(`/api/v1/icons/${id}/replace`, { method: "POST", body: form }).then(parseResponse<IconAsset>);
}

export function deleteIconRequest(id: string, version: number): Promise<IconAsset> {
  return fetch(`/api/v1/icons/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version }),
  }).then(parseResponse<IconAsset>);
}

export function restoreIconRequest(id: string, version: number): Promise<IconAsset> {
  return fetch(`/api/v1/icons/${id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version }),
  }).then(parseResponse<IconAsset>);
}

export interface IconAssignmentPayload {
  targetType: "ORGANIZATION_UNIT" | "VEHICLE_TYPE" | "VEHICLE";
  targetId: string;
  iconAssetId: string | null;
}

export function assignIconRequest(payload: IconAssignmentPayload): Promise<{ ok: true }> {
  return fetch("/api/v1/icons/assignments", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(parseResponse<{ ok: true }>);
}
