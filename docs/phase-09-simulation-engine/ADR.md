# Architecture Decision Records — Phase 9

These are decisions scoped to this pack. Compact pointer versions of the ones with repository-wide consequences (ADR-P9-01, ADR-P9-02) are also recorded in the main `docs/DECISIONS.md` as ADR-024 onward, per this project's established practice of resolving `IMPLEMENTATION_PLAN.md`/reality conflicts through numbered ADRs (see ADR-020, ADR-021, ADR-023 for precedent).

---

## ADR-P9-01 — Phase 9 Ships No UI; Simulation-Lab Page Removed From Scope

**Status:** Accepted

**Context:** `docs/IMPLEMENTATION_PLAN.md`'s existing Phase 9 section lists an internal `/system/simulation-lab` admin page as part of the phase's implementation scope and as its demoable "visible output" — consistent with this project's general rule that every phase ships something clickable. Separately, explicit product-owner instruction for this pack states Phase 9 must remain completely independent from React, Next.js UI components, and map-rendering libraries, with no exceptions.

**Decision:** Phase 9 ships zero UI, zero pages, zero components. The simulation-lab page is removed from this phase's scope entirely. `docs/IMPLEMENTATION_PLAN.md`'s Phase 9 section is edited (as part of introducing this pack) to match. The phase's Definition of Done is redefined to accept a scripted, non-committed terminal walkthrough plus a green test suite as its "visible output" instead of a clickable page (see `09-ACCEPTANCE.md` §3).

**Alternatives considered:**
1. *Keep the lab page in Phase 9, build it last, after the engine.* Rejected — directly contradicts the explicit instruction; also would smuggle a React/MapLibre dependency into a phase meant to prove the engine's independence from both.
2. *Split Phase 9 into 9a (engine, this pack) and 9b (lab page).* Considered, but not adopted — introducing a new sub-phase numbering scheme is a bigger change to `docs/IMPLEMENTATION_PLAN.md`'s structure than necessary; folding the (optional) lab page into Phase 10 achieves the same separation without inventing new phase-numbering conventions.
3. *Drop the lab page concept entirely, forever.* Not adopted as a permanent decision — that call belongs to the product owner when Phase 10 starts, not to this pack; this pack only removes it from Phase 9.

**Trade-offs:** Phase 9 does not get the psychological/practical benefit of a demo the product owner can click through during sign-off — mitigated by the scripted-walkthrough alternative in `09-ACCEPTANCE.md` §3, which is weaker than a UI but still gives a reviewable artifact. In exchange, the engine's independence from the UI layer is provable by construction (no React/MapLibre import exists at all, not just "isn't used yet").

**Future impact:** Phase 10 inherits the open question of whether to build a standalone lab page or rely on the real operational map for the same inspection capability. This pack does not answer that question — see `11-OUT_OF_SCOPE.md` §2.

---

## ADR-P9-02 — Linear Lat/Lng Interpolation, No New Geospatial Dependency

**Status:** Accepted

