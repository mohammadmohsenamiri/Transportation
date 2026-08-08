import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addMissionNoteRequest,
  archiveMissionRequest,
  cancelMissionRequest,
  completeMissionRequest,
  createMissionTypeRequest,
  deleteMissionNoteRequest,
  deleteMissionTypeRequest,
  failMissionRequest,
  fetchMissionNotes,
  fetchMissionTypes,
  reopenMissionRequest,
  unarchiveMissionRequest,
  updateMissionTypeRequest,
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
  type MissionTypePayload,
  type MissionUpdatePayload,
} from "@/features/missions/api";
import type { MissionFailureClassificationValue, MissionPersistedStatusValue } from "@/features/missions/types";

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
    mutationFn: ({ id, cancellationReason, version }: { id: string; cancellationReason: string; version: number }) =>
      cancelMissionRequest(id, cancellationReason, version),
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

// ---------------------------------------------------------------------------
// Phase 15 — گذارهای چرخه عمر، یادداشت‌ها و انواع مأموریت
// ---------------------------------------------------------------------------

/**
 * هر گذار علاوه بر فهرست و جزئیات، **صحنه نقشه و فرانما** را هم باطل می‌کند: وضعیت ثبت‌شده
 * تازه، بلافاصله باید در هر چهار مصرف‌کننده دیده شود، وگرنه کاربر یک مأموریت «تکمیل‌شده» را
 * هم‌زمان روی نقشه در حال حرکت می‌بیند.
 */
function invalidateLifecycle(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  invalidateMissions(queryClient);
  queryClient.invalidateQueries({ queryKey: missionDetailKey(id) });
  queryClient.invalidateQueries({ queryKey: missionHistoryKey(id) });
  queryClient.invalidateQueries({ queryKey: ["map"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["shipments"] });
}

export function useCompleteMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      version: number;
      actualArrivalAt: string;
      actualDepartureAt?: string | null;
    }) => completeMissionRequest(id, payload),
    onSuccess: (_data, variables) => invalidateLifecycle(queryClient, variables.id),
  });
}

export function useFailMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      version: number;
      failedAt: string;
      failureReason: string;
      failureClassification: MissionFailureClassificationValue;
    }) => failMissionRequest(id, payload),
    onSuccess: (_data, variables) => invalidateLifecycle(queryClient, variables.id),
  });
}

export function useArchiveMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) => archiveMissionRequest(id, version),
    onSuccess: (_data, variables) => invalidateLifecycle(queryClient, variables.id),
  });
}

export function useUnarchiveMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) => unarchiveMissionRequest(id, version),
    onSuccess: (_data, variables) => invalidateLifecycle(queryClient, variables.id),
  });
}

export function useReopenMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; version: number; reopenReason: string }) =>
      reopenMissionRequest(id, payload),
    onSuccess: (_data, variables) => invalidateLifecycle(queryClient, variables.id),
  });
}

const missionNotesKey = (id: string) => ["missions", "notes", id] as const;

export function useMissionNotes(id: string | null) {
  return useQuery({
    queryKey: missionNotesKey(id ?? ""),
    queryFn: () => fetchMissionNotes(id as string),
    enabled: !!id,
  });
}

export function useAddMissionNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => addMissionNoteRequest(id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: missionNotesKey(variables.id) });
      // شمارنده یادداشت روی DTO مأموریت است.
      queryClient.invalidateQueries({ queryKey: missionDetailKey(variables.id) });
    },
  });
}

export function useDeleteMissionNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, noteId }: { id: string; noteId: string }) => deleteMissionNoteRequest(id, noteId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: missionNotesKey(variables.id) });
      queryClient.invalidateQueries({ queryKey: missionDetailKey(variables.id) });
    },
  });
}

const missionTypesKey = ["mission-types"] as const;

export function useMissionTypes(activeOnly = false) {
  return useQuery({ queryKey: [...missionTypesKey, activeOnly], queryFn: () => fetchMissionTypes(activeOnly) });
}

export function useCreateMissionType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MissionTypePayload) => createMissionTypeRequest(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: missionTypesKey }),
  });
}

export function useUpdateMissionType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MissionTypePayload }) => updateMissionTypeRequest(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: missionTypesKey }),
  });
}

export function useDeleteMissionType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMissionTypeRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: missionTypesKey }),
  });
}
