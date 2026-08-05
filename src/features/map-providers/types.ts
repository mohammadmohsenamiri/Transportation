export type MapProviderKind = "INTERNAL_TMS" | "INTERNAL_XYZ" | "INTERNAL_WMTS" | "EXTERNAL_XYZ";
export type MapProviderHealthStatus = "UNKNOWN" | "HEALTHY" | "UNHEALTHY";

export interface MapProvider {
  id: string;
  name: string;
  kind: MapProviderKind;
  urlTemplate: string;
  attribution: string | null;
  minZoom: number;
  maxZoom: number;
  tileSize: number;
  subdomains: string[] | null;
  requiresApiKey: boolean;
  secretReference: string | null;
  isDefault: boolean;
  isEnabled: boolean;
  healthStatus: MapProviderHealthStatus;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latencyMs: number | null;
  httpStatus: number | null;
}
