import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchAuditActions, fetchAuditEntries, type AuditListParams } from "@/features/audit/api";

const auditKey = ["audit"] as const;

export function useAuditEntries(params: AuditListParams) {
  return useQuery({
    queryKey: [...auditKey, params],
    queryFn: () => fetchAuditEntries(params),
    placeholderData: keepPreviousData,
  });
}

export function useAuditActions() {
  return useQuery({
    queryKey: [...auditKey, "actions"],
    queryFn: fetchAuditActions,
    // فهرست کنش‌ها تقریباً ثابت است؛ واکشی مکرر آن فقط بار اضافه روی DB می‌گذارد.
    staleTime: 5 * 60 * 1000,
  });
}
