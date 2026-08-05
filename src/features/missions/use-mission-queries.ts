import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelMissionRequest,
  createMissionDraftRequest,
  deleteMissionRequest,
  duplicateMissionRequest,
  estimateMissionRequest,
  fetchMissionById,
  fetchMissionHistory,
  fetchMissionSummary,
  fetchMissions,
  publishMissionRequest,
  updateMissionRequest,
  type MissionCreatePayload,
  type MissionUpdatePayload,
} from "@/features/missions/api";
import type { MissionPersistedStatusValue } from "@/features/missions/types";

const missionsKey = ["missions", "list"] as const;
const missionSummaryKey = ["missions", "summary"] as const;
const missionDetailKey = (id: string) => ["missions", "detail", id] as const;
const missionHistoryKey = (id: string) => ["missions", "history", id] as const;

export function useMissions(params: { q?: string; persistedStatus?: MissionPersistedStatusValue; vehicleId?: string } = {}) {
  return useQuery({
    queryKey: [...missionsKey, params.q ?? "", params.persistedStatus ?? "", params.vehicleId ?? ""],
    queryFn: () => fetchMissions(params),
  });
}

export function useMissionSummary() {
  return useQuery({ queryKey: missionSummaryKey, queryFn: fetchMissionSummary });
}

export function useMissionDetail(id: string | undefined) {
  return useQuery({ queryKey: missionDetailKey(id ?? ""), queryFn: () => fetchMissionById(id as string), enabled: !!id });
}

export function useMissionHistory(id: string | null) {
  return useQuery({
    queryKey: missionHistoryKey(id ?? ""),
    queryFn: () => fetchMissionHistory(id as string),
    enabled: id !== null,
    staleTime: 0,
  });
}

export function useEstimateMission() {
  return useMutation({ mutationFn: estimateMissionRequest });
}

function invalidateMissions(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: missionsKey });
  queryClient.invalidateQueries({ queryKey: missionSummaryKey });
}

export function useCreateMissionDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MissionCreatePayload) => createMissionDraftRequest(payload),
    onSuccess: () => invalidateMissions(queryClient),
  });
}

export function useUpdateMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MissionUpdatePayload }) => updateMissionRequest(id, payload),
    onSuccess: (_data, variables) => {
      invalidateMissions(queryClient);
      queryClient.invalidateQueries({ queryKey: missionDetailKey(variables.id) });
      queryClient.invalidateQueries({ queryKey: missionHistoryKey(variables.id) });
    },
  });
}

export function useDeleteMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMissionRequest(id),
    onSuccess: () => invalidateMissions(queryClient),
  });
}

export function usePublishMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishMissionRequest(id),
    onSuccess: (_data, id) => {
      invalidateMissions(queryClient);
      queryClient.invalidateQueries({ queryKey: missionDetailKey(id) });
      queryClient.invalidateQueries({ queryKey: missionHistoryKey(id) });
    },
  });
}

export function useCancelMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cancellationReason }: { id: string; cancellationReason: string }) => cancelMissionRequest(id, cancellationReason),
    onSuccess: (_data, variables) => {
      invalidateMissions(queryClient);
      queryClient.invalidateQueries({ queryKey: missionDetailKey(variables.id) });
      queryClient.invalidateQueries({ queryKey: missionHistoryKey(variables.id) });
    },
  });
}

export function useDuplicateMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, startAt }: { id: string; startAt: string }) => duplicateMissionRequest(id, startAt),
    onSuccess: () => invalidateMissions(queryClient),
  });
}
