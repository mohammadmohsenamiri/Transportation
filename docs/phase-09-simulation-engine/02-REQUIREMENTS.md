# 02 — Requirements

## 1. Functional Requirements

| ID | Requirement | Source |
|---|---|---|
| FR-1 | Given a Mission's `startAt`, `speedSnapshotKmh`, origin, destination, optional route points, and a `viewTime`, the system SHALL compute the vehicle's approximate `{latitude, longitude}` at `viewTime`. | `docs/ARCHITECTURE_AND_DATA_MODEL.md` §5 |
| FR-2 | The system SHALL compute `progressRatio` in `[0, 1]` representing the fraction of total distance traveled by `viewTime`. | Same |
| FR-3 | The system SHALL compute `traveledMeters` and `remainingMeters`, both non-negative, summing to `totalDistanceMeters`. | Same |
| FR-4 | The system SHALL compute `estimatedArrivalAt` as `startAt + totalDistanceMeters / speedMetersPerSecond`. | Same |
| FR-5 | The system SHALL compute `remainingSeconds`, the time remaining from `viewTime` to `estimatedArrivalAt`, clamped to `>= 0`. | Same |
| FR-6 | The system SHALL compute `bearingDegrees`, the initial forward azimuth (0–360, `0`/`360` = true north, clockwise) of the vehicle's current direction of travel, or `null` when direction is undefined (see §3 Edge Cases). | `docs/IMPLEMENTATION_PLAN.md` Phase 9 scope: "bearing تقریبی" |
| FR-7 | When a Mission has an attached `Route` with 2 or more points, the system SHALL interpolate position along the route polyline (segment-by-segment), not along a straight line from origin to destination. | Same |
| FR-8 | When a Mission has no route, or a route with fewer than 2 points, the system SHALL fall back to straight-line (geodesic) interpolation between origin and destination and SHALL report `isFallbackDirect: true`. | ADR-011 |
| FR-9 | The system SHALL derive a `status` value (`DRAFT \| WAITING \| IN_PROGRESS \| ARRIVED \| CANCELLED \| ARCHIVED`) for the Mission at `viewTime` by reusing `deriveMissionDisplayStatus()` from `src/lib/domain/mission-rules.ts`, unmodified. | Phase 7 reuse mandate |
| FR-10 | When a Mission's `persistedStatus` is `CANCELLED`, the system SHALL freeze the geometry calculation's effective view time at `min(viewTime, cancelledAt)`, while still reporting `status: "CANCELLED"` regardless of the geometric progress this implies. | `docs/ARCHITECTURE_AND_DATA_MODEL.md` §5, "مأموریت cancel شده" rule |
| FR-11 | The system SHALL mark every result with `isEstimated: true` so no consumer can accidentally present the output as a real GPS fix. | `CLAUDE.md` §5: ban on labeling estimated position as real |
| FR-12 | The system SHALL expose a DB-touching loader that assembles the pure function's input from a `missionId` and a `viewTime`, isolated from the pure calculation. | Layering requirement, see [04-ARCHITECTURE.md](./04-ARCHITECTURE.md) |
| FR-13 | The system SHALL expose one read-only HTTP endpoint returning the same result as the loader, JSON-serialized. | [06-API.md](./06-API.md) |

## 2. Business Rules

