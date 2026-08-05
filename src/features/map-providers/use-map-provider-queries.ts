import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMapProviderRequest,
  deleteMapProviderRequest,
  fetchMapProviders,
  testMapProviderConnectionRequest,
  updateMapProviderRequest,
  type MapProviderPayload,
  type MapProviderUpdatePayload,
} from "@/features/map-providers/api";

const mapProvidersKey = ["map-providers"] as const;

export function useMapProviders() {
  return useQuery({ queryKey: mapProvidersKey, queryFn: fetchMapProviders });
}

export function useCreateMapProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MapProviderPayload) => createMapProviderRequest(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mapProvidersKey }),
  });
}

export function useUpdateMapProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MapProviderUpdatePayload }) =>
      updateMapProviderRequest(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mapProvidersKey }),
  });
}

export function useDeleteMapProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMapProviderRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mapProvidersKey }),
  });
}

export function useTestMapProviderConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => testMapProviderConnectionRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mapProvidersKey }),
  });
}
