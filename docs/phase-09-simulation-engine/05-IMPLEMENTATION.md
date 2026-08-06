# 05 — Implementation Specification

This document is the algorithmic source of truth. Where this document and any other document disagree on a formula, **this document wins** (except [03-DOMAIN.md](./03-DOMAIN.md) for type shapes, which this document must match exactly).

## 1. File Layout

```text
src/lib/domain/mission-simulation.ts   # NEW — pure engine (this document's main subject)
src/server/services/simulation-service.ts  # NEW — DB loader
src/app/api/v1/missions/[id]/simulate/route.ts  # NEW — thin HTTP handler
tests/unit/mission-simulation.test.ts  # NEW — see 08-TESTS.md
```

## 2. Public Surface of `src/lib/domain/mission-simulation.ts`

```ts
import type { GeoPoint } from "@/lib/geo/distance";
import { haversineDistanceMeters } from "@/lib/geo/distance";
import { deriveMissionDisplayStatus, type MissionDisplayStatus } from "@/lib/domain/mission-rules";

export interface SimulationRoutePoint { sequence: number; latitude: number; longitude: number; cumulativeDistanceMeters: number; }

export interface MissionGeometryInput {
  viewTime: Date;
  startAt: Date;
  speedKmh: number;
  origin: GeoPoint;
  destination: GeoPoint;
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

export function calculateMissionGeometry(input: MissionGeometryInput): MissionGeometryResult;
export function simulateMissionPosition(mission: MissionSnapshot, viewTime: Date): MissionSimulationResult;
```

No other export. Internal helper functions (§4–§6 below) are **not exported** — they are implementation details of this module.

## 3. Algorithm 1 — Effective Route Resolution

**Purpose:** turn "maybe a route, maybe not" into a single uniform polyline representation.

**Pseudocode:**

```text
function resolveEffectivePoints(origin, destination, routePoints):
    if routePoints is undefined or routePoints.length < 2:
        directDistance = haversineDistanceMeters(origin, destination)
        return {
            points: [
                { sequence: 0, ...origin, cumulativeDistanceMeters: 0 },
                { sequence: 1, ...destination, cumulativeDistanceMeters: directDistance }
            ],
            isFallbackDirect: true
        }
    else:
        return { points: routePoints, isFallbackDirect: false }
```

**Complexity:** `O(1)` when falling back (one Haversine call), `O(1)` when a route is supplied (no copy — the input array is reused by reference).

**Covers:** FR-7, FR-8, EC-7.

## 4. Algorithm 2 — Traveled Distance

**Pseudocode:**

```text
function computeTraveledMeters(viewTime, startAt, speedKmh, totalDistanceMeters):
    elapsedSeconds = max(0, (viewTime.getTime() - startAt.getTime()) / 1000)
    speedMetersPerSecond = speedKmh * 1000 / 3600
    if speedMetersPerSecond <= 0:
        # EC-6: defensive only, never expected in production (Phase 7 guarantees speed > 0 for SCHEDULED)
        return elapsedSeconds > 0 ? totalDistanceMeters : 0
    return min(totalDistanceMeters, elapsedSeconds * speedMetersPerSecond)
```

**Complexity:** `O(1)`.

**Covers:** FR-1–FR-3, EC-1–EC-4, EC-6.

## 5. Algorithm 3 — Segment Location (Binary Search)

**Purpose:** given `traveledMeters` and the effective points' cumulative-distance array, find the segment `[i, i+1]` such that `cumulative[i] <= traveledMeters <= cumulative[i+1]`.

**Pseudocode:**

```text
function findSegmentIndex(cumulativeDistances, traveledMeters):
    # cumulativeDistances: number[], length n, sorted ascending, cumulativeDistances[0] == 0
    # Returns i such that cumulativeDistances[i] <= traveledMeters <= cumulativeDistances[i+1],
    # with 0 <= i <= n-2 (n-2 is the last valid segment start index).
    # Uses "last segment whose start is <= traveledMeters" (upper-bound-minus-one), which
    # correctly resolves exact-boundary ties toward the LATER segment except at the very end,
    # where it clamps to the final segment so an exact-arrival traveledMeters still yields a
    # well-defined bearing from the last real segment rather than a zero-length phantom segment.

    if traveledMeters >= cumulativeDistances[n-1]:
        return n - 2   # clamp to final segment (arrival case, EC-2/EC-4)

    lo = 0
    hi = n - 1
    while lo < hi:
        mid = floor((lo + hi) / 2)
        if cumulativeDistances[mid] <= traveledMeters:
            lo = mid + 1
        else:
            hi = mid
    # lo is now the index of the first point whose cumulative distance is STRICTLY GREATER
    # than traveledMeters (standard upper_bound). The segment start is lo - 1.
    return max(0, lo - 1)
```

