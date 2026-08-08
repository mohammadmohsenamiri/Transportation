import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUserRequest,
  deleteUserRequest,
  fetchUsers,
  replaceUserRolesRequest,
  resetUserPasswordRequest,
  transitionUserRequest,
  updateUserRequest,
  type CreateUserPayload,
  type UserListParams,
  type UserTransition,
} from "@/features/users/api";
import type { UserRoleCode } from "@/features/users/types";

const usersKey = ["users"] as const;

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: [...usersKey, params],
    queryFn: () => fetchUsers(params),
    // بدون این، هر تغییر فیلتر یا صفحه، data را لحظه‌ای undefined می‌کند و جدول می‌پرد.
    placeholderData: keepPreviousData,
  });
}

function useUserMutation<TVariables, TData>(mutationFn: (variables: TVariables) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKey }),
  });
}

export function useCreateUser() {
  return useUserMutation((payload: CreateUserPayload) => createUserRequest(payload));
}

export function useUpdateUser() {
  return useUserMutation(({ id, version, displayName }: { id: string; version: number; displayName: string | null }) =>
    updateUserRequest(id, { version, displayName }),
  );
}

export function useTransitionUser() {
  return useUserMutation(
    ({ id, transition, version, reason }: { id: string; transition: UserTransition; version: number; reason?: string }) =>
      transitionUserRequest(id, transition, { version, reason }),
  );
}

export function useDeleteUser() {
  return useUserMutation(({ id, version }: { id: string; version: number }) => deleteUserRequest(id, version));
}

export function useReplaceUserRoles() {
  return useUserMutation(({ id, version, roles }: { id: string; version: number; roles: UserRoleCode[] }) =>
    replaceUserRolesRequest(id, { version, roles }),
  );
}

export function useResetUserPassword() {
  return useUserMutation(({ id, version, newPassword }: { id: string; version: number; newPassword: string }) =>
    resetUserPasswordRequest(id, { version, newPassword }),
  );
}
