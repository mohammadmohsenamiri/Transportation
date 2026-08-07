# 11 — Out of Scope

Every item here is **intentionally excluded** from Phase 9. For each: what it is, why it is excluded now, and which future phase owns it.

## 1. Map Rendering (MapLibre, markers, clustering, popups)

**What:** Drawing a vehicle icon on a map, moving it, clustering nearby vehicles, click/tap interaction.
**Why excluded:** Explicit product-owner instruction — Phase 9 must remain independent from map-rendering libraries. Also a pure separation-of-concerns matter: rendering is a presentation-layer decision (which icon, which color, which animation easing) that has nothing to do with *where the vehicle is*, which is all Phase 9 computes.
**Owned by:** Phase 10 — `docs/IMPLEMENTATION_PLAN.md`, "نقشه عملیاتی پایه و حرکت خودروها."

## 2. `/system/simulation-lab` Admin Debug Page

**What:** `docs/IMPLEMENTATION_PLAN.md`'s original Phase 9 prose describes an internal, Admin/dev-only page where a user picks a Mission and a time, and sees the numeric result plus a single marker.
**Why excluded:** This is a UI page — a Next.js route, React components, a form, a marker rendered via MapLibre (even a "single marker" still requires the map-rendering library this phase must avoid). Building it would violate the explicit "no React, no Next.js UI components, no map libraries" constraint for this phase, no matter how minimal.
**Owned by:** Deferred to Phase 10, as an optional first sub-task before the full operational map, **at the product owner's discretion when Phase 10 starts** — because by the time Phase 10 begins, the real operational map will provide the same (and better) inspection capability, potentially making a separate "lab" page redundant. This pack does not decide that question; it only removes the obligation to build the lab page as part of Phase 9. See ADR-P9-01 in [ADR.md](./ADR.md) and ADR-024 in the main `docs/DECISIONS.md` for the full resolution, and the corresponding edit already made to `docs/IMPLEMENTATION_PLAN.md`'s Phase 9 section.

## 3. Persisting Computed Positions

**What:** Writing `position`/`progressRatio`/etc. to a database row, at any interval (per-second, per-minute, per-poll).
**Why excluded:** Forbidden by `CLAUDE.md` §2, explicitly: "موقعیت لحظه‌ای محاسبه‌شده را در هر tick در DB ذخیره نکن؛ source of truth داده‌های مأموریت، مسیر و زمان است." This is a permanent architectural rule for the whole product, not just this phase.
**Owned by:** No phase owns this — it is permanently out of scope for the product as currently specified, unless a future ADR explicitly revisits `CLAUDE.md`'s rule (which would require product-owner sign-off, not just an implementer's judgment call).

## 4. Real GPS Ingestion

**What:** Accepting a real device/telematics GPS feed and using it instead of (or alongside) computed position.
**Why excluded:** Not in this product's roadmap at all — `docs/PROJECT_SPEC.md` frames the entire product around GPS-free approximate tracking as the core value proposition, not a stopgap. Phase 9's `isEstimated: true` flag exists specifically to keep this door open without pretending otherwise today.
**Owned by:** Not currently owned by any phase in `docs/IMPLEMENTATION_PLAN.md`. Would require a new ADR and likely a new phase if ever pursued.

## 5. Geodesic-Exact Segment Interpolation (Turf.js `along` or equivalent)

**What:** Replacing linear lat/lng interpolation with true great-circle interpolation.
**Why excluded:** `docs/ARCHITECTURE_AND_DATA_MODEL.md` §5 explicitly accepts linear interpolation as sufficient ("پذیرفتنی است"). Adding Turf.js now would be a new dependency for a precision improvement with no stated requirement driving it (this project's own established precedent, per Phase 5, is to hand-roll the Haversine math it actually needs rather than pull in a geospatial library preemptively).
**Owned by:** No phase currently owns this. If Phase 10's visual QA reveals the linear-interpolation error is visually noticeable at the map's rendering scale (unlikely per the precision analysis in [05-IMPLEMENTATION.md](./05-IMPLEMENTATION.md) §6), it becomes a small, isolated follow-up inside `mission-simulation.ts`'s private interpolation helper — the public API would not change (see [04-ARCHITECTURE.md](./04-ARCHITECTURE.md) §11 extension points).

## 6. Live Polling Loop, WebSocket Push, Server-Sent Events

**What:** Any mechanism that pushes updated positions to a client without the client asking again.
**Why excluded:** Phase 9 is a pull-based calculation API. Deciding *how often* and *how* to refresh a rendered map is a rendering/UX decision, not a calculation-engine decision.
**Owned by:** Phase 10 (the map decides its own poll interval — `docs/ARCHITECTURE_AND_DATA_MODEL.md` §6 suggests 5 seconds as a starting point, but that is Phase 10's parameter to set, not Phase 9's).

## 7. Caching Table or Redis-Backed Cache

**What:** Any persistent or shared cache for simulation results or route-point lookups.
**Why excluded:** Not needed at current scale (see [04-ARCHITECTURE.md](./04-ARCHITECTURE.md) §10 performance analysis); ADR-017 already establishes that Redis is not required at project start and is added behind an interface only if/when throughput demands it.
**Owned by:** Deferred, unowned until a capacity test (Phase 17) demonstrates a real need.

## 8. Historical Position Seeker / Timeline Scrubber

**What:** A UI control letting a user drag a time slider and watch history replay.
**Why excluded:** This is entirely a UI/UX feature built *on top of* the engine (each scrub position is just another `viewTime` passed to `simulateMissionPosition()`); it has zero engine-level implications and is explicitly a later phase's UI work.
**Owned by:** Phase 12 — `docs/IMPLEMENTATION_PLAN.md`, "سیکر زمان زنده و تاریخی."

## 9. Multi-Mission Batch Simulation Endpoint

**What:** A single API call that simulates every active mission at once (needed by an operational map showing many vehicles simultaneously).
**Why excluded:** Phase 10 has not yet defined its exact query/filter pattern (which missions, what pagination, what fields it actually needs per marker) — building a batch endpoint now would be speculative design against unknown requirements, which `docs/IMPLEMENTATION_PLAN.md`'s own governing principle forbids ("قابلیت آینده با دکمه ظاهراً فعال شبیه‌سازی نشود" — the equivalent principle for APIs: don't build ahead of a defined need).
**Owned by:** Phase 10, as its own explicitly-designed endpoint (which will likely call `getMissionSimulation()`'s underlying query pattern in a loop or batched form — see [04-ARCHITECTURE.md](./04-ARCHITECTURE.md) §11).

## 10. Cross-Reference Table

| Excluded item | Owning phase | Reason category |
|---|---|---|
| Map rendering | Phase 10 | Explicit instruction |
| Simulation-lab page | Phase 10 (optional) | Explicit instruction |
| Position persistence | None (permanently forbidden) | `CLAUDE.md` rule |
| Real GPS | None (not on roadmap) | Product scope |
| Geodesic interpolation | Unowned / future refinement | Precision not currently required |
| Live push transport | Phase 10 | UX decision |
| Caching infrastructure | Unowned / Phase 17 if needed | Premature optimization |
| Historical seeker | Phase 12 | Separate phase in plan |
| Batch simulation endpoint | Phase 10 | Speculative without defined need |