**Complexity:** `O(log n)` where `n` = number of effective points (2 for fallback, up to 10,000 for a full route per Phase 5's CSV ceiling).

**Worked example:** `cumulativeDistances = [0, 100, 250, 400]`, `traveledMeters = 250` → exact match on `cumulative[2]`. `upper_bound(250)` finds the first index whose value is `> 250`, which is index 3 (value 400). `lo = 3`, segment start `= lo - 1 = 2`. Segment is `[2,3]` (the segment *starting* at the point the vehicle just reached), so the reported bearing is the direction the vehicle is *about to travel next* at that exact boundary instant — this is the defined, documented tie-break (see [02-REQUIREMENTS.md](./02-REQUIREMENTS.md) EC-13 cross-reference). If `traveledMeters = 400` (exact arrival, last point), the `>= cumulativeDistances[n-1]` branch fires first and clamps to segment `[2,3]` (the last real segment) rather than an out-of-bounds `[3,4]`.

**Covers:** FR-1, FR-6, FR-7, EC-13.

## 6. Algorithm 4 — Position Interpolation (Linear lat/lng)

**Pseudocode:**

```text
function interpolatePosition(pointA, pointB, distA, distB, traveledMeters):
    if distB == distA:  # zero-length segment (EC-13)
        return pointA  # (== pointB, coordinates identical by construction)
    t = (traveledMeters - distA) / (distB - distA)   # t in [0, 1]
    lat = pointA.latitude + t * (pointB.latitude - pointA.latitude)
    lng = pointA.longitude + t * (pointB.longitude - pointA.longitude)
    return { latitude: lat, longitude: lng }
```

**Method:** planar linear interpolation of latitude/longitude, **not** great-circle ("slerp") interpolation. This is an explicit, documented choice — see ADR-P9-02.

**Precision bound:** for segment lengths under ~10 km (the typical distance between two consecutive route points drawn or CSV-imported per Phase 5), the deviation between linear lat/lng interpolation and true geodesic interpolation is **under 1 meter** at mid-latitudes (this bound narrows further as segment length decreases; it widens for very long segments — e.g. a route with only 2 points spanning hundreds of km, which is exactly the direct-fallback case). For the direct-fallback case (potentially a very long single segment, e.g. Tehran–Bandar Abbas ≈ 900 km), the deviation can reach single-digit kilometers at the segment's midpoint — this is judged acceptable because: (a) the product already labels this state `isFallbackDirect: true` and shows it as a dashed line (Phase 10), signaling to the user that this is a coarse approximation, not a real route; (b) `docs/ARCHITECTURE_AND_DATA_MODEL.md` §5 explicitly accepts linear interpolation as sufficient. This precision trade-off must be re-evaluated (per ADR-P9-02) only if the product later requires precise fallback-direct visualization at intercontinental scale, which is not a stated requirement.

**Complexity:** `O(1)`.

**Covers:** FR-1, FR-7, FR-8, EC-13.

## 7. Algorithm 5 — Bearing (Initial Forward Azimuth)

**Formula (standard great-circle initial bearing):**

```text
function bearingDegrees(pointA, pointB):
    if pointA.latitude == pointB.latitude and pointA.longitude == pointB.longitude:
        return null   # EC-5 / EC-13: undefined direction for a zero-length segment
    lat1 = toRadians(pointA.latitude)
    lat2 = toRadians(pointB.latitude)
    deltaLon = toRadians(pointB.longitude - pointA.longitude)
    y = sin(deltaLon) * cos(lat2)
    x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(deltaLon)
    theta = atan2(y, x)
    return (toDegrees(theta) + 360) mod 360   # normalize to [0, 360)
```

**Which two points are passed in:** the segment endpoints found by Algorithm 3 (the bracketing segment for the current `traveledMeters`), **not** the raw origin/destination. This means bearing changes as the vehicle moves along a multi-point route (turn-by-turn direction), which is the correct, expected behavior for a route with waypoints.

**Zero-length-segment fallback:** if the bracketing segment found by Algorithm 3 happens to be zero-length (EC-13, two identical consecutive points), the implementation MUST walk forward to the next segment with non-zero length to compute bearing, and if none exists (every remaining segment is zero-length, i.e. all remaining points coincide), return `null`. This is a documented refinement of Algorithm 3's output, applied only for bearing, not for position (position interpolation at a zero-length segment correctly returns that point's coordinates regardless).

