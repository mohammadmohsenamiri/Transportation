# 12 — Checklists

Use these as literal, checkable lists during implementation and review. Do not mark an item done until it is verifiably true, not "probably true."

## 1. Implementation Checklist

- [ ] `src/lib/domain/mission-simulation.ts` created with exactly the exports listed in [05-IMPLEMENTATION.md](./05-IMPLEMENTATION.md) §2 — no more, no fewer.
- [ ] `resolveEffectivePoints`, `computeTraveledMeters`, `findSegmentIndex`, `interpolatePosition`, `bearingDegrees`, `computeEta`/`computeRemainingSeconds` implemented as **private** (non-exported) helpers, matching [05-IMPLEMENTATION.md](./05-IMPLEMENTATION.md) §3–§8.
- [ ] `calculateMissionGeometry()` implemented per [05-IMPLEMENTATION.md](./05-IMPLEMENTATION.md) §9.
- [ ] `simulateMissionPosition()` implemented per [05-IMPLEMENTATION.md](./05-IMPLEMENTATION.md) §10, importing `deriveMissionDisplayStatus` from `@/lib/domain/mission-rules` unmodified.
- [ ] No `Date.now()` / no-arg `new Date()` anywhere inside `mission-simulation.ts`.
- [ ] No import of `@prisma/client`, `react`, `next/*`, or `maplibre-gl` inside `mission-simulation.ts`.
- [ ] `src/lib/validation/simulation.ts` created with `simulateQuerySchema` per [06-API.md](./06-API.md) §2.2.
- [ ] `src/server/services/simulation-service.ts` created, exporting only `getMissionSimulation()`, containing the exact Prisma query from [07-DATABASE.md](./07-DATABASE.md) §3, including the `route.version === routeVersion` defensive assertion.
- [ ] `src/app/api/v1/missions/[id]/simulate/route.ts` created per [06-API.md](./06-API.md) §3 — thin handler, no calculation logic.
- [ ] `DomainError` codes used exactly as specified: `MISSION_NOT_FOUND`, `SIMULATION_INVALID_VIEW_TIME`, `SIMULATION_ROUTE_SNAPSHOT_MISSING`.
- [ ] Zero new files under `src/app/(dashboard)/**`.
- [ ] Zero `.tsx` files created or modified by this phase.
- [ ] Zero changes to `prisma/schema.prisma`.
- [ ] Zero new entries in `package.json` `dependencies`/`devDependencies`.
- [ ] Zero modifications to `src/lib/domain/mission-rules.ts` or `src/lib/domain/mission-estimate.ts`.

## 2. Review Checklist

- [ ] Every function in `mission-simulation.ts` has a single, clear responsibility matching [04-ARCHITECTURE.md](./04-ARCHITECTURE.md) §6's SOLID table.
- [ ] Binary search (Algorithm 3) is genuinely `O(log n)` — no accidental linear scan hiding inside (check for `.find()`, `.filter()`, or a `for` loop over the full `routePoints` array anywhere in the hot path).
- [ ] `bearingDegrees` is `null` exactly when the spec says it must be (`totalDistanceMeters === 0`, or every remaining segment is zero-length) — not `0`-defaulted anywhere.
- [ ] `isFallbackDirect` is `true` exactly when `routePoints` has fewer than 2 points, and `false` otherwise — including the `B2` case of a genuine 2-point route (must not be miscategorized as fallback).
- [ ] `simulateMissionPosition()` computes `status` from the **raw, unclamped** `viewTime`, and only clamps the time fed into the geometry calculation — not the other way around (this ordering is called out explicitly in [05-IMPLEMENTATION.md](./05-IMPLEMENTATION.md) §10 because it is easy to get backwards).
- [ ] `isEstimated` is typed as the TypeScript literal `true`, not `boolean`.
- [ ] The HTTP route handler's role list matches [06-API.md](./06-API.md) §2 exactly (`ADMIN`, `MISSION_PLANNER`, `STATUS_VIEWER` — all three, unlike mission-mutation endpoints which exclude `STATUS_VIEWER`).
- [ ] No `console.log`/`console.warn`/`console.error` inside `mission-simulation.ts` (per [10-NON_FUNCTIONAL.md](./10-NON_FUNCTIONAL.md) §5).
- [ ] No audit-log call added for the new `GET` endpoint (per [06-API.md](./06-API.md) §5 — it is a pure read).
- [ ] Code comments, if any, explain *why*, not *what* — matching this repository's general comment discipline.

