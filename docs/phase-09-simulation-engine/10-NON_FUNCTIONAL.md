# 10 — Non-Functional Requirements

## 1. Performance

Covered in full in [02-REQUIREMENTS.md](./02-REQUIREMENTS.md) §7 and [09-ACCEPTANCE.md](./09-ACCEPTANCE.md) §5. Summary: `O(log n)` per calculation, `< 1 ms` core, `< 50 ms` p95 including DB read.

## 2. Memory

| Property | Requirement |
|---|---|
| Module-level mutable state | **Zero.** `mission-simulation.ts` must declare no `let`/mutable `const` object at module scope that changes across calls. Constants like `EARTH_RADIUS_METERS` (already in `geo/distance.ts`) are fine — they never change. |
| Per-call allocation | `O(n)` at most (the fallback path allocates a fixed 2-element array; a real route reuses the caller's array by reference, allocating only the small `MissionGeometryResult` object). |
| Garbage collection pressure | Not a concern at the documented scale (single-digit-KB allocation per call, per-request lifetime). |

## 3. Scalability

| Dimension | Behavior |
|---|---|
| Horizontal (more server instances) | Trivial — the engine is stateless, so any number of Node.js instances can call it concurrently with zero coordination. |
| Vertical (bigger routes) | `O(log n)` in route point count, tested up to 10,000 points (the existing Phase 5 ceiling) — see test U23/P2. |
| Vertical (more concurrent missions) | Each simulation call is independent; no shared resource contention inside the engine. The bottleneck at scale, if any, is the database read in `getMissionSimulation()`, not the pure calculation — see [04-ARCHITECTURE.md](./04-ARCHITECTURE.md) §10 for the documented (but not-yet-needed) caching extension point. |

## 4. Maintainability

| Practice | How Phase 9 satisfies it |
|---|---|
| Single Responsibility (function-level) | Each of the 6 algorithms in [05-IMPLEMENTATION.md](./05-IMPLEMENTATION.md) is a small, independently-testable, internally-private helper function. |
| No duplicated logic | Reuses `haversineDistanceMeters`, `computeRouteDistances` (implicitly, via already-persisted `cumulativeDistanceMeters`), and `deriveMissionDisplayStatus` rather than reimplementing any of them. |
| Naming consistency | File and function names follow this repository's existing `*-rules.ts`/`*-estimate.ts` / `*Mission*` naming conventions exactly (see [03-DOMAIN.md](./03-DOMAIN.md) §12 type ownership table). |
| Documentation | This 16-document pack is the permanent design record; inline code comments should be reserved for non-obvious *why* (per `CLAUDE.md`'s general comment policy), not restating what this pack already explains. |

## 5. Logging

Phase 9 adds **no new logging.** The pure engine must never call `console.log`/`console.warn`/`console.error` — a pure function that logs is not fully pure in spirit (it has an observable side effect, even if it doesn't affect its return value) and would pollute server logs on every single position calculation, which happens far more frequently than any other operation in this codebase (potentially every few seconds per active mission once Phase 10 starts polling). The one exception already established elsewhere in this codebase — `console.warn("خطای MapLibre:", ...)` in `maplibre-map-inner.tsx` — is a UI-layer pattern and does not apply here. If `getMissionSimulation()` needs error visibility, it relies on the thrown `DomainError` propagating to the route handler, exactly like every other service in this codebase; it does not log independently.

## 6. Observability

| Aspect | Phase 9 position |
|---|---|
| Metrics (request counts, latency histograms) | Not built in this phase — no metrics infrastructure exists anywhere else in this codebase yet (deferred to Phase 16, `docs/IMPLEMENTATION_PLAN.md`). Phase 9 does not introduce a first instance of it either, to stay consistent. |
| Tracing | Not applicable — no distributed tracing infrastructure exists in this project. |
| Error visibility | Via the existing `DomainError` → HTTP error-response pipeline, identical to every other endpoint. |

## 7. Security

| Aspect | Requirement |
|---|---|
| Authorization | `GET /api/v1/missions/:id/simulate` requires a valid session and one of `ADMIN`/`MISSION_PLANNER`/`STATUS_VIEWER` — enforced server-side via `requireActor()`, never by hiding a UI element (`CLAUDE.md` §2: "مخفی‌کردن UI مجوز محسوب نمی‌شود"). Since Phase 9 has no UI, this is the *only* authorization surface, and it is mandatory. |
| Input validation | `viewTime` is Zod-validated before use (§ [06-API.md](./06-API.md) §2.2); the Mission `id` path parameter is validated implicitly by the Prisma lookup returning nothing for a malformed/non-existent UUID (matches existing pattern across this codebase's `[id]` routes, which do not separately UUID-validate the path param before querying). |
| Information disclosure | The response reveals only data the requesting role can already see elsewhere (Mission position/progress is derived from fields already visible via `GET /api/v1/missions/:id` to the same roles) — no new information is exposed by this endpoint that a `STATUS_VIEWER` could not already infer from existing endpoints plus a stopwatch. |
| Injection | No raw SQL, no string-built queries — Prisma's typed query builder only, matching every other service in this codebase. |
| Denial of service | The `10,000`-point route ceiling (enforced upstream by Phase 5's CSV/route validation, not re-validated here) bounds worst-case per-call cost; no unbounded loop exists in the algorithm. |

## 8. Thread Safety

Node.js runs JavaScript on a single thread per process; there are no threads to make "safe" in the traditional sense. What Phase 9 guarantees instead, precisely:

- **Re-entrancy:** `calculateMissionGeometry()` and `simulateMissionPosition()` can be called from within another in-flight call to either function (e.g. nested/recursive usage from a future caller) without interference, because neither function reads or writes any state outside its own call stack.
- **Safe under `Promise.all`/concurrent async handlers:** since the functions are synchronous and stateless, any number of concurrent Next.js request handlers can call them in the same event-loop tick with no possibility of interleaved corruption (there is nothing to interleave — no `await` point exists inside the pure functions themselves).
- **Safe if ever moved to a Worker thread pool:** because there is no shared mutable state, these functions could be moved into a `worker_threads` pool in a future phase (if CPU-bound work ever became a bottleneck, which is not expected at this project's scale) without any synchronization primitives.

## 9. Stateless Design

Restated as a first-class non-functional requirement (not just an implementation detail): **every function Phase 9 introduces is a pure function of its explicit arguments.** No global, no singleton, no class instance carrying state, no `WeakMap`/`Map`-based cache. This is verified by test U20/U21/C1 in [08-TESTS.md](./08-TESTS.md) and is the direct implementation of `CLAUDE.md` §2's binding requirement: "محاسبه موقعیت باید تابع pure و deterministic باشد."

## 10. Offline Compatibility

Phase 9 introduces zero external dependencies, zero network calls, zero CDN assets, zero fonts, zero icons. It is pure server-side TypeScript computation over data already in the local PostgreSQL database. It trivially satisfies `CLAUDE.md` §2's "بدون وابستگی عملیاتی به اینترنت" requirement by construction — there is nothing in this phase that could depend on the internet even accidentally. No offline-specific test is required for this phase beyond the general repository-wide offline acceptance test already defined in `docs/API_SECURITY_OFFLINE_OPERATIONS.md` §8, which Phase 16 will run against the whole system.