**Complexity:** `O(1)` amortized (the zero-length-segment walk-forward is bounded by the number of consecutive duplicate points, which is pathological/rare input, not the common case).

**Covers:** FR-6, EC-5, EC-13.

## 8. Algorithm 6 — ETA and Remaining Time

**Pseudocode:**

```text
function computeEta(startAt, totalDistanceMeters, speedKmh):
    speedMetersPerSecond = speedKmh * 1000 / 3600
    if speedMetersPerSecond <= 0:
        return startAt   # EC-6 degenerate case: immediate "arrival"
    durationSeconds = totalDistanceMeters / speedMetersPerSecond
    return new Date(startAt.getTime() + durationSeconds * 1000)

function computeRemainingSeconds(viewTime, estimatedArrivalAt):
    return max(0, (estimatedArrivalAt.getTime() - viewTime.getTime()) / 1000)
```

**Complexity:** `O(1)`.

**Covers:** FR-4, FR-5.

## 9. Full Assembly — `calculateMissionGeometry()`

```text
function calculateMissionGeometry(input) -> MissionGeometryResult:
    { points, isFallbackDirect } = resolveEffectivePoints(input.origin, input.destination, input.routePoints)
    cumulativeDistances = points.map(p => p.cumulativeDistanceMeters)
    totalDistanceMeters = cumulativeDistances[last]

    traveledMeters = computeTraveledMeters(input.viewTime, input.startAt, input.speedKmh, totalDistanceMeters)
    remainingMeters = totalDistanceMeters - traveledMeters

    if totalDistanceMeters == 0:
        position = points[0]              # == points[last], coordinates identical
        bearing = null                    # EC-5
        progressRatio = 1
    else:
        segmentIndex = findSegmentIndex(cumulativeDistances, traveledMeters)
        pointA = points[segmentIndex]
        pointB = points[segmentIndex + 1]
        position = interpolatePosition(pointA, pointB, cumulativeDistances[segmentIndex], cumulativeDistances[segmentIndex+1], traveledMeters)
        bearing = bearingDegrees(pointA, pointB)   # with zero-length walk-forward per Algorithm 5
        progressRatio = traveledMeters / totalDistanceMeters

    estimatedArrivalAt = computeEta(input.startAt, totalDistanceMeters, input.speedKmh)
    remainingSeconds = computeRemainingSeconds(input.viewTime, estimatedArrivalAt)

    return {
        position, progressRatio, traveledMeters, remainingMeters, totalDistanceMeters,
        estimatedArrivalAt, remainingSeconds, bearingDegrees: bearing, isFallbackDirect
    }
```

**Overall complexity:** `O(log n)` time (dominated by Algorithm 3's binary search), `O(1)` additional space beyond the input array (Algorithm 1's fallback path allocates a fixed 2-element array; no other allocation scales with `n`).

## 10. Full Assembly — `simulateMissionPosition()`

```text
function simulateMissionPosition(mission: MissionSnapshot, viewTime: Date) -> MissionSimulationResult:
    status = deriveMissionDisplayStatus(
        { persistedStatus: mission.persistedStatus, startAt: mission.startAt, estimatedArrivalAt: mission.estimatedArrivalAt },
        viewTime
    )

    effectiveViewTime = viewTime
    if status == "CANCELLED" and mission.cancelledAt != null:
        effectiveViewTime = new Date(min(viewTime.getTime(), mission.cancelledAt.getTime()))   # FR-10
    else if status == "ARCHIVED":
        effectiveViewTime = mission.estimatedArrivalAt   # EC-11: freeze at arrival, defensive/forward-compatible

    geometry = calculateMissionGeometry({
        viewTime: effectiveViewTime,
        startAt: mission.startAt,
        speedKmh: mission.speedKmh,
        origin: mission.origin,
        destination: mission.destination,
        routePoints: mission.routePoints
    })

    return { ...geometry, status, isEstimated: true }
```

