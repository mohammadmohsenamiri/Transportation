export type RouteSourceValue = "CSV" | "MAP_DRAWING";

export interface RouteSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  source: RouteSourceValue;
  version: number;
  isActive: boolean;
  pointCount: number;
  totalDistanceMeters: number;
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoutePoint {
  sequence: number;
  latitude: number;
  longitude: number;
  label: string | null;
  cumulativeDistanceMeters: number;
}

export interface RouteDetail extends RouteSummary {
  points: RoutePoint[];
}

export interface RouteStats {
  total: number;
  active: number;
  inactive: number;
  avgDistanceMeters: number;
}

export interface RouteCsvRowError {
  row: number;
  message: string;
}

export interface RouteCsvPreview {
  previewToken: string | null;
  points: { sequence: number; latitude: number; longitude: number; label: string | null }[];
  pointCount: number;
  totalDistanceMeters: number;
  headerError: string | null;
  rowErrors: RouteCsvRowError[];
  canConfirm: boolean;
}
