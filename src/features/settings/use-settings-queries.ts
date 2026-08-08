import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchSettings,
  resetSettingRequest,
  updateSettingsRequest,
  type SettingChange,
} from "@/features/settings/api";

const settingsKey = ["settings"] as const;

export function useSettings() {
  return useQuery({ queryKey: settingsKey, queryFn: fetchSettings });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: SettingChange[]) => updateSettingsRequest(changes),
    // پاسخ خودش فهرست تازه است، پس مستقیم در کش می‌نشیند و یک رفت‌وبرگشت اضافه حذف می‌شود.
    onSuccess: (items) => queryClient.setQueryData(settingsKey, items),
  });
}

export function useResetSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, version }: { key: string; version: number }) => resetSettingRequest(key, version),
    onSuccess: (items) => queryClient.setQueryData(settingsKey, items),
  });
}
