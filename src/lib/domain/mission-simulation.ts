import { haversineDistanceMeters, type GeoPoint } from "@/lib/geo/distance";
import { deriveMissionDisplayStatus, type MissionDisplayStatus } from "@/lib/domain/mission-rules";

export interface SimulationRoutePoint {
  sequence: number;
  latitude: number;
  longitude: number;
  cumulativeDistanceMeters: number;
}

export interface MissionGeometryInput {
  viewTime: Date;
  startAt: Date;
  speedKmh: number;
  origin: GeoPoint;
  destination: GeoPoint;
  /** مرتب‌شده بر اساس sequence؛ پیش‌شرط caller است، در این تابع بررسی/مرتب نمی‌شود (Phase 9 دومان، EC-8). */
  routePoints?: readonly SimulationRoutePoint[];
}

export interface MissionGeometryResult {
  position: GeoPoint;
  progressRatio: number;
  traveledMeters: number;
  remainingMeters: number;
  totalDistanceMeters: number;
  estimatedArrivalAt: Date;
  remainingSeconds: number;
  bearingDegrees: number | null;
  isFallbackDirect: boolean;
}

export interface MissionSnapshot {
  startAt: Date;
  estimatedArrivalAt: Date;
  speedKmh: number;
  persistedStatus: "DRAFT" | "SCHEDULED" | "CANCELLED" | "ARCHIVED";
  cancelledAt: Date | null;
  origin: GeoPoint;
  destination: GeoPoint;
  routePoints?: readonly SimulationRoutePoint[];
}

export interface MissionSimulationResult extends MissionGeometryResult {
  status: MissionDisplayStatus;
  isEstimated: true;
}

interface EffectivePoints {
  points: readonly SimulationRoutePoint[];
  isFallbackDirect: boolean;
}

/** الگوریتم ۱ (05-IMPLEMENTATION.md §3): وقتی مسیر کمتر از دو نقطه دارد، خط مستقیم geodesic به‌عنوان مسیر دونقطه‌ای ساخته می‌شود (ADR-011، EC-7). */
function resolveEffectivePoints(
  origin: GeoPoint,
  destination: GeoPoint,
  routePoints: readonly SimulationRoutePoint[] | undefined,
): EffectivePoints {
  if (!routePoints || routePoints.length < 2) {
    const directDistance = haversineDistanceMeters(origin, destination);
    return {
      points: [
        { sequence: 0, latitude: origin.latitude, longitude: origin.longitude, cumulativeDistanceMeters: 0 },
        { sequence: 1, latitude: destination.latitude, longitude: destination.longitude, cumulativeDistanceMeters: directDistance },
      ],
      isFallbackDirect: true,
    };
  }
  return { points: routePoints, isFallbackDirect: false };
}

/** الگوریتم ۲ (05-IMPLEMENTATION.md §4). */
function computeTraveledMeters(viewTime: Date, startAt: Date, speedKmh: number, totalDistanceMeters: number): number {
  const elapsedSeconds = Math.max(0, (viewTime.getTime() - startAt.getTime()) / 1000);
  const speedMetersPerSecond = (speedKmh * 1000) / 3600;
  if (speedMetersPerSecond <= 0) {
    // EC-6: دفاعی؛ در عمل هرگز رخ نمی‌دهد چون انتشار مأموریت سرعت مثبت را تضمین می‌کند (فاز ۷).
    return elapsedSeconds > 0 ? totalDistanceMeters : 0;
  }
  return Math.min(totalDistanceMeters, elapsedSeconds * speedMetersPerSecond);
}

/** الگوریتم ۳ (05-IMPLEMENTATION.md §5): binary search — «آخرین segment که شروعش <= traveledMeters باشد». */
function findSegmentIndex(cumulativeDistances: readonly number[], traveledMeters: number): number {
  const n = cumulativeDistances.length;
  if (traveledMeters >= cumulativeDistances[n - 1]) {
    return n - 2; // EC-2/EC-4: رسیدن دقیق یا بعد از آن — به آخرین segment واقعی clamp می‌شود
  }

  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (cumulativeDistances[mid] <= traveledMeters) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return Math.max(0, lo - 1);
}

