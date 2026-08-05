import { useQuery } from "@tanstack/react-query";
import { fetchActiveMapProvider, fetchOrgUnitsForMap } from "@/features/map/api";

export function useActiveMapProvider() {
  return useQuery({ queryKey: ["map", "active-provider"], queryFn: fetchActiveMapProvider });
}

export function useOrgUnitsForMap() {
  return useQuery({ queryKey: ["map", "organization-units"], queryFn: fetchOrgUnitsForMap });
}