**Note on `deriveMissionDisplayStatus`'s signature:** the existing function (Phase 7, `mission-rules.ts`) takes `{ persistedStatus, startAt, estimatedArrivalAt }` and a `now: Date` parameter — Phase 9 passes the **raw, unclamped** `viewTime` here (not `effectiveViewTime`), because status derivation must reflect "what status is this at the real requested moment," and only the geometry underneath gets clamped. This ordering (derive status first, from raw `viewTime`, then clamp only for geometry) is critical — reversing it would make a Mission cancelled five minutes ago report status `"WAITING"` again once enough real time passes past a *clamped* comparison point, which is wrong.

**Complexity:** `O(log n)` (dominated by the embedded `calculateMissionGeometry()` call; `deriveMissionDisplayStatus()` is `O(1)`).

## 11. Precision Notes

| Concern | Handling |
|---|---|
| Floating-point `progressRatio` summing to exactly `1.0` at arrival | Not guaranteed bit-exact due to IEEE-754 rounding through the distance/speed/time chain; tests assert with a tolerance (`toBeCloseTo`, see [08-TESTS.md](./08-TESTS.md)), never exact equality, except where the algorithm explicitly short-circuits to the literal `1` (EC-2, EC-5). |
| `Decimal` → `number` conversion (loader boundary, not this module) | `Number(prismaDecimalValue)` — same pattern already used in `mission-service.ts`'s `toDTO()` (e.g. `Number(mission.originLatitude)`). Precision loss is negligible: `Decimal(9,6)` has at most 6 decimal digits after the point, far within `number`'s 15–17 significant-digit precision. |
| `BigInt` → `number` conversion (loader boundary) | `Number(prismaBigIntValue)` — same pattern already used for `mission.distanceMeters` in `mission-service.ts`. Safe because realistic route distances (meters, as an integer) never approach `Number.MAX_SAFE_INTEGER` (9 × 10^15). |

## 12. Time Calculations — Summary Table

| Output field | Formula | Unit |
|---|---|---|
| `traveledMeters` | `min(total, max(0, (viewTime - startAt)/1000) * speedKmh * 1000/3600)` | meters |
| `remainingMeters` | `total - traveledMeters` | meters |
| `progressRatio` | `total == 0 ? 1 : traveledMeters / total` | ratio 0..1 |
| `estimatedArrivalAt` | `startAt + (total / (speedKmh*1000/3600)) seconds` | `Date` |
| `remainingSeconds` | `max(0, (estimatedArrivalAt - viewTime)/1000)` | seconds |

## 13. Performance Considerations

- Binary search (Algorithm 3) is the only `O(log n)` step; everything else is `O(1)`. There is no algorithm in this module worse than `O(log n)`.
- No array is copied or sorted inside `calculateMissionGeometry()` — `routePoints` is consumed by reference and assumed pre-sorted (caller precondition, EC-8).
- No object pooling, memoization, or caching is implemented in this module (see [04-ARCHITECTURE.md](./04-ARCHITECTURE.md) §10) — at `O(log n)` with `n <= 10,000`, none is needed.

## 14. Important Implementation Notes

1. **Do not use `Array.prototype.findIndex` or a linear scan** for segment location — it must be the binary search in Algorithm 3, both for the stated `O(log n)` performance requirement and because a route can have up to 10,000 points (Phase 5's CSV ceiling), making a linear scan up to ~2,500x slower on average for a full route.
2. **Do not call `new Date()` (no-arg) anywhere in `mission-simulation.ts`.** Every `Date` construction in this module must derive from an input `Date`'s `.getTime()` plus an offset (e.g. `new Date(startAt.getTime() + durationSeconds * 1000)`).
3. **`routePoints` ordering is a precondition, not something this module verifies at runtime.** Do not add a `.sort()` call inside `mission-simulation.ts` — sorting is `SimulationContextLoader`'s responsibility (it already reads `RoutePoint` rows with `ORDER BY sequence ASC` from Prisma — see [06-API.md](./06-API.md) for the exact query).
4. **Reuse, do not reimplement, `haversineDistanceMeters`** from `@/lib/geo/distance` for the fallback-distance calculation in Algorithm 1. Do not write a second Haversine implementation.
5. **Reuse, do not reimplement, `deriveMissionDisplayStatus`** from `@/lib/domain/mission-rules` for status derivation in `simulateMissionPosition()`. Do not write a second status state machine.