| ID | Rule | Enforcement point |
|---|---|---|
| BR-1 | A vehicle's position is always "approximate" — the product must never claim real-time GPS accuracy for this data. | Output contract (`isEstimated: true`); enforced by any future UI copy, out of scope here but the flag exists so UI cannot forget it. |
| BR-2 | The average speed used is always the value **snapshotted onto the Mission at publish/re-commit time** (`Mission.speedSnapshotKmh`), never the vehicle's *current* `avgSpeedKmh`. | Already guaranteed upstream by Phase 7's `commitMissionAssignment()`; Phase 9 simply reads `speedSnapshotKmh`, never `Vehicle.avgSpeedKmh`. |
| BR-3 | Route geometry used is the version snapshotted onto the Mission (`Mission.routeId` + `Mission.routeVersion`), not necessarily the route's current/latest version. | The `SimulationContextLoader` MUST fetch the `Route` row matching `(id: mission.routeId, version: mission.routeVersion)`, not just `mission.routeId`. Route versioning is append-only (ADR-020), so an older version row still exists and is immutable. |
| BR-4 | A cancelled Mission's simulated position never advances past the moment it was cancelled. | FR-10. |
| BR-5 | The simulation engine never mutates any database row. It is read-only end to end. | Architectural constraint, not just a convention — see [04-ARCHITECTURE.md](./04-ARCHITECTURE.md) §5. |

## 3. Validation Rules

Applied at the `SimulationContextLoader` boundary (the pure function itself does not validate — see §5 Deterministic Behavior):

