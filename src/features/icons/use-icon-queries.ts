import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignIconRequest,
  deleteIconRequest,
  fetchIcons,
  replaceIconRequest,
  restoreIconRequest,
  uploadIconRequest,
  type IconAssignmentPayload,
  type IconListParams,
} from "@/features/icons/api";
import type { IconCategory } from "@/features/icons/types";

const iconsKey = ["icons"] as const;

export function useIcons(params: IconListParams) {
  return useQuery({
    queryKey: [...iconsKey, params],
    queryFn: () => fetchIcons(params),
    placeholderData: keepPreviousData,
  });
}

function useIconMutation<TVariables, TData>(mutationFn: (variables: TVariables) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: iconsKey }),
  });
}

export function useUploadIcon() {
  return useIconMutation((input: { file: File; name: string; category: IconCategory }) => uploadIconRequest(input));
}

export function useReplaceIcon() {
  return useIconMutation(({ id, file, version }: { id: string; file: File; version: number }) =>
    replaceIconRequest(id, { file, version }),
  );
}

export function useDeleteIcon() {
  return useIconMutation(({ id, version }: { id: string; version: number }) => deleteIconRequest(id, version));
}

export function useRestoreIcon() {
  return useIconMutation(({ id, version }: { id: string; version: number }) => restoreIconRequest(id, version));
}

export function useAssignIcon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: IconAssignmentPayload) => assignIconRequest(payload),
    onSuccess: () => {
      // تخصیص هم شمارنده استفاده آیکن را عوض می‌کند و هم صحنه نقشه را.
      queryClient.invalidateQueries({ queryKey: iconsKey });
      queryClient.invalidateQueries({ queryKey: ["map"] });
    },
  });
}
