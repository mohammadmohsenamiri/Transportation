import type { OrganizationLevelValue } from "@/features/organization/level-labels";
import type { MissionDisplayStatusValue } from "@/features/missions/types";

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

export interface MapSceneMission {
  missionId: string;
  code: string;
  vehicleId: string;
  vehicleIdentifier: string;
  vehicleTypeName: string;
  status: MissionDisplayStatusValue;
  position: { latitude: number; longitude: number };
  bearingDegrees: number | null;
  progressRatio: number;
  isFallbackDirect: boolean;
  isEstimated: true;
  startAt: string;
  estimatedArrivalAt: string;
  remainingSeconds: number;
  originTitle: string;
  originLatitude: number;
  originLongitude: number;
  destinationTitle: string;
  destinationLatitude: number;
  destinationLongitude: number;
  routeId: string | null;
  cargoTypeNames: string[];
  shipmentCount: number;
  shipmentTrackingCodes: string[];
  /** Phase 14 — آیکن تعیین‌شده خودرو؛ `null` یعنی نشانگر دایره‌ای پیش‌فرض. */
  iconUrl: string | null;
}

export interface MapScene {
  viewTime: string;
  missions: MapSceneMission[];
}
