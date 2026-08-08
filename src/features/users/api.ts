import { ApiError } from "@/lib/http/api-client-error";
import type { AdminUser, PagedUsers, UserRoleCode, UserStatus } from "@/features/users/types";

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const data = await response.json();
  if (!response.ok) throw new ApiError(data.error);
  return data as T;
}

function postJson<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(parseResponse<T>);
}

export interface UserListParams {
  q?: string;
  role?: UserRoleCode | "";
  status?: UserStatus | "";
  includeDeleted?: boolean;
  page?: number;
}

export async function fetchUsers(params: UserListParams): Promise<PagedUsers> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.role) search.set("role", params.role);
  if (params.status) search.set("status", params.status);
  if (params.includeDeleted) search.set("includeDeleted", "true");
  if (params.page && params.page > 1) search.set("page", String(params.page));

  return parseResponse<PagedUsers>(await fetch(`/api/v1/users?${search.toString()}`));
}

export interface CreateUserPayload {
  username: string;
  displayName: string | null;
  password: string;
  roles: UserRoleCode[];
}

export function createUserRequest(payload: CreateUserPayload): Promise<AdminUser> {
  return postJson<AdminUser>("/api/v1/users", payload);
}

export function updateUserRequest(
  id: string,
  payload: { version: number; displayName: string | null },
): Promise<AdminUser> {
  return postJson<AdminUser>(`/api/v1/users/${id}`, payload, "PATCH");
}

/** گذارهای وضعیت — هر کدام مسیر صریح خود را دارند تا از روی URL روشن باشد چه رخ داده است. */
export type UserTransition = "activate" | "deactivate" | "suspend" | "unsuspend" | "restore";

export function transitionUserRequest(
  id: string,
  transition: UserTransition,
  body: { version: number; reason?: string },
): Promise<AdminUser> {
  return postJson<AdminUser>(`/api/v1/users/${id}/${transition}`, body);
}

export function deleteUserRequest(id: string, version: number): Promise<AdminUser> {
  return postJson<AdminUser>(`/api/v1/users/${id}`, { version }, "DELETE");
}

export function replaceUserRolesRequest(
  id: string,
  payload: { version: number; roles: UserRoleCode[] },
): Promise<AdminUser> {
  return postJson<AdminUser>(`/api/v1/users/${id}/roles`, payload, "PUT");
}

/** رمز جدید فقط ارسال می‌شود؛ پاسخ هیچ ماده رمزی برنمی‌گرداند (BR-P06). */
export function resetUserPasswordRequest(
  id: string,
  payload: { version: number; newPassword: string },
): Promise<AdminUser> {
  return postJson<AdminUser>(`/api/v1/users/${id}/reset-password`, payload);
}