/** الگوریتم ۴ (05-IMPLEMENTATION.md §6): interpolation خطی lat/lng (نه geodesic-exact؛ ADR-P9-02). */
function interpolatePosition(pointA: GeoPoint, pointB: GeoPoint, distA: number, distB: number, traveledMeters: number): GeoPoint {
  if (distB === distA) {
    return { latitude: pointA.latitude, longitude: pointA.longitude }; // EC-13: segment صفرطول
  }
  const t = (traveledMeters - distA) / (distB - distA);
  return {
    latitude: pointA.latitude + t * (pointB.latitude - pointA.latitude),
    longitude: pointA.longitude + t * (pointB.longitude - pointA.longitude),
  };
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** الگوریتم ۵ (05-IMPLEMENTATION.md §7): initial forward azimuth؛ برای نقاط یکسان undefined است (null). */
function computeBearingDegrees(pointA: GeoPoint, pointB: GeoPoint): number | null {
  if (pointA.latitude === pointB.latitude && pointA.longitude === pointB.longitude) {
    return null;
  }
  const lat1 = toRadians(pointA.latitude);
  const lat2 = toRadians(pointB.latitude);
  const deltaLon = toRadians(pointB.longitude - pointA.longitude);
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  const theta = Math.atan2(y, x);
  return (toDegrees(theta) + 360) % 360;
}

/**
 * برای بearing، اگر segment جاری صفرطول باشد (EC-13)، تا اولین segment غیرصفر جلو می‌رویم؛
 * اگر هیچ‌کدام از segmentهای باقی‌مانده طول غیرصفر نداشته باشند، null برمی‌گردد.
 */
function findBearingSegmentIndex(cumulativeDistances: readonly number[], fromIndex: number): number | null {
  for (let i = fromIndex; i < cumulativeDistances.length - 1; i += 1) {
    if (cumulativeDistances[i] !== cumulativeDistances[i + 1]) {
      return i;
    }
  }
  return null;
}

/** الگوریتم ۶ (05-IMPLEMENTATION.md §8). */
function computeEstimatedArrivalAt(startAt: Date, totalDistanceMeters: number, speedKmh: number): Date {
  const speedMetersPerSecond = (speedKmh * 1000) / 3600;
  if (speedMetersPerSecond <= 0) {
    return new Date(startAt.getTime());
  }
  const durationSeconds = totalDistanceMeters / speedMetersPerSecond;
  return new Date(startAt.getTime() + durationSeconds * 1000);
}

function computeRemainingSeconds(viewTime: Date, estimatedArrivalAt: Date): number {
  return Math.max(0, (estimatedArrivalAt.getTime() - viewTime.getTime()) / 1000);
}

/**
 * تابع pure و deterministic هسته موتور شبیه‌سازی (Phase 9). بدون I/O، بدون Date.now()،
 * بدون وابستگی به React/Next.js/کتابخانه نقشه. جزئیات کامل الگوریتم:
 * docs/phase-09-simulation-engine/05-IMPLEMENTATION.md
 */
export function calculateMissionGeometry(input: MissionGeometryInput): MissionGeometryResult {
  const { points, isFallbackDirect } = resolveEffectivePoints(input.origin, input.destination, input.routePoints);
  const cumulativeDistances = points.map((p) => p.cumulativeDistanceMeters);
  const totalDistanceMeters = cumulativeDistances[cumulativeDistances.length - 1];

  const traveledMeters = computeTraveledMeters(input.viewTime, input.startAt, input.speedKmh, totalDistanceMeters);
  const remainingMeters = totalDistanceMeters - traveledMeters;

  let position: GeoPoint;
  let bearingDegrees: number | null;
  let progressRatio: number;

  if (totalDistanceMeters === 0) {
    position = { latitude: points[0].latitude, longitude: points[0].longitude };
    bearingDegrees = null; // EC-5
    progressRatio = 1;
  } else {
    const segmentIndex = findSegmentIndex(cumulativeDistances, traveledMeters);
    const pointA = points[segmentIndex];
    const pointB = points[segmentIndex + 1];
    position = interpolatePosition(pointA, pointB, cumulativeDistances[segmentIndex], cumulativeDistances[segmentIndex + 1], traveledMeters);

    const bearingSegmentIndex = findBearingSegmentIndex(cumulativeDistances, segmentIndex);
    bearingDegrees = bearingSegmentIndex === null ? null : computeBearingDegrees(points[bearingSegmentIndex], points[bearingSegmentIndex + 1]);

    progressRatio = traveledMeters / totalDistanceMeters;
  }

  const estimatedArrivalAt = computeEstimatedArrivalAt(input.startAt, totalDistanceMeters, input.speedKmh);
  const remainingSeconds = computeRemainingSeconds(input.viewTime, estimatedArrivalAt);

  return {
    position,
    progressRatio,
    traveledMeters,
    remainingMeters,
    totalDistanceMeters,
    estimatedArrivalAt,
    remainingSeconds,
    bearingDegrees,
    isFallbackDirect,
  };
}

/**
 * لایه orchestration: وضعیت را از deriveMissionDisplayStatus فاز ۷ (بدون تغییر) می‌گیرد، سپس
 * فقط برای هندسه viewTime را در صورت CANCELLED/ARCHIVED clamp می‌کند (ADR-P9-07). وضعیت همیشه
 * از viewTime خام مشتق می‌شود، نه زمان clamp‌شده.
 */
export function simulateMissionPosition(mission: MissionSnapshot, viewTime: Date): MissionSimulationResult {
  const status = deriveMissionDisplayStatus(
    { persistedStatus: mission.persistedStatus, startAt: mission.startAt, estimatedArrivalAt: mission.estimatedArrivalAt },
    viewTime,
  );

  let effectiveViewTime = viewTime;
  if (status === "CANCELLED" && mission.cancelledAt) {
    effectiveViewTime = new Date(Math.min(viewTime.getTime(), mission.cancelledAt.getTime()));
  } else if (status === "ARCHIVED") {
    effectiveViewTime = mission.estimatedArrivalAt; // EC-11: دفاعی/آماده آینده — هنوز مسیر واقعی برای این وضعیت وجود ندارد
  }

  const geometry = calculateMissionGeometry({
    viewTime: effectiveViewTime,
    startAt: mission.startAt,
    speedKmh: mission.speedKmh,
    origin: mission.origin,
    destination: mission.destination,
    routePoints: mission.routePoints,
  });

  return { ...geometry, status, isEstimated: true };
}
