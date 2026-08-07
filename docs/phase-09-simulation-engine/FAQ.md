# FAQ — Phase 9 Simulation Engine

Organized by category. If your question isn't here, it may still be answered in one of the numbered documents — check there before treating this as incomplete.

## Scope & Boundaries

**Q1. `docs/IMPLEMENTATION_PLAN.md` says Phase 9 includes a `/system/simulation-lab` page. Do I build it?**
No. See `01-SCOPE.md` §2 and `ADR.md` ADR-P9-01. This pack overrides that prose on explicit product-owner instruction, and `docs/IMPLEMENTATION_PLAN.md` has already been edited to match as part of introducing this pack. If you find the old wording still present anywhere, that is a documentation bug — flag it, don't build the page.

**Q2. Am I allowed to write ANY React code at all, even a tiny debug component?**
No. Zero `.tsx` files. Zero React imports anywhere in this phase's deliverables. See `01-SCOPE.md` §7.

**Q3. Can I add a temporary script to manually try out the engine while developing?**
Yes, as a local, uncommitted scratch file (e.g. run via `tsx`) — this is explicitly how `09-ACCEPTANCE.md` §3 expects you to produce the demo walkthrough output. Do not commit it, do not turn it into an npm script, do not add it to `package.json`.

**Q4. Is a Next.js API route considered "UI"?**
No. `01-SCOPE.md` and `04-ARCHITECTURE.md` are explicit: the restriction is on React/Next.js **UI components** and map-rendering libraries, not on server-side route handlers. `src/app/api/v1/missions/[id]/simulate/route.ts` is allowed and required — it renders nothing, it's a JSON endpoint.

**Q5. Does Phase 9 touch the `Vehicle` model at all?**
No, not even to read it. `Mission.speedSnapshotKmh` already has everything needed. See `03-DOMAIN.md` §2 and business rule BR-2 in `02-REQUIREMENTS.md`.

**Q6. What exactly counts as "done" if there's no page to click through?**
`09-ACCEPTANCE.md` §2–§3 define this precisely: all acceptance criteria (AC-1–AC-10) satisfied, all checklist items in `12-CHECKLIST.md` checked, and a scripted terminal walkthrough's output reviewed instead of a UI demo.

## Algorithm

**Q7. Why linear interpolation instead of a "proper" geodesic formula?**
See `ADR.md` ADR-P9-02 and `05-IMPLEMENTATION.md` §6. Short version: the architecture doc already says linear is acceptable, this codebase avoids adding geospatial dependencies it doesn't strictly need (Phase 5 precedent), and the precision loss is negligible except on very long fallback-direct segments, which are already visually flagged as approximate.

**Q8. What if `traveledMeters` lands exactly on a route point (not strictly inside a segment)?**
See `05-IMPLEMENTATION.md` §5's worked example. The binary search resolves this to the segment *starting* at that point (i.e., the direction the vehicle is about to travel next), except at the very end of the route, where it clamps to the last real segment instead of an out-of-bounds one.

**Q9. What bearing do I report for a mission that hasn't started moving yet (`viewTime < startAt`)?**
The bearing of the first segment (origin → the next point), computed exactly the same way as any other bearing — there's nothing special about "not yet moved" for bearing purposes; the vehicle's *intended initial direction* is still well-defined. See test U1's expected behavior in `08-TESTS.md`.

**Q10. What if two consecutive route points have the exact same coordinates?**
See `02-REQUIREMENTS.md` EC-13 and `05-IMPLEMENTATION.md` §7's zero-length-segment walk-forward rule for bearing. Position interpolation at that point just returns the (identical) coordinates; bearing walks forward to the next non-zero-length segment, or returns `null` if none exists.

**Q11. Why does `MissionSnapshot` not include `Mission.distanceMeters`?**
Deliberate — see `ADR.md` ADR-P9-04. Total distance is always derived fresh from the geometry the engine is already processing, so it can never contradict the position it computed.

**Q12. Should `simulation-service.ts` have its own dedicated Vitest integration test file, or rely on Playwright e2e like `mission-service.ts` currently does?**
`08-TESTS.md` §5 flags this explicitly as an implementer decision, not fixed by this pack — because as of this pack's writing, `mission-service.ts` (Phase 7) has no dedicated Vitest file and is only tested via `tests/e2e/missions.spec.ts`. Match whatever convention is current in the repository at implementation time; if it's still Playwright-only for services, do the same here for consistency, and note the choice in your final report.

**Q13. What happens for a Mission whose `estimatedArrivalAt` equals its `startAt` exactly (zero-duration trip)?**
This only occurs in the `speedKmh <= 0` defensive path (EC-6) or the zero-distance path (EC-5) — both are fully specified in `02-REQUIREMENTS.md` §4 and covered by tests U6, U18, U19.

**Q14. Do I need to handle time zones?**
No. Every `Date` in this engine is treated as an opaque UTC instant via `.getTime()`. Jalali/local-time conversion is strictly a UI-boundary concern (`src/lib/dates/jalali.ts`) that Phase 9 never touches — see `01-SCOPE.md` §5.

## Data & Persistence

