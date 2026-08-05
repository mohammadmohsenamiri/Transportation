export interface GeoPoint {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two points in meters (Haversine formula). Pure and deterministic. */
export function haversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
  return EARTH_RADIUS_METERS * c;
}

export interface RouteDistanceResult {
  /** به همان طول و ترتیب points؛ عنصر اول همیشه صفر است */
  cumulativeDistancesMeters: number[];
  totalDistanceMeters: number;
}

/** فاصله تجمعی هر نقطه و فاصله کل مسیر را محاسبه می‌کند. تابع pure بدون side effect. */
export function computeRouteDistances(points: readonly GeoPoint[]): RouteDistanceResult {
  if (points.length === 0) {
    return { cumulativeDistancesMeters: [], totalDistanceMeters: 0 };
  }

  const cumulativeDistancesMeters: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineDistanceMeters(points[i - 1], points[i]);
    cumulativeDistancesMeters.push(total);
  }

  return { cumulativeDistancesMeters, totalDistanceMeters: total };
}
