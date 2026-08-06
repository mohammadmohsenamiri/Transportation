# 01 — Scope

## 1. Scope Statement

Phase 9 delivers a **pure calculation library plus a thin, optional read-only HTTP surface** for computing a Mission's approximate position/progress/ETA/bearing at an arbitrary point in time. It delivers **no user interface of any kind.**

## 2. Explicit Deviation From `IMPLEMENTATION_PLAN.md`

`docs/IMPLEMENTATION_PLAN.md`'s existing Phase 9 section (written before this pack) lists `صفحه داخلی /system/simulation-lab فقط برای Admin/توسعه` (an internal admin-only simulation-lab page) as part of Phase 9's implementation scope and as its "visible output."

This pack **overrides that prose** on explicit product-owner instruction: Phase 9 must remain completely independent from React, Next.js UI components, and map-rendering libraries. The simulation-lab page is **removed from Phase 9's scope** and deferred — see [11-OUT_OF_SCOPE.md](./11-OUT_OF_SCOPE.md) §2 for exactly where it goes. `docs/IMPLEMENTATION_PLAN.md` is updated in the same change that introduces this pack so the two documents do not contradict each other (see ADR-024 in the main `docs/DECISIONS.md`, and `ADR.md` §ADR-P9-01 in this pack).

Because Phase 9 ships no visible page, its "visible output" (per `CLAUDE.md` §4's Definition of Done, which normally requires a clickable result) is redefined for this phase only: **a green, deterministic, boundary-tested automated test suite is the visible output.** This is spelled out explicitly in [09-ACCEPTANCE.md](./09-ACCEPTANCE.md) so there is no ambiguity about what "done" means without a demo page.

## 3. IN SCOPE

| # | Item | Notes |
|---|---|---|
| S1 | Pure function `calculateMissionGeometry()` — position, progress, traveled/remaining distance, ETA, remaining time, bearing, given a view time and a mission's snapshotted timing/geometry. | See [03-DOMAIN.md](./03-DOMAIN.md), [05-IMPLEMENTATION.md](./05-IMPLEMENTATION.md). |
| S2 | Orchestrator `simulateMissionPosition()` — wraps S1, adds Mission-status awareness by reusing `deriveMissionDisplayStatus()` from Phase 7 (`mission-rules.ts`) without modifying it. | Status resolution, not geometry. |
| S3 | Route-point interpolation (binary search + linear lat/lng interpolation between the two bracketing `RoutePoint`s). | No new geodesic library dependency; see ADR-P9-02. |
| S4 | Straight-line fallback simulation when a Mission has no route or fewer than 2 route points (reuses ADR-011's existing rule, now expressed in code). | |
| S5 | Bearing (initial forward azimuth) calculation between the two points bracketing the current traveled distance. | |
| S6 | `SimulationContextLoader` — a DB-touching adapter (`src/server/services/simulation-service.ts`) that reads a `Mission` (+ `Route`/`RoutePoint` if present) via Prisma and assembles the pure function's input. | This is the *only* file in Phase 9 allowed to import `@/lib/db/prisma`. |
| S7 | One optional, read-only HTTP endpoint: `GET /api/v1/missions/:id/simulate`. | See [06-API.md](./06-API.md). |
| S8 | Exhaustive unit tests covering the algorithm's boundary conditions (see [08-TESTS.md](./08-TESTS.md)). | |
| S9 | Updating `docs/PHASE_STATUS.md` with a Phase 9 completion record once implemented. | Documentation only. |

## 4. OUT OF SCOPE

See [11-OUT_OF_SCOPE.md](./11-OUT_OF_SCOPE.md) for the full list with rationale. Summary:

| # | Item | Why excluded |
|---|---|---|
| O1 | `/system/simulation-lab` page (or any page) | Explicit product-owner instruction: zero UI in Phase 9. |
| O2 | Any MapLibre/map-rendering code | Phase 10's job. |
| O3 | Persisting computed positions to the database (per-tick or otherwise) | Forbidden by `CLAUDE.md` §2: "موقعیت لحظه‌ای محاسبه‌شده را در هر tick در DB ذخیره نکن." |
| O4 | Real GPS ingestion | Not in this product's roadmap; see `docs/PROJECT_SPEC.md`. |
| O5 | Geodesic (great-circle-exact) segment interpolation via Turf.js or similar | Deferred optimization; linear lat/lng interpolation is explicitly accepted by `docs/ARCHITECTURE_AND_DATA_MODEL.md` §5. |
| O6 | Live client-side polling/animation loop, WebSocket push, SSE | Phase 10's job; Phase 9 only provides the pure calculation a consumer calls. |
| O7 | A caching table or Redis-backed cache for simulation results | Deferred; see [07-DATABASE.md](./07-DATABASE.md) and ADR-017 (Redis not required initially). |
| O8 | Historical position seeker UI, timeline scrubber UI | Phase 12's job (`docs/IMPLEMENTATION_PLAN.md` Phase 12). |
| O9 | Multi-mission batch simulation endpoint (e.g. "simulate all active missions at once") | Not needed until Phase 10 defines its query pattern; adding it now would be speculative. |

## 5. Non-Goals

A non-goal is something Phase 9 is deliberately *not trying to achieve*, distinct from "out of scope" (which lists concrete features). These are stated so the implementer does not over-engineer:

| Non-goal | Explanation |
|---|---|
| Sub-meter positional accuracy | The product's own domain rule (`CLAUDE.md`) requires the UI to always label this as "approximate" — the engine is not meant to compete with real telematics precision. |
| Real-time performance under sustained per-second polling for thousands of concurrent missions | Baseline scale target (`docs/ARCHITECTURE_AND_DATA_MODEL.md` §7: 2,000 concurrent missions) is the ceiling for this phase; anything beyond that is a Phase 16 capacity concern. |
| Support for non-Haversine geodesy (e.g., ellipsoidal / Vincenty) | Haversine (spherical Earth) is the standard already used everywhere else in this codebase (Phase 5); Phase 9 does not introduce a second distance model. |
| Time-zone-aware calculation | All time inputs/outputs are UTC `Date`/ISO-8601 instants, exactly like every other server-side date in this codebase; Jalali conversion is a UI-boundary concern only (`src/lib/dates/jalali.ts`), never touched by the engine. |

## 6. Future Work (Explicitly Not Phase 9, But Enabled By It)

| Future item | Owning phase |
|---|---|
| Rendering vehicle markers that move using this engine's output | Phase 10 |
| The `/system/simulation-lab` (or equivalent) debug page, if the product owner still wants a standalone lab distinct from the real operational map | Phase 10 (optional sub-task) — see [11-OUT_OF_SCOPE.md](./11-OUT_OF_SCOPE.md) §2 |
| Historical/live time seeker control | Phase 12 |
| Cross-mission filtering, table/map sync | Phase 11 |

## 7. Things That Must NOT Be Implemented In Phase 9

This is a hard list. If the implementer finds themselves about to do any of these, stop and re-read [11-OUT_OF_SCOPE.md](./11-OUT_OF_SCOPE.md):

1. Do not create any file under `src/app/(dashboard)/**` or any `page.tsx`.
2. Do not import `react`, `next/navigation`, `next/link`, or any `.tsx` file from `src/lib/domain/mission-simulation.ts` or `src/server/services/simulation-service.ts`.
3. Do not import `maplibre-gl` anywhere in this phase.
4. Do not add a Prisma migration.
5. Do not add a new npm dependency (Turf.js, geolib, etc.) — see ADR-P9-02 for why the existing hand-rolled Haversine math is sufficient.
6. Do not persist any computed position, progress, or bearing value to the database.
7. Do not modify `src/lib/domain/mission-rules.ts` or `src/lib/domain/mission-estimate.ts` — reuse them as-is, unmodified, by import.
