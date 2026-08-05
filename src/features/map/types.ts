import type { OrganizationLevelValue } from "@/features/organization/level-labels";

export interface OrgMapMarker {
  id: string;
  code: string;
  name: string;
  level: OrganizationLevelValue;
  latitude: number;
  longitude: number;
}

export type MapProviderKind = "INTERNAL_TMS" | "INTERNAL_XYZ" | "INTERNAL_WMTS" | "EXTERNAL_XYZ";

export interface ActiveMapProvider {
  id: string;
  name: string;
  kind: MapProviderKind;
  urlTemplate: string;
  attribution: string | null;
  minZoom: number;
  maxZoom: number;
  tileSize: number;
  subdomains: string[] | null;
}