**Q15. Do I need a Prisma migration for anything?**
No. Zero schema changes. See `07-DATABASE.md` §1–§2.

**Q16. Where do route points come from if the Mission has no `routeId`?**
They don't — `routePoints` is `undefined` (or an empty array), and the engine falls back to a synthetic 2-point "route" made of origin and destination (`05-IMPLEMENTATION.md` §3, Algorithm 1).

**Q17. Can I store the computed position anywhere, even temporarily, for debugging?**
Not in the database, ever (`CLAUDE.md` §2, restated in `01-SCOPE.md` §7 item 6). Logging to your own terminal during local development is fine; that's not persistence.

**Q18. What if `Mission.routeId` is set but the route was somehow deleted?**
`Route` rows are never hard-deleted in this codebase in a way that would orphan a Mission under normal operation (soft-delete + Phase 5's versioning discipline). If the loader's Prisma query genuinely can't resolve the relation, this manifests as the `mission.route` being `null` while `mission.routeId` is non-null — the defensive assertion in `ADR-P9-08`/`07-DATABASE.md` §3 catches this and throws `SIMULATION_ROUTE_SNAPSHOT_MISSING`.

## API & Errors

**Q19. Why does the simulate endpoint allow `STATUS_VIEWER` when mission mutation endpoints don't?**
See `ADR.md` ADR-P9-09. It mirrors `/map`'s existing read-access precedent, not mission-mutation's stricter precedent, because this endpoint's entire purpose is to eventually feed the map that `STATUS_VIEWER` can already see.

**Q20. What HTTP method is the endpoint?**
`GET` only. See `06-API.md` §4 — Phase 9 introduces zero write endpoints.

**Q21. What if `viewTime` is omitted from the query string?**
Defaults to the server's current time at the moment the route handler runs. See `06-API.md` §2.1 and Failure Scenario FS-3 in `02-REQUIREMENTS.md`.

**Q22. Should this endpoint be audit-logged?**
No. See `06-API.md` §5 — it's a pure read, matching every other `GET` endpoint in this codebase, none of which are audited.

**Q23. What error code do I use if the Mission exists but its route snapshot is corrupted?**
`SIMULATION_ROUTE_SNAPSHOT_MISSING`, HTTP `500` (a data-integrity fault, not a user input error — see `06-API.md` §2.4).

## Testing

**Q24. Are test descriptions in Persian or English?**
English — matching `mission-rules.test.ts`/`mission-estimate.test.ts`. Persian is reserved for Playwright e2e test titles in this codebase, never Vitest unit test titles. See `08-TESTS.md` §0.

**Q25. How precise do floating-point assertions need to be?**
Use `toBeCloseTo`, not `toBe`, for any computed coordinate/ratio/distance — except where the algorithm defines an exact literal output (e.g. `progressRatio === 1` at arrival). See `08-TESTS.md` §0 and §11.

**Q26. Do I need load/stress tests for thousands of concurrent missions?**
No — that's explicitly Phase 17's job (capacity testing). Phase 9's performance tests (P1–P3) only need to prove the algorithm itself isn't the bottleneck at documented baseline scale. See `08-TESTS.md` §7.

**Q27. How many tests are required minimum?**
53 (see `08-TESTS.md` §11's summary table: 35 in the main unit file + 9 integration + memory/concurrency split across both). This is a floor, not a ceiling — add more if you find a real edge case this pack missed, and note it in your final report.

## Process

**Q28. I found an ambiguity this pack doesn't resolve. What do I do?**
Check this FAQ first, then follow the three-step process in `13-PROMPT.md`'s "If you find an ambiguity" section: make the smallest decision consistent with the pack's stated philosophy, implement it, and document what you decided and why in your final report.

**Q29. Can I start Phase 10 once Phase 9 is done, in the same session?**
No, unless the user explicitly asks for it in the same request. This repository's standing rule (enforced across every prior phase) is one phase per request/session. See `13-PROMPT.md`'s Completion Criteria.

**Q30. Do I need to update `docs/DECISIONS.md` (the main one, not this pack's `ADR.md`)?**
It should already have ADR-024 (and any subsequent numbers) added as part of introducing this pack, pointing back to this pack's fuller `ADR.md`. Verify it's present and consistent; you shouldn't need to add new entries there unless you made a genuinely new architectural decision not already covered by ADR-P9-01 through ADR-P9-09.

**Q31. Where does the completion report go — a new file, or just chat output?**
Chat output to the user at the end of implementation, in the format `13-PROMPT.md` specifies — matching how every prior phase in this project has reported completion (as a message to the user, with `docs/PHASE_STATUS.md` as the permanent written record).

**Q32. What if the existing repository state has drifted from what this pack assumes (e.g. a file this pack references was renamed since it was written)?**
Trust the actual repository over this pack for *facts* (file existence, exact current signatures) — re-read the real file before assuming this pack's quoted snippet is still accurate — but trust this pack over your own judgment for *decisions* (what the design should be). If a referenced file genuinely no longer exists or has a materially different shape than described, treat that as the ambiguity-resolution process in Q28 applies, and flag it prominently in your final report.