## 3. Testing Checklist

- [ ] All 35 tests in `tests/unit/mission-simulation.test.ts` (U1–U23, S1–S10, B1–B3, N1–N2) exist and pass.
- [ ] All 9 integration scenarios (I1–I9) covered, in whichever file/framework matches this repository's existing convention for service-layer tests (see [08-TESTS.md](./08-TESTS.md) §5's explicit "decision required" note if the convention is ambiguous at implementation time).
- [ ] Performance tests P1–P3 pass against their stated thresholds.
- [ ] Memory test M1 and concurrency tests C1–C2 pass.
- [ ] `npm run test` full suite (not just the new file) still passes — zero regressions in the 115 pre-existing unit tests.
- [ ] `npm run test:e2e` full suite still passes — zero regressions in the 168 pre-existing Playwright tests, across all 4 viewport projects.
- [ ] Test descriptions (`describe`/`it` strings) are in English, matching `mission-rules.test.ts`/`mission-estimate.test.ts` convention (see [08-TESTS.md](./08-TESTS.md) §0).
- [ ] Floating-point assertions use `toBeCloseTo`, not `toBe`, except where the algorithm defines an exact literal (documented per-test in [08-TESTS.md](./08-TESTS.md) §1).

## 4. Documentation Checklist

- [ ] `docs/PHASE_STATUS.md` updated with a Phase 9 record following the exact template (`Status`, `Started`, `Completed`, `Visible output URL` — adapted per [09-ACCEPTANCE.md](./09-ACCEPTANCE.md) §3 since there is no URL — `Demo account/data`, `Branch/PR/Commit`, `Migrations: ندارد`, `Key files`, `Tests executed`, `Manual demo steps` (the scripted walkthrough), `Offline/network verification`, `Known limitations`, `Deferred items` (cross-referencing [11-OUT_OF_SCOPE.md](./11-OUT_OF_SCOPE.md)), `Decisions added/changed` (reference ADR-024 and this pack's own `ADR.md`)).
- [ ] `README.md`'s "وضعیت فعلی" line updated to include Phase 9, worded to make clear it shipped an engine, not a page (to avoid a future reader assuming there is a `/system/simulation-lab` route to visit).
- [ ] This pack's own `ADR.md` entries cross-checked against the corresponding compact entries added to the main `docs/DECISIONS.md` (ADR-024 onward) — the main file must not contradict this pack's fuller versions.
- [ ] Any deviation discovered *during* implementation from what this pack specifies is written back into this pack (or flagged for pack maintainers) before being merged — this pack is meant to stay accurate, not become stale the moment implementation starts.

## 5. Release Checklist

- [ ] `npm run lint && npm run typecheck && npm run test && npm run build` all green, run as the very last step before committing.
- [ ] `npx playwright test` full 4-viewport run green (or explicitly re-run for any file touched — but note Phase 9 should touch zero existing test files, so a full regression run is a sanity check, not an expected-diff review).
- [ ] Git diff reviewed for anything unexpected (stray debug files, accidental `.env` changes, anything outside the file list in [00-README.md](./00-README.md) §5) — matching this project's standing pre-commit review habit.
- [ ] Commit message written in the same style as prior phase commits (imperative summary + short body explaining *why*, `Co-Authored-By` trailer per this project's established Git workflow).
- [ ] Direct push to `main` (no PR) — matching this project's standing preference, unless the user has since changed that preference.
