import { computeRouteDistances, haversineDistanceMeters, type GeoPoint } from "@/lib/geo/distance";

export interface MissionEstimateInput {
  origin: GeoPoint;
  destination: GeoPoint;
  speedKmh: number;
  /** نقاط مسیر مرتب‌شده بر اساس sequence؛ در صورت نبود یا کمتر از دو نقطه، فاصله مستقیم geodesic استفاده می‌شود (ADR-011). */
  routePoints?: readonly GeoPoint[];
  fuelConsumptionPer100Km?: number | null;
}

export interface MissionEstimateResult {
  distanceMeters: number;
  durationSeconds: number;
  isFallbackDirect: boolean;
  estimatedFuelLiters: number | null;
}

/** تابع pure و deterministic؛ ورودی یکسان همیشه خروجی یکسان می‌دهد. */
export function estimateMission(input: MissionEstimateInput): MissionEstimateResult {
  const hasRoute = !!input.routePoints && input.routePoints.length >= 2;
  const distanceMeters = hasRoute
    ? computeRouteDistances(input.routePoints!).totalDistanceMeters
    : haversineDistanceMeters(input.origin, input.destination);

  const speedMetersPerSecond = (input.speedKmh * 1000) / 3600;
  const durationSeconds = speedMetersPerSecond > 0 ? distanceMeters / speedMetersPerSecond : 0;

  const estimatedFuelLiters =
    input.fuelConsumptionPer100Km != null
      ? (distanceMeters / 1000) * (input.fuelConsumptionPer100Km / 100)
      : null;

  return { distanceMeters, durationSeconds, isFallbackDirect: !hasRoute, estimatedFuelLiters };
}
