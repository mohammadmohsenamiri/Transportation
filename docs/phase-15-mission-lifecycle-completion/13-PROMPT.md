# Phase 15 — 13 — Implementation Prompt

Hand this file to the implementing Claude instance verbatim.

---

## ROLE

You are the implementation engineer for **Phase 15 — Mission Lifecycle Completion** of the Transportation Management System, a Persian RTL enterprise transport platform.

You are implementing production code. Every architectural decision has already been made and is recorded in this pack. **You are not asked to design; you are asked to build exactly what is specified.** If you believe a specification is wrong, say so and stop — do not silently substitute your own design.

## CONTEXT YOU MUST INTERNALISE BEFORE TYPING

**Mission Management already exists and ships.** Creation, editing, publishing, cancellation, duplication, validation, vehicle assignment, origin/destination selection, route assignment, ETA estimation, listing, detail and history were delivered in Phases 7–8 and are consumed by Phases 9–13. That is **11 service operations, 9 API routes, 11 UI modules and 9 test files** already in `main`.

Your job is to **extend** that module, not to rebuild it. If you find yourself re-authoring mission creation, you have gone wrong.

The gap you are closing, in one sentence:

> The system knows what was *planned* and what the *clock* implies, but has no way to record what actually *happened*.

## READING ORDER — non-negotiable

1. `PRE_IMPLEMENTATION_DEPENDENCY_REVIEW.md` — what already ships, and why this phase exists
2. `00-README.md` — purpose, goals, the governing invariant
3. `01-SCOPE.md` — exact boundary
4. `02-REQUIREMENTS.md` — every rule, numbered
5. `03-DOMAIN.md` — entities, invariants, **the three naming hazards**
6. `04-ARCHITECTURE.md` — layering, transition table, concurrency
7. `05-IMPLEMENTATION.md` — pseudocode and build order
8. `06-API.md` — contracts
9. `07-DATABASE.md` — schema and migration
10. `08-TESTS.md` — every test
11. `09-ACCEPTANCE.md` — Definition of Done
12. `10-NON_FUNCTIONAL.md`, `11-OUT_OF_SCOPE.md`, `12-CHECKLIST.md`
13. `ADR.md`, `FAQ.md`

Then, in the repository: `CLAUDE.md`, `docs/IMPLEMENTATION_PLAN.md` (Phase 15), `docs/DECISIONS.md` (especially ADR-005, ADR-006, ADR-015, ADR-018, ADR-019, ADR-029), `src/server/services/mission-service.ts`, `src/lib/domain/mission-rules.ts`.

## IMPLEMENTATION ORDER — strictly sequential

Follow `05-IMPLEMENTATION.md` §1. Each step must be green before the next begins:

1. Prisma migration
2. Labels
3. `mission-lifecycle.ts` (pure) + unit tests
4. Extend `deriveMissionDisplayStatus` + tests — **existing tests must still pass**
5. Extend simulation freeze + tests
6. Optimistic concurrency on existing mutations
7. New service operations
8. Zod schemas + API routes
9. Client hooks + UI
10. Cross-phase regression
11. Docs, ADRs, ship

## THE ONE INVARIANT THAT MATTERS MOST

> **A recorded terminal state always beats a clock-derived one.**

All four downstream consumers — map, mission table, timeline, dashboard — read status through `deriveMissionDisplayStatus()`. ADR-029 bound the dashboard to that function *precisely so its numbers can never diverge from the map's*.

Therefore: add `COMPLETED` and `FAILED` as short-circuits **before every clock comparison**, exactly where `CANCELLED` and `ARCHIVED` already sit. Do this and consistency is free. Do it anywhere else — or add a parallel status path — and you will silently break four phases.

## RESTRICTIONS

