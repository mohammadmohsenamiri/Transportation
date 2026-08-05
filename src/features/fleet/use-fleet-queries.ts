import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCargoTypeRequest,
  createVehicleRequest,
  createVehicleTypeRequest,
  deleteCargoTypeRequest,
  deleteVehicleRequest,
  deleteVehicleTypeRequest,
  fetchCargoTypes,
  fetchFleetSummary,
  fetchVehicleTypes,
  fetchVehicles,
  updateCargoTypeRequest,
  updateVehicleRequest,
  updateVehicleTypeRequest,
  type CatalogTypePayload,
  type CatalogTypeUpdatePayload,
  type VehiclePayload,
  type VehicleUpdatePayload,
} from "@/features/fleet/api";

const vehicleTypesKey = ["fleet", "vehicle-types"] as const;
const cargoTypesKey = ["fleet", "cargo-types"] as const;
const vehiclesKey = ["fleet", "vehicles"] as const;
const fleetSummaryKey = ["fleet", "summary"] as const;

export function useVehicleTypes(q?: string) {
  return useQuery({ queryKey: [...vehicleTypesKey, q ?? ""], queryFn: () => fetchVehicleTypes(q) });
}

export function useCreateVehicleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CatalogTypePayload) => createVehicleTypeRequest(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleTypesKey }),
  });
}

export function useUpdateVehicleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CatalogTypeUpdatePayload }) =>
      updateVehicleTypeRequest(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleTypesKey }),
  });
}

export function useDeleteVehicleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVehicleTypeRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleTypesKey }),
  });
}

export function useCargoTypes(q?: string) {
  return useQuery({ queryKey: [...cargoTypesKey, q ?? ""], queryFn: () => fetchCargoTypes(q) });
}

export function useCreateCargoType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CatalogTypePayload) => createCargoTypeRequest(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cargoTypesKey }),
  });
}

export function useUpdateCargoType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CatalogTypeUpdatePayload }) =>
      updateCargoTypeRequest(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cargoTypesKey }),
  });
}

export function useDeleteCargoType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCargoTypeRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cargoTypesKey }),
  });
}

export function useVehicles(params: { q?: string; vehicleTypeId?: string; readiness?: string } = {}) {
  return useQuery({
    queryKey: [...vehiclesKey, params.q ?? "", params.vehicleTypeId ?? "", params.readiness ?? ""],
    queryFn: () => fetchVehicles(params),
  });
}

export function useFleetSummary() {
  return useQuery({ queryKey: fleetSummaryKey, queryFn: fetchFleetSummary });
}

function invalidateFleet(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: vehiclesKey });
  queryClient.invalidateQueries({ queryKey: fleetSummaryKey });
  queryClient.invalidateQueries({ queryKey: vehicleTypesKey });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VehiclePayload) => createVehicleRequest(payload),
    onSuccess: () => invalidateFleet(queryClient),
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: VehicleUpdatePayload }) =>
      updateVehicleRequest(id, payload),
    onSuccess: () => invalidateFleet(queryClient),
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVehicleRequest(id),
    onSuccess: () => invalidateFleet(queryClient),
  });
}
