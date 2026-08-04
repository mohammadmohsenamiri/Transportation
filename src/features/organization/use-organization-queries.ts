import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOrganizationUnitRequest,
  deleteOrganizationUnitRequest,
  fetchOrganizationTree,
  fetchOrganizationUnitHistory,
  fetchOrganizationUnitsByLevel,
  updateOrganizationUnitRequest,
  type OrganizationUnitCreatePayload,
  type OrganizationUnitUpdatePayload,
} from "@/features/organization/api";
import type { OrganizationLevelValue } from "@/features/organization/level-labels";

const treeKey = ["organization", "tree"] as const;

export function useOrganizationTree() {
  return useQuery({ queryKey: treeKey, queryFn: fetchOrganizationTree });
}

export function useOrganizationUnitsByLevel(level: OrganizationLevelValue | null) {
  return useQuery({
    queryKey: ["organization", "by-level", level],
    queryFn: () => fetchOrganizationUnitsByLevel(level as OrganizationLevelValue),
    enabled: level !== null,
  });
}

function historyKey(id: string) {
  return ["organization", "history", id] as const;
}

export function useOrganizationHistory(id: string | null) {
  return useQuery({
    queryKey: historyKey(id ?? ""),
    queryFn: () => fetchOrganizationUnitHistory(id as string),
    enabled: id !== null,
    staleTime: 0, // تاریخچه audit همیشه باید در باز شدن دوباره sheet تازه باشد
  });
}

export function useCreateOrganizationUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OrganizationUnitCreatePayload) => createOrganizationUnitRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: treeKey });
    },
  });
}

export function useUpdateOrganizationUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OrganizationUnitUpdatePayload }) =>
      updateOrganizationUnitRequest(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: treeKey });
      queryClient.invalidateQueries({ queryKey: historyKey(variables.id) });
    },
  });
}

export function useDeleteOrganizationUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOrganizationUnitRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: treeKey });
    },
  });
}