**Context:** Position along a route segment can be computed via simple linear interpolation of latitude/longitude, or via geodesic ("great-circle", e.g. Turf.js's `along`) interpolation, which is more accurate over long segments but requires either hand-rolling spherical interpolation math or adding a dependency. `docs/ARCHITECTURE_AND_DATA_MODEL.md` §5 explicitly states linear interpolation is acceptable, geodesic is merely "preferred." This codebase's established precedent (Phase 5) is to hand-roll exactly the geospatial math it needs (Haversine distance) rather than pull in Turf.js, even though Turf.js is listed as an approved stack choice in `README.md`.

**Decision:** Use linear lat/lng interpolation, implemented by hand, with no new dependency. See `05-IMPLEMENTATION.md` §6 for the exact formula and its documented precision bound (sub-meter error for segments under ~10 km; up to single-digit-km error for very long fallback-direct segments, judged acceptable because that state is already visually flagged as approximate via `isFallbackDirect`).

**Alternatives considered:**
1. *Add Turf.js and use `turf.along()`.* Rejected for now — no stated requirement demands geodesic precision; adding a dependency to solve a problem the architecture doc already says doesn't need solving would be premature optimization and scope creep.
2. *Hand-roll spherical (slerp) interpolation without a dependency.* Rejected for now — meaningfully more complex code for a precision gain nothing currently requires; the extension point in `04-ARCHITECTURE.md` §11 keeps this swap cheap later if ever needed.

**Trade-offs:** Slightly less accurate positions on very long straight-line (fallback) segments. Accepted because the visual consumer (Phase 10's map) already distinguishes this state and because the product's own domain rules (`CLAUDE.md`) require labeling all positions as approximate regardless.

**Future impact:** If Phase 10's visual QA finds the error visually objectionable at the map's zoom levels, the fix is isolated to the private `interpolatePosition()` helper inside `mission-simulation.ts` — no public signature changes, no consumer changes required.

---

## ADR-P9-03 — The Pure Engine Does Not Validate Its Input

**Status:** Accepted

**Context:** `calculateMissionGeometry()` could defensively validate its input (reject NaN coordinates, reject unsorted route points, reject negative speed) and throw, or it could trust its caller and simply compute whatever the math produces for any input, including malformed input.

**Decision:** The pure engine performs no input validation and never throws. All validation happens at the boundary: Zod validates the HTTP request shape (`06-API.md` §2.2), and upstream Phase 6/7 validation already guarantees Mission/Route data is well-formed by the time it reaches Phase 9. Malformed input to the pure function is explicitly "undefined behavior, not a runtime-checked error" (see `02-REQUIREMENTS.md` §4 EC-7/EC-8, FS-5).

**Alternatives considered:**
1. *Defensive validation with thrown errors inside the pure function.* Rejected — this would duplicate validation that already happened upstream (violates DRY / this project's general anti-duplication stance), and a throwing "pure" function is a contradiction: purity is about determinism and no side effects, and while throwing doesn't strictly violate determinism, layering exception-based control flow into a math-only function adds a second, redundant validation surface that can drift out of sync with the real upstream rules over time.
2. *Return a `Result<T, Error>`-style discriminated union instead of throwing or trusting.* Rejected as unnecessary ceremony — no other pure function in this codebase (`estimateMission`, `deriveMissionDisplayStatus`, `computeRouteDistances`) uses this pattern; introducing it here alone would be inconsistent.

**Trade-offs:** A future caller that bypasses the loader and calls `calculateMissionGeometry()` directly with bad data gets silently wrong numbers instead of a clear error. Mitigated by TypeScript's type system (the input shape is still statically enforced) and by this being explicitly documented (test N1 exists specifically to make this visible in the test suite, not to hide it).

**Future impact:** Any future direct caller of the pure function (bypassing `SimulationContextLoader`) is responsible for its own input correctness — this must be called out in that future caller's own documentation, not assumed.

---

## ADR-P9-04 — Total Distance Is Derived From Geometry, Not Read From `Mission.distanceMeters`

**Status:** Accepted

**Context:** `Mission.distanceMeters` (BigInt) is already computed and stored by Phase 7 at publish/re-commit time. The simulation engine could simply read this stored value as `totalDistanceMeters`, or it could recompute it from the origin/destination/route-points geometry it already has in hand.

**Decision:** `MissionSnapshot` (the engine's input shape) does **not** include a `distanceMeters` field at all. `calculateMissionGeometry()` always derives `totalDistanceMeters` from the resolved route/fallback geometry (the last element of `cumulativeDistanceMeters`), exactly as shown in `05-IMPLEMENTATION.md` §9.

**Alternatives considered:**
1. *Pass `Mission.distanceMeters` in and use it directly, skipping the redundant recomputation.* Rejected — this would create two independently-maintained sources of "total distance" (the stored snapshot and the geometry-derived value) that could silently diverge if a future bug ever desynchronized them, and the engine would have no way to detect that divergence. Recomputing from geometry means the engine's output is *always* self-consistent with the geometry it actually used to compute position — `traveledMeters`, `remainingMeters`, and `totalDistanceMeters` can never contradict `position` because they all come from the same calculation pass.
2. *Pass both, and assert they match.* Rejected as unnecessary complexity — since the geometry-derived value is already correct and cheap to compute (no extra I/O, just arithmetic already being done), there is nothing to cross-check against that adds value.

**Trade-offs:** A theoretical, tiny amount of duplicate computation (recomputing a sum that was already computed once at publish time) — negligible at `O(log n)` / sub-millisecond scale, and not observable to any user.

**Future impact:** If `Mission.distanceMeters` and the live geometry-derived total ever legitimately diverge (e.g. a future feature allows editing route points without republishing), the simulation engine automatically reflects the *current* geometry, which is very likely the desired behavior for a "where is the vehicle now" calculation — not a latent bug to guard against.

---

## ADR-P9-05 — Status Derivation Is Reused Verbatim From Phase 7, Never Reimplemented

**Status:** Accepted

**Context:** `deriveMissionDisplayStatus()` already exists in `src/lib/domain/mission-rules.ts`, already unit-tested, already the single source of truth for `DRAFT | WAITING | IN_PROGRESS | ARRIVED | CANCELLED | ARCHIVED` derivation, used today for edit-locking (ADR-018) and UI badges.

**Decision:** `simulateMissionPosition()` imports and calls this function unmodified. Phase 9 introduces no second status state machine, no parallel enum, no reimplementation of the WAITING/IN_PROGRESS/ARRIVED boundary logic.

**Alternatives considered:**
1. *Write a Phase-9-specific status function tailored to simulation needs.* Rejected — would violate `CLAUDE.md`'s general anti-duplication stance and this project's demonstrated pattern (Phase 8 explicitly extracted shared components rather than duplicating wizard logic; the same discipline applies here).

**Trade-offs:** None identified — this is a pure win (less code, one source of truth, automatic consistency between the mission-edit-locking logic and the simulation-status logic).

**Future impact:** If `deriveMissionDisplayStatus()`'s behavior ever changes (e.g. a future `PAUSED` status is added), `simulateMissionPosition()` automatically inherits the new behavior for status, and only needs a corresponding new clamping rule added to its own small clamp table if the new status requires special geometry handling (see `05-IMPLEMENTATION.md` §10).

---

## ADR-P9-06 — No Caching Layer In Phase 9

**Status:** Accepted

**Context:** See `04-ARCHITECTURE.md` §10 for the full performance analysis. ADR-017 already establishes that Redis is not required at project start.

**Decision:** Phase 9 ships with zero caching at every layer (calculation, DB read, HTTP response).

**Alternatives considered:**
1. *Add an in-memory TTL cache for route points keyed by `(routeId, routeVersion)` now, since routes are immutable per version anyway.* Rejected for Phase 9 — no evidence yet that the DB read is a bottleneck; adding unused infrastructure ahead of a demonstrated need is exactly what `docs/IMPLEMENTATION_PLAN.md`'s "don't scaffold future phases" principle warns against.

**Trade-offs:** Under very high concurrent polling (not expected until Phase 10 defines its actual poll pattern), the repeated DB read could become measurable. Accepted as a known, deferred, documented risk rather than pre-built infrastructure.

**Future impact:** `04-ARCHITECTURE.md` §10 already specifies exactly where such a cache would go and what it would key on, so a future implementer does not need to re-derive the design — only to build it, if and when needed.

---

## ADR-P9-07 — Status Is Derived From Raw `viewTime`; Only Geometry Is Clamped

**Status:** Accepted

**Context:** For a cancelled mission, `docs/ARCHITECTURE_AND_DATA_MODEL.md` §5 requires that geometry freezes at cancellation time while `status` still correctly reads `CANCELLED`. There are two possible orders of operations: derive status from the clamped time, or derive status from the raw time and clamp only the geometry calculation afterward.

**Decision:** `deriveMissionDisplayStatus()` is always called with the raw, unclamped `viewTime`. Clamping is applied only to the `Date` passed into `calculateMissionGeometry()`. See `05-IMPLEMENTATION.md` §10 for the precise ordering and the worked explanation of why the reverse order is wrong.

**Alternatives considered:**
1. *Derive status from the clamped time.* Rejected — for a `CANCELLED` mission, `persistedStatus` alone already forces `deriveMissionDisplayStatus()` to return `"CANCELLED"` regardless of the time argument (per its existing implementation, which checks `persistedStatus === "CANCELLED"` first, before any time comparison) — so in practice this specific case is order-independent for `CANCELLED`. The decision is still recorded explicitly because a future status (e.g. a hypothetical `PAUSED` that *is* time-sensitive) would NOT be order-independent, and getting the convention right now prevents a subtle bug later.

**Trade-offs:** None for the current status set; this ADR exists primarily to pin the convention for future-proofing.

**Future impact:** Any future status addition to `MissionDisplayStatus` that depends on time comparison must be evaluated against this ordering convention before being wired into `simulateMissionPosition()`'s clamp table.

---

## ADR-P9-08 — Route Version Pinning Relies on the Foreign Key, Not a Redundant Version Lookup

**Status:** Accepted

**Context:** `Mission.routeId` is a foreign key to one specific, already-version-pinned `Route.id` row (each Route version is its own row per ADR-020's append-only versioning). `Mission.routeVersion` (an `Int?` column) is stored redundantly for display/audit purposes.

**Decision:** The loader (`getMissionSimulation()`) reads the route via the `route` relation (following `routeId`), which is already the correct pinned version by construction — no separate query filtering by `routeVersion` is needed. A defensive assertion (`mission.route?.version === mission.routeVersion`) guards against the two ever disagreeing, throwing `SIMULATION_ROUTE_SNAPSHOT_MISSING` if they do (data-integrity fault, not a normal-operation path).

**Alternatives considered:**
1. *Query `Route` independently by `{id: mission.routeId, version: mission.routeVersion}` instead of using the Prisma relation.* Rejected — redundant with what the relation already guarantees, adds a second query for no correctness benefit, and would itself need to handle the "what if they don't match" case identically.

**Trade-offs:** None identified.

**Future impact:** If a future migration ever changes how Route versioning works (e.g. moving away from ADR-020's one-row-per-version model), this loader's defensive assertion is the single place that would need to be revisited.

---

## ADR-P9-09 — All Three Roles Can Read the Simulation Endpoint

**Status:** Accepted

**Context:** Mission *mutation* endpoints (create/update/cancel/publish) are restricted to `ADMIN`+`MISSION_PLANNER`, excluding `STATUS_VIEWER` (Phase 7 precedent). The simulation endpoint is a pure read whose entire purpose is to eventually feed the map (`/map`), which all three roles can already view (Phase 4 precedent).

**Decision:** `GET /api/v1/missions/:id/simulate` allows `ADMIN`, `MISSION_PLANNER`, and `STATUS_VIEWER`.

**Alternatives considered:**
1. *Match the stricter mission-mutation role set (exclude `STATUS_VIEWER`).* Rejected — would make Phase 10's map (which `STATUS_VIEWER` can already load) unable to actually show vehicle positions to that role, defeating the purpose of the very consumer this endpoint exists to serve.

**Trade-offs:** None identified — this mirrors the existing, already-approved precedent for `/map`'s own read access (`docs/PROJECT_SPEC.md` §4 permission matrix) rather than inventing a new access tier.

**Future impact:** Phase 10 can rely on this endpoint (or its underlying service function) being readable by every role that can load the map, with no further permission changes needed in Phase 9's surface.
