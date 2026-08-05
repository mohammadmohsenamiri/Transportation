import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmRouteCsvImportRequest,
  createRouteNewVersionRequest,
  createRouteRequest,
  duplicateRouteRequest,
  fetchRouteById,
  fetchRouteStats,
  fetchRoutes,
  patchRouteRequest,
  uploadRouteCsvRequest,
} from "@/features/routes/api";

const routesKey = ["routes", "list"] as const;
const routeStatsKey = ["routes", "summary"] as const;
const routeDetailKey = (id: string) => ["routes", "detail", id] as const;

export function useRoutes(params: { q?: string; isActive?: boolean } = {}) {
  return useQuery({
    queryKey: [...routesKey, params.q ?? "", params.isActive ?? ""],
    queryFn: () => fetchRoutes(params),
  });
}

export function useRouteStats() {
  return useQuery({ queryKey: routeStatsKey, queryFn: fetchRouteStats });
}

export function useRouteDetail(id: string | undefined) {
  return useQuery({
    queryKey: routeDetailKey(id ?? ""),
    queryFn: () => fetchRouteById(id as string),
    enabled: !!id,
  });
}

function invalidateRoutes(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: routesKey });
  queryClient.invalidateQueries({ queryKey: routeStatsKey });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRouteRequest,
    onSuccess: () => invalidateRoutes(queryClient),
  });
}

export function useUploadRouteCsv() {
  return useMutation({ mutationFn: uploadRouteCsvRequest });
}

export function useConfirmRouteCsvImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmRouteCsvImportRequest,
    onSuccess: () => invalidateRoutes(queryClient),
  });
}

export function useCreateRouteNewVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof createRouteNewVersionRequest>[1] }) =>
      createRouteNewVersionRequest(id, payload),
    onSuccess: () => invalidateRoutes(queryClient),
  });
}

export function useDuplicateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { code: string; name: string } }) =>
      duplicateRouteRequest(id, payload),
    onSuccess: () => invalidateRoutes(queryClient),
  });
}

export function usePatchRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { name?: string; description?: string | null; isActive?: boolean };
    }) => patchRouteRequest(id, payload),
    onSuccess: (_data, variables) => {
      invalidateRoutes(queryClient);
      queryClient.invalidateQueries({ queryKey: routeDetailKey(variables.id) });
    },
  });
}
