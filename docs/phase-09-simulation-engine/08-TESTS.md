# 08 — Test Specification

## 0. Conventions

- Test runner: **Vitest**, matching every other unit test in this repository.
- File: `tests/unit/mission-simulation.test.ts` (new).
- `describe`/`it` strings: **English**, matching the existing convention in `tests/unit/mission-rules.test.ts`, `tests/unit/mission-estimate.test.ts`, `tests/unit/mission-validation.test.ts` (Persian is used only in Playwright e2e test titles across this repository, never in Vitest unit test titles).
- Floating-point assertions use `toBeCloseTo(expected, precision)`, never `toBe`, except where the algorithm defines an exact literal output (e.g. `progressRatio === 1` at the zero-distance edge case).
- No test touches Prisma, the filesystem, or the network — the entire suite runs against `calculateMissionGeometry()` and `simulateMissionPosition()` directly, in-memory, matching how `mission-rules.test.ts` and `mission-estimate.test.ts` already test their pure functions.

## 1. Unit Tests — `calculateMissionGeometry()`

| # | Purpose | Input (key fields) | Expected Output |
|---|---|---|---|
| U1 | Before departure, position is origin, zero progress | `viewTime = startAt - 1h`, no route | `traveledMeters = 0`, `progressRatio = 0`, `position ≈ origin`, `isFallbackDirect = true` |
| U2 | Exactly at `startAt`, treated as not-yet-departed | `viewTime = startAt` | Same as U1 (EC-3) |
| U3 | Midpoint of a direct (no-route) trip | `viewTime = startAt + duration/2` | `progressRatio ≈ 0.5`, `traveledMeters ≈ totalDistanceMeters/2`, `position` ≈ the geodesic midpoint between origin/destination (linear-interpolation approximation, tolerance per [05-IMPLEMENTATION.md](./05-IMPLEMENTATION.md) §6) |
| U4 | Exactly at ETA, arrived | `viewTime = estimatedArrivalAt` | `progressRatio = 1`, `traveledMeters = totalDistanceMeters`, `remainingMeters = 0`, `remainingSeconds = 0`, `position ≈ destination` (EC-4) |
| U5 | Long after ETA, still clamped at arrival | `viewTime = estimatedArrivalAt + 10 days` | Same as U4 (EC-12, no overflow, no negative remaining) |
| U6 | Zero-distance mission (origin === destination) | `origin === destination`, any `viewTime` | `progressRatio = 1` always, `bearingDegrees = null`, `position ≈ origin` (EC-5) |
| U7 | Route with 2 points behaves like direct fallback in shape, but `isFallbackDirect = false` | `routePoints` = 2 points equal to origin/destination | Same numeric result as U1–U4 equivalents, but `isFallbackDirect = false` |
| U8 | Route with 1 point falls back to direct | `routePoints` = `[oneStrayPoint]` | `isFallbackDirect = true`, identical result to the no-route case with the same origin/destination (EC-7) |
| U9 | Route with 0 points (empty array, not `undefined`) falls back to direct | `routePoints = []` | Same as U8 |
| U10 | Multi-point route: position at a mid-segment boundary | 4-point route, `traveledMeters` exactly equal to `cumulativeDistanceMeters` of point 2 | `position ≈ points[2]` exactly; bearing = direction from `points[2]` to `points[3]` (Algorithm 3's documented tie-break, [05-IMPLEMENTATION.md](./05-IMPLEMENTATION.md) §5 worked example) |
| U11 | Multi-point route: position strictly inside a segment | 4-point route, `traveledMeters` halfway between `points[1]` and `points[2]`'s cumulative distances | `position` ≈ the linear-interpolated midpoint of that segment; `progressRatio` matches `traveledMeters/total` |
| U12 | Bearing due north | Two points with identical longitude, `pointB.latitude > pointA.latitude` | `bearingDegrees ≈ 0` |
| U13 | Bearing due east | Two points with identical latitude, `pointB.longitude > pointA.longitude` | `bearingDegrees ≈ 90` |
| U14 | Bearing due south | Identical longitude, `pointB.latitude < pointA.latitude` | `bearingDegrees ≈ 180` |
| U15 | Bearing due west | Identical latitude, `pointB.longitude < pointA.longitude` | `bearingDegrees ≈ 270` |
| U16 | Zero-length segment mid-route, bearing walks forward | 3-point route where `points[1] === points[2]` (identical coords), traveled distance lands exactly at that duplicate point | `bearingDegrees` equals the bearing of the *next* non-zero-length segment (points[2]→points[3], requiring a 4th point in this fixture), not `null` and not an arbitrary/undefined value (EC-13) |
| U17 | Every remaining segment is zero-length | Route where all points from the current position onward are coincident | `bearingDegrees = null` |
| U18 | Degenerate speed (`speedKmh = 0`), defensive path | `speedKmh = 0`, `viewTime > startAt` | `estimatedArrivalAt = startAt`, `progressRatio = 1` (EC-6) |
| U19 | Degenerate speed, before start | `speedKmh = 0`, `viewTime <= startAt` | `progressRatio = 0` (EC-6) |
| U20 | Determinism — same input, called twice | Any fixed input object, called twice with `structuredClone`-independent copies | Both calls return deep-equal results (`toEqual`) |
| U21 | Determinism — result does not depend on wall-clock time | Mock `Date.now`/system clock to two different values around the call (if feasible in Vitest without touching the function under test itself) while keeping `viewTime`/`startAt` fixed | Identical result both times — proves no hidden `Date.now()` read |
| U22 | `traveledMeters + remainingMeters === totalDistanceMeters` invariant | Any mid-trip input | Sum equals `totalDistanceMeters` within floating-point tolerance |
| U23 | Large route (10,000 points) completes fast | Synthetic 10,000-point route, `viewTime` at an arbitrary mid-trip instant | Correct result; wall-clock test execution time asserted `< 5ms` (generous margin above the `<1ms` target in [02-REQUIREMENTS.md](./02-REQUIREMENTS.md) §7 to avoid CI flakiness) |

## 2. Unit Tests — `simulateMissionPosition()`

| # | Purpose | Input (key fields) | Expected Output |
|---|---|---|---|
| S1 | DRAFT mission reports DRAFT status, geometry still computed | `persistedStatus = "DRAFT"` | `status = "DRAFT"`; geometry fields are still numerically computed from `startAt`/speed (not zeroed out) |
| S2 | SCHEDULED, before start | `persistedStatus = "SCHEDULED"`, `viewTime < startAt` | `status = "WAITING"` |
| S3 | SCHEDULED, mid-trip | `persistedStatus = "SCHEDULED"`, `startAt < viewTime < estimatedArrivalAt` | `status = "IN_PROGRESS"` |
| S4 | SCHEDULED, at/after ETA | `persistedStatus = "SCHEDULED"`, `viewTime >= estimatedArrivalAt` | `status = "ARRIVED"` |
| S5 | CANCELLED, viewTime after cancellation | `persistedStatus = "CANCELLED"`, `cancelledAt` set to a time strictly between `startAt` and `estimatedArrivalAt`, `viewTime` well after `cancelledAt` | `status = "CANCELLED"`; geometry frozen at the position/progress computed as of `cancelledAt`, **not** advanced to match the later `viewTime` (FR-10) |
| S6 | CANCELLED, viewTime before cancellation | `persistedStatus = "CANCELLED"`, `viewTime < cancelledAt` | `status = "CANCELLED"`; geometry computed at `viewTime` directly (clamp is a no-op since `min(viewTime, cancelledAt) === viewTime`) |
| S7 | CANCELLED with `cancelledAt = null` (defensive, should never occur per EC-10) | `persistedStatus = "CANCELLED"`, `cancelledAt = null` | No clamping applied; geometry computed at raw `viewTime`, `status = "CANCELLED"` |
| S8 | ARCHIVED freezes at arrival | `persistedStatus = "ARCHIVED"` | `status = "ARCHIVED"`; geometry equals the arrived-state result (`progressRatio = 1`, `position ≈ destination`) regardless of the requested `viewTime` (EC-11) |
| S9 | `isEstimated` is always `true` | Any input | `result.isEstimated === true`, and this is checked to be the literal boolean `true`, not a truthy value |
| S10 | Status derivation reuses `mission-rules.ts` (regression guard) | Construct a `MissionSnapshot` and independently call `deriveMissionDisplayStatus()` with the same `{persistedStatus, startAt, estimatedArrivalAt}` and the same raw (unclamped) `viewTime` | The two statuses are identical — this test exists specifically to catch any future accidental divergence between the two call sites (e.g. someone passing the clamped time into status derivation by mistake) |

## 3. Boundary Cases

Boundary cases already appear inlined above (U2, U4, U5, U6, U18, U19, S6). Additionally:

| # | Purpose | Input | Expected Output |
|---|---|---|---|
| B1 | `viewTime` exactly equal to a `RoutePoint`'s exact cumulative distance | See U10 | Exact point coordinates, no interpolation drift |
| B2 | Route with exactly 2 points (minimum valid route length) | 2-point route, non-fallback (`isFallbackDirect` must read `false`, not `true`, since a real `Route` was supplied — even though geometrically it looks identical to the fallback case) | Distinguishes "real 2-point route" from "no route" correctly via the `isFallbackDirect` flag alone |
| B3 | `progressRatio` never exceeds `1` or goes below `0` for any `viewTime` in `(-∞, +∞)` | Property-style test: sample `viewTime` at `startAt - 1000d`, `startAt`, `startAt + duration/2`, `estimatedArrivalAt`, `estimatedArrivalAt + 1000d` | All five samples satisfy `0 <= progressRatio <= 1` |

## 4. Negative / Invalid-Input Cases

These document what happens with malformed input that a correct caller (the loader) would never produce, per [02-REQUIREMENTS.md](./02-REQUIREMENTS.md) FS-5 ("garbage in, garbage out" is the intentional design for the pure core — validation lives at the loader/API boundary, not here):

| # | Purpose | Input | Expected Output |
|---|---|---|---|
| N1 | `routePoints` not sorted by sequence (precondition violation) | Deliberately out-of-order array | **Not asserted as an error** — documents that behavior is undefined/unspecified in this case (a comment in the test file states this explicitly); this test exists to make the precondition visible in the test suite, not to lock in specific garbage-in behavior |
| N2 | `speedKmh` negative | `speedKmh = -10` | Treated identically to `speedKmh = 0` by the `<= 0` guard in Algorithm 2 — asserted explicitly so this defensive branch has coverage |

## 5. Integration Tests — `getMissionSimulation()` (Service Layer)

File: `tests/unit/simulation-service.test.ts` **or** covered via Playwright e2e (see §6) — **decision required from the implementer, not fixed by this pack**: if this repository's existing convention for DB-touching service functions is to test them only through Playwright e2e (as `mission-service.ts` currently is — there is no `tests/unit/mission-service.test.ts` in the repository as of Phase 8), follow that same convention for `simulation-service.ts` and skip a dedicated Vitest integration test file. If a future convention shift introduces direct service-layer integration tests with a test database, apply it here too. This is flagged in [FAQ.md](./FAQ.md) Q12.

Minimum required coverage regardless of test framework choice:

| # | Purpose | Scenario | Expected Outcome |
|---|---|---|---|
| I1 | End-to-end happy path | Create a real Mission (via existing test fixtures, matching `tests/e2e/missions.spec.ts`'s `buildMissionFixtures` pattern) with no route, publish it, call the simulate endpoint at a mid-trip `viewTime` | `200`, `status: "IN_PROGRESS"`, plausible position between origin and destination |
| I2 | End-to-end with a real route | Same, but attach a drawn/CSV route (reuse Phase 5 fixture patterns) before publishing | `200`, `isFallbackDirect: false`, position follows the route polyline, not a straight line |
| I3 | Not found | Call with a random UUID | `404`, `MISSION_NOT_FOUND` |
| I4 | Soft-deleted mission | Call with the ID of a soft-deleted DRAFT mission (delete via existing `DELETE /api/v1/missions/:id`) | `404`, `MISSION_NOT_FOUND` |
| I5 | Invalid `viewTime` | `?viewTime=not-a-date` | `422`, `SIMULATION_INVALID_VIEW_TIME` |
| I6 | Missing `viewTime` defaults to now | No query param | `200`, response's echoed `viewTime` field is within a few seconds of the test's own wall-clock time |
| I7 | Role gating — STATUS_VIEWER allowed to read | Call as a `STATUS_VIEWER` session | `200` (unlike mission mutation endpoints, which reject this role) |
| I8 | Role gating — unauthenticated rejected | Call with no session cookie | `401` |
| I9 | Cancelled mission via full flow | Publish, then cancel a mission (reusing `mission-service.ts`'s `cancelMission`), then simulate at a `viewTime` after cancellation | `status: "CANCELLED"`, position frozen at the cancellation-time progress |

## 6. Performance Tests

| # | Purpose | Method | Pass Criterion |
|---|---|---|---|
| P1 | Single-call latency, no route | `performance.now()` around 10,000 repeated calls to `calculateMissionGeometry()` with no route, average per-call time | `< 1 ms` average (per [02-REQUIREMENTS.md](./02-REQUIREMENTS.md) §7) |
| P2 | Single-call latency, 10,000-point route | Same, with the synthetic large-route fixture from U23 | `< 1 ms` average |
| P3 | Service-layer latency | Measure `getMissionSimulation()` end-to-end (including the DB round trip) against a locally-seeded test database | `< 50 ms` p95 over 100 calls (per [02-REQUIREMENTS.md](./02-REQUIREMENTS.md) §7) |

## 7. Load Tests

Not required as an automated, CI-gated suite for Phase 9 — the documented baseline scale (2,000 concurrent missions, `docs/ARCHITECTURE_AND_DATA_MODEL.md` §7) is a Phase 17 capacity-testing concern (`docs/IMPLEMENTATION_PLAN.md` Phase 17: "اجرای بدون اینترنت، امنیت، عملیات و ظرفیت"). Phase 9's own performance tests (§6) are sufficient to prove the *algorithm* is not the bottleneck; proving the *system* holds up under concurrent load end-to-end is explicitly Phase 17's job. This is intentional scope discipline, not a gap — see [11-OUT_OF_SCOPE.md](./11-OUT_OF_SCOPE.md).

## 8. Regression Tests

Every test in §1 and §2 **is** the regression suite — there is no separate regression category for a brand-new module (nothing to regress against yet). Going forward, once Phase 10 starts consuming this engine, any bug found in production must be added here as a new numbered test case (`U24`, `U25`, ...) before being fixed, per this project's general quality practice (implied by `CLAUDE.md` §4's test-execution requirement for every phase).

## 9. Memory Tests

| # | Purpose | Method | Pass Criterion |
|---|---|---|---|
| M1 | No retained state across calls | Call `calculateMissionGeometry()` 100,000 times in a loop with varying inputs inside a single Vitest test, monitor `process.memoryUsage().heapUsed` before and after (with a manual `global.gc()` if `--expose-gc` is available in the test run, otherwise a coarse before/after delta) | Heap growth is bounded and does not scale linearly with call count beyond GC noise — proves no module-level array/map is silently growing (would indicate an accidental cache or memoization leak, forbidden per [04-ARCHITECTURE.md](./04-ARCHITECTURE.md) §10) |

This test is a smoke check, not a precise leak detector — its purpose is to catch an obviously wrong implementation (e.g. someone adding a "helpful" unbounded in-memory cache keyed by `JSON.stringify(input)`), not to certify production memory behavior.

## 10. Concurrency Tests

| # | Purpose | Method | Pass Criterion |
|---|---|---|---|
| C1 | Interleaved calls do not interfere | `Promise.all([...])` over many concurrent (synchronous-under-the-hood, since the function is not `async`) calls to `calculateMissionGeometry()` with *different* inputs, assert each resolved value matches what a sequential call with the same input would produce | No cross-contamination between concurrent calls — trivially true for a pure function with no shared mutable state, but asserted explicitly as a regression guard against a future refactor accidentally introducing module-level state |
| C2 | Concurrent HTTP requests for different missions | Fire multiple concurrent `GET .../simulate` requests for different mission IDs against the running test server (Playwright, reusing the existing `page.request` concurrent-call pattern already used elsewhere in this codebase, e.g. parallel viewport projects) | Each response matches its own mission's expected data — no response mixing |

Node.js's single-threaded event loop makes true data races impossible for this module (no shared mutable state, no threads); these tests exist to prove the *design* holds that property, not to catch a race condition that the runtime itself would prevent.

## 11. Test Summary Table

| Category | Count (approx.) | File |
|---|---|---|
| `calculateMissionGeometry()` unit tests | 23 (U1–U23) | `tests/unit/mission-simulation.test.ts` |
| `simulateMissionPosition()` unit tests | 10 (S1–S10) | same file |
| Boundary | 3 (B1–B3) | same file |
| Negative | 2 (N1–N2) | same file |
| Integration (service/HTTP) | 9 (I1–I9) | `tests/e2e/mission-simulation.spec.ts` (Playwright, following convention — see §5) |
| Performance | 3 (P1–P3) | `tests/unit/mission-simulation.test.ts` (P1/P2) + integration file (P3) |
| Memory | 1 (M1) | `tests/unit/mission-simulation.test.ts` |
| Concurrency | 2 (C1–C2) | split across unit + e2e |

**Total minimum test count for Phase 9 sign-off: 53.** See [09-ACCEPTANCE.md](./09-ACCEPTANCE.md) for how this maps to Definition of Done.
