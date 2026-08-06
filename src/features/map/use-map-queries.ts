import { useQuery } from "@tanstack/react-query";
import { fetchActiveMapProvider, fetchMapScene, fetchOrgUnitsForMap } from "@/features/map/api";

export function useActiveMapProvider() {
  return useQuery({ queryKey: ["map", "active-provider"], queryFn: fetchActiveMapProvider });
}

export function useOrgUnitsForMap() {
  return useQuery({ queryKey: ["map", "organization-units"], queryFn: fetchOrgUnitsForMap });
}

const MAP_SCENE_REFRESH_INTERVAL_MS = 5000;

/**
 * صحنه نقشه (فاز ۱۰): بدون viewTime همیشه «الان» را می‌خواند (نمای زنده محاسباتی) و با بازه
 * کنترل‌شده refetch می‌شود؛ هیچ موقعیتی در این لایه در DB ذخیره نمی‌شود (CLAUDE.md §2).
 */
export function useMapScene(viewTime?: string) {
  return useQuery({
    queryKey: ["map", "scene", viewTime ?? "live"],
    queryFn: () => fetchMapScene(viewTime),
    refetchInterval: viewTime ? false : MAP_SCENE_REFRESH_INTERVAL_MS,
  });
}
