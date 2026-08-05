import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createShipmentRequest,
  deleteShipmentRequest,
  fetchShipmentById,
  fetchShipmentHistory,
  fetchShipmentSummary,
  fetchShipments,
  updateShipmentRequest,
  type ShipmentPayload,
  type ShipmentUpdatePayload,
} from "@/features/shipments/api";

const shipmentsKey = ["shipments", "list"] as const;
const shipmentSummaryKey = ["shipments", "summary"] as const;
const shipmentDetailKey = (id: string) => ["shipments", "detail", id] as const;
const shipmentHistoryKey = (id: string) => ["shipments", "history", id] as const;

export function useShipments(
  params: { q?: string; status?: string; cargoTypeId?: string; originWarehouseId?: string } = {},
) {
  return useQuery({
    queryKey: [...shipmentsKey, params.q ?? "", params.status ?? "", params.cargoTypeId ?? "", params.originWarehouseId ?? ""],
    queryFn: () => fetchShipments(params),
  });
}

export function useShipmentSummary() {
  return useQuery({ queryKey: shipmentSummaryKey, queryFn: fetchShipmentSummary });
}

export function useShipmentDetail(id: string | undefined) {
  return useQuery({
    queryKey: shipmentDetailKey(id ?? ""),
    queryFn: () => fetchShipmentById(id as string),
    enabled: !!id,
  });
}

export function useShipmentHistory(id: string | null) {
  return useQuery({
    queryKey: shipmentHistoryKey(id ?? ""),
    queryFn: () => fetchShipmentHistory(id as string),
    enabled: id !== null,
    staleTime: 0,
  });
}

function invalidateShipments(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: shipmentsKey });
  queryClient.invalidateQueries({ queryKey: shipmentSummaryKey });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ShipmentPayload) => createShipmentRequest(payload),
    onSuccess: () => invalidateShipments(queryClient),
  });
}

export function useUpdateShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ShipmentUpdatePayload }) => updateShipmentRequest(id, payload),
    onSuccess: (_data, variables) => {
      invalidateShipments(queryClient);
      queryClient.invalidateQueries({ queryKey: shipmentDetailKey(variables.id) });
      queryClient.invalidateQueries({ queryKey: shipmentHistoryKey(variables.id) });
    },
  });
}

export function useDeleteShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteShipmentRequest(id),
    onSuccess: () => invalidateShipments(queryClient),
  });
}