| ID | Rule | Failure |
|---|---|---|
| VR-1 | `missionId` must reference an existing, non-soft-deleted Mission. | Domain error `MISSION_NOT_FOUND` (reuses the exact code already used by `mission-service.ts`). |
| VR-2 | `viewTime`, if supplied externally (e.g. via the HTTP endpoint's query string), must parse to a valid `Date`. | Domain error `SIMULATION_INVALID_VIEW_TIME`. |
| VR-3 | If `mission.routeId` is set but the referenced `(routeId, routeVersion)` row cannot be found, the loader treats this as an integrity fault, not a silent fallback. | Domain error `SIMULATION_ROUTE_SNAPSHOT_MISSING` (see [02-REQUIREMENTS.md](#4-edge-cases) EC-9 for why this must never silently fall back). |

The pure function `calculateMissionGeometry()` itself has no failure mode — see §5.

## 4. Edge Cases

Each edge case states the exact required output. No "should" — this is what the function returns.

| ID | Condition | Required behavior |
|---|---|---|
| EC-1 | `viewTime < startAt` | `progressRatio = 0`, `traveledMeters = 0`, `position = origin`, `status` derives to `WAITING` (or `DRAFT` if `persistedStatus === DRAFT`), `bearingDegrees` = bearing of the *first* segment (see EC-7 for the all-zero-distance sub-case). |
| EC-2 | `viewTime >= estimatedArrivalAt` | `progressRatio = 1`, `traveledMeters = totalDistanceMeters`, `remainingMeters = 0`, `remainingSeconds = 0`, `position = destination`, `status` derives to `ARRIVED`. |
| EC-3 | `viewTime === startAt` exactly | Same as EC-1 (treated as the boundary belongs to "not yet moved"; `elapsedSeconds = 0`). |
| EC-4 | `viewTime === estimatedArrivalAt` exactly | Same as EC-2 (boundary belongs to "arrived"; see `deriveMissionDisplayStatus`'s existing `>=` semantics, which this reuses unmodified). |
| EC-5 | `totalDistanceMeters === 0` (origin and destination are the same point, or a 2-point route where both points coincide) | `progressRatio = 1` always, regardless of `viewTime` (per `docs/ARCHITECTURE_AND_DATA_MODEL.md` §5: "progress = totalDistanceMeters == 0 ? 1 : ..."). `bearingDegrees = null` (direction is undefined for a zero-length path). `position = origin` (`=== destination` in this case). |
| EC-6 | `speedKmh <= 0` | MUST NOT occur in practice — Phase 7's publish validation (`assertVehicleAvailability` chain) guarantees a positive snapshotted speed before a Mission can reach `SCHEDULED`. The pure function still defines behavior defensively: `durationSeconds` treated as `0` (matches `estimateMission()`'s existing precedent in `mission-estimate.ts` line 27: `speedMetersPerSecond > 0 ? distance / speed : 0`), which forces `estimatedArrivalAt = startAt` and therefore `progressRatio = 1` for any `viewTime >= startAt` (immediate-arrival degenerate case), `progressRatio = 0` otherwise. |
| EC-7 | `routePoints` has exactly 0 or 1 points | Treated identically to "no route provided" (§ FR-8, falls back to direct line). This resolves the "invalid" wording in `docs/ARCHITECTURE_AND_DATA_MODEL.md` §5 into concrete behavior: the engine degrades gracefully rather than throwing, because upstream Route validation (Phase 5) already guarantees a persisted Route always has ≥ 2 points — this path is only reachable via defensive/malformed input, and a pure function must still return a value for it. |
| EC-8 | `routePoints` has 2+ points but they are not sorted by `sequence` | The `SimulationContextLoader` (not the pure function) is responsible for sorting by `sequence` ascending before calling `calculateMissionGeometry()`. The pure function assumes its `routePoints` input is already sorted and requires monotonically non-decreasing `cumulativeDistanceMeters`; violating this is a caller bug (loader bug), not a runtime-checked condition — see [05-IMPLEMENTATION.md](./05-IMPLEMENTATION.md) precondition notes. |
| EC-9 | `mission.routeId` set, but the exact `(routeId, routeVersion)` snapshot row is missing (e.g. corrupted data) | The loader throws `SIMULATION_ROUTE_SNAPSHOT_MISSING` rather than silently falling back to a direct line — a silent fallback would misrepresent a real Mission (which was published *with* a route) as a Mission that never had one, corrupting the `isFallbackDirect` signal for any caller inspecting it. |
| EC-10 | `persistedStatus === CANCELLED` and `cancelledAt === null` | MUST NOT occur — `cancelMission()` in `mission-service.ts` always sets `cancelledAt` in the same transaction that sets `persistedStatus = CANCELLED`. Defensive behavior if it ever does: treat as if `cancelledAt = viewTime` (no clamping applied), i.e. behave as FR-9 without FR-10's freeze. |
| EC-11 | `persistedStatus === ARCHIVED` | No code path in the repository sets this yet (Phase 7's Known Limitations note this explicitly). Defensive behavior: treat identically to `ARRIVED` — freeze geometry at `estimatedArrivalAt`, report `status: "ARCHIVED"`. This is forward-compatible with whichever future phase adds a real archiving trigger. |
| EC-12 | `viewTime` far in the future (e.g. years after `estimatedArrivalAt`) | Same as EC-2 — no special-casing, no overflow risk (JS `Date`/`number` arithmetic is safe well beyond any realistic Mission horizon). |
| EC-13 | Two consecutive `RoutePoint`s have identical coordinates (zero-length segment) | That segment contributes `0` to `cumulativeDistanceMeters`. If `traveledMeters` lands exactly on that zero-length segment's start, interpolation returns that point's coordinates and bearing falls through to the next non-zero-length segment (see [05-IMPLEMENTATION.md](./05-IMPLEMENTATION.md) §3.3 for the exact bearing-segment-selection algorithm). |

## 5. Failure Scenarios

| ID | Scenario | Required system behavior |
|---|---|---|
| FS-1 | `getMissionSimulation(missionId, viewTime)` called with a `missionId` that does not exist or is soft-deleted | Throws `DomainError("MISSION_NOT_FOUND", ...)`. The HTTP endpoint maps this to `404`. |
| FS-2 | HTTP endpoint called with a non-ISO-8601 `viewTime` query parameter | Zod validation rejects it before reaching the service; endpoint returns `422` with `SIMULATION_INVALID_VIEW_TIME`. |
| FS-3 | HTTP endpoint called with no `viewTime` query parameter at all | Defaults to the server's current time (`new Date()`) — this is a deliberate, documented default, not an error. See [06-API.md](./06-API.md) §2. |
| FS-4 | Database unavailable when `SimulationContextLoader` runs | Propagates the underlying Prisma error unchanged (no special handling in Phase 9 — matches every other service in this codebase, which rely on the global error boundary / route handler try-catch already established in Phase 1). |
| FS-5 | Pure function called with malformed input (e.g. `NaN` coordinates) from a future caller that skips the loader | Not defended against inside `calculateMissionGeometry()` — see §6 Deterministic Behavior: garbage in, garbage out, by design, because validating here would duplicate validation that already happened upstream (Zod at Mission creation time) and would violate purity-first simplicity. This is an explicit, intentional design choice (see ADR-P9-03). |

## 6. Constraints

| Constraint | Detail |
|---|---|
| No new npm dependency | See [01-SCOPE.md](./01-SCOPE.md) §7 item 5 and ADR-P9-02. |
| No Prisma migration | See [07-DATABASE.md](./07-DATABASE.md). |
| No framework imports in the pure module | `src/lib/domain/mission-simulation.ts` may only import from `src/lib/geo/*`, `src/lib/domain/*`, and Node/TypeScript built-ins. |
| Single source of truth for status derivation | Must import `deriveMissionDisplayStatus` from `mission-rules.ts`; must not re-implement WAITING/IN_PROGRESS/ARRIVED logic. |
| Route snapshot fidelity | Must read the exact `(routeId, routeVersion)` pinned on the Mission, never "the current route." |

## 7. Performance Requirements

| Metric | Target | Rationale |
|---|---|---|
| `calculateMissionGeometry()` single-call latency | < 1 ms on commodity hardware for a route with ≤ 10,000 points | Binary search is `O(log n)`; `n ≤ 10,000` (Phase 5's CSV import ceiling) → ≤ 14 comparisons. |
| `getMissionSimulation()` (loader + pure call) single-call latency | < 50 ms p95 under normal DB load | Matches this project's existing p95 budget for list/dashboard queries (`docs/IMPLEMENTATION_PLAN.md`, "بودجه‌های فنی اولیه": < 500 ms for list/dashboard queries — simulation is a single-row read, budgeted far tighter). |
| Memory | `O(n)` in route point count per call, no retained state between calls | The pure function holds no module-level mutable state (statelessness is a hard requirement, not just a nice-to-have — see [10-NON_FUNCTIONAL.md](./10-NON_FUNCTIONAL.md)). |
| Concurrency | Safe for unlimited concurrent calls | Pure function, no shared mutable state → trivially thread-safe / concurrency-safe under Node's single-threaded event loop and safe if ever moved to a worker pool. |

## 8. Deterministic Behavior (Hard Requirement)

This is the single most important requirement in this document, restated formally:

> For any two calls to `calculateMissionGeometry(input)` with **structurally equal** `input` values (same `viewTime.getTime()`, same `startAt.getTime()`, same `speedKmh`, same coordinates, same `routePoints` array contents), the function MUST return **structurally equal** output, every time, forever, regardless of when the calls happen, in which process, on which machine.

Concretely, this means the function body:

- MUST NOT call `Date.now()`, `new Date()` (no-arg), `Math.random()`, or any other impure/non-deterministic API.
- MUST NOT read any module-level mutable variable that isn't a pure constant (e.g. `EARTH_RADIUS_METERS` is fine; a cache `Map` that changes results based on call order is not).
- MUST NOT perform I/O (no `fetch`, no `fs`, no Prisma) anywhere in `src/lib/domain/mission-simulation.ts`.
- MUST treat every `Date` input as an opaque timestamp via `.getTime()` — never re-derive "now" from it.

This mirrors the exact same purity discipline already enforced in this codebase for `estimateMission()` (`src/lib/domain/mission-estimate.ts`) and `deriveMissionDisplayStatus()` (`src/lib/domain/mission-rules.ts`), and is required by `CLAUDE.md` §2: "محاسبه موقعیت باید تابع pure و deterministic باشد و آزمون واحد مرزی داشته باشد."