**Never:**
- Rebuild, fork or wrap anything from Phases 7–8
- Modify simulation maths (position, distance, bearing, ETA)
- Edit map rendering, dashboard widgets, or the timeline engine
- Put business logic in a component, route handler or Prisma callback
- Import from `src/features/**` inside a server service — it drags UI types and the Prisma client into the wrong bundle
- Import `@/lib/permissions/roles` (or anything reaching Prisma) into a `"use client"` component
- Use `any` without a written justification
- Add a runtime dependency
- Load anything from a CDN
- Overwrite `estimatedArrivalAt` with an actual time
- Merge `ARRIVED` and `COMPLETED`
- Auto-complete a mission when the clock passes its ETA
- Modify an applied migration
- Remove or reorder an existing enum value
- Implement anything in `11-OUT_OF_SCOPE.md`
- Work on more than this one phase

**Always:**
- Validate every input with Zod at the boundary
- Enforce every permission server-side
- Wrap each transition in one transaction, with the version check in the `UPDATE … WHERE`
- Write an audit entry for every transition, after commit
- Use set-based `updateMany` for shipment side effects
- Write Persian UI text and Persian error messages
- Use logical CSS properties
- Follow the existing `cancelMission` shape

## CODING STANDARDS

- TypeScript strict. No `any` without justification.
- Match surrounding style: Persian comments explaining **why**, not what.
- Domain layer: pure, no I/O, no framework imports.
- One rule in one place.
- Named constants over magic values.
- Errors are `DomainError` with a code, a Persian message, and field errors where applicable.
- New code should look like it was written by whoever wrote Phase 7.

## VERIFICATION — all mandatory

```bash
npm run typecheck
npm run lint          # zero errors
npm run test          # all unit tests
npm run build         # MANDATORY — see below
npx playwright test tests/e2e/mission-lifecycle.spec.ts
npx playwright test   # full regression
```

**`npm run build` is not optional and not redundant with typecheck.** Phase 13 shipped a bug where a client component imported a server-only module: `tsc` accepted it and the Turbopack build failed. Typecheck cannot catch client/server bundle violations.

**Triaging regression failures:** the shared dev database is large and some failures are pre-existing. Do **not** assert "environmental" without proof. Create a git worktree at the pre-Phase-15 commit and run the same spec there. If it fails identically, it is pre-existing — say so and cite the evidence. If it does not, it is yours — fix it.

## REPORTING FORMAT

Report progress after each of the 11 steps:

```
## Step N — <name>
Status: complete | blocked
Files: <changed/created>
Tests: <IDs> — N passed, M failed
Verification: typecheck ✓ | lint ✓ | build ✓
Notes: <decisions made, surprises found>
```

Final summary:

```
## Phase 15 Complete
Files changed: <list>
Migrations: <name>
Tests added: <counts by type>
Verification: typecheck / lint / unit / build / e2e / regression
Regression triage: <each failure, real or pre-existing, with evidence>
Known limitations: <honest list>
ADRs: ADR-P15-01 … ADR-P15-09
Commit: <sha>
```

Be honest. If tests fail, say so and show the output. If you skipped something, say which and why. Never report done when it is not.

## DEFINITION OF DONE

`09-ACCEPTANCE.md` in full. Summary:

- Migration clean; no backfill needed
- All quality gates pass, including `npm run build`
- 100% branch coverage on `mission-lifecycle.ts` and the extended `deriveMissionDisplayStatus`
- Every acceptance criterion AC-01 … AC-23 demonstrated
- **R-01 proven:** map and dashboard report the same status for the same mission at the same instant
- **X-01 proven:** two genuinely parallel completes → exactly one succeeds, one gets 409
- No pre-Phase-15 test modified to make new code pass
- Docs updated; ADRs recorded
- Committed and pushed directly to `main` — no pull request

## IF YOU GET STUCK

- Specification ambiguous → check `FAQ.md`, then `ADR.md`. If still unresolved, **ask** — do not guess.
- Specification appears wrong → stop and explain. Do not silently substitute a different design.
- A test seems impossible to satisfy → the implementation is probably wrong; do not weaken the test.
- Tempted to modify an existing test → almost certainly a real regression. Prove otherwise with a baseline worktree first.

Begin with step 1 only after reading every document listed above.
