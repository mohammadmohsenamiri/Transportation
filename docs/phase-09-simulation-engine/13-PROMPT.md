# 13 — Implementation Kickoff Prompt

This is the prompt to give a fresh Claude Code session to implement Phase 9. It assumes the session has access to this repository (`D:\Projects\Transportation`) and no other context.

---

## Prompt (copy from here)

You are implementing **Phase 9 — Simulation Engine** of the Transportation project, a Persian/RTL transportation management system built with Next.js 16, Prisma 7, PostgreSQL, and TypeScript strict mode.

A complete Development Pack for this phase already exists at `docs/phase-09-simulation-engine/`. It removes essentially all design ambiguity — your job is disciplined implementation and verification against that pack, not architecture design.

### How to start

1. Read `CLAUDE.md` at the repository root first — it is the binding, non-negotiable rule set for this entire repository and overrides anything that seems to conflict with it (though the dev pack has already been written to comply with it).
2. Read the dev pack in this exact order:
   1. `docs/phase-09-simulation-engine/00-README.md`
   2. `01-SCOPE.md`
   3. `02-REQUIREMENTS.md`
   4. `03-DOMAIN.md`
   5. `04-ARCHITECTURE.md`
   6. `05-IMPLEMENTATION.md`
   7. `06-API.md`
   8. `07-DATABASE.md`
   9. `08-TESTS.md`
   10. `09-ACCEPTANCE.md`
   11. `10-NON_FUNCTIONAL.md`
   12. `11-OUT_OF_SCOPE.md`
   13. `ADR.md`
   14. `FAQ.md` (skim now, refer back to it whenever you hit a question — it likely already has the answer)
3. Also skim these existing files, since Phase 9 reuses them directly and you must not reimplement or modify them:
   - `src/lib/geo/distance.ts`
   - `src/lib/domain/mission-rules.ts`
   - `src/lib/domain/mission-estimate.ts`
   - `src/server/services/mission-service.ts` (for the existing `DomainError`/route-handler patterns to match)
   - Any one existing route handler under `src/app/api/v1/missions/**` (for the thin-handler pattern)
   - Any one existing unit test file, e.g. `tests/unit/mission-rules.test.ts` (for test-writing conventions)
4. Read `docs/PHASE_STATUS.md`'s most recent entries (Phase 7, Phase 8) to see the exact completion-report format you must reproduce at the end.

### Implementation order

Follow this order — later steps depend on earlier ones being correct:

1. `src/lib/domain/mission-simulation.ts` — the pure engine. Implement and unit-test this **completely** (all of §1 and §2 in `08-TESTS.md`) before touching anything else. Do not proceed to step 2 until `npx vitest run tests/unit/mission-simulation.test.ts` is 100% green.
2. `src/lib/validation/simulation.ts` — the Zod query schema.
3. `src/server/services/simulation-service.ts` — the DB loader.
4. `src/app/api/v1/missions/[id]/simulate/route.ts` — the HTTP handler.
5. Integration tests (I1–I9 in `08-TESTS.md` §5) — reuse the fixture-building pattern from `tests/e2e/missions.spec.ts`'s `buildMissionFixtures()`.
6. Run the full verification suite (see `12-CHECKLIST.md` §5) — not just the new tests, the **entire** existing suite, to prove zero regressions.
7. Update `docs/PHASE_STATUS.md` with the Phase 9 completion record, and `README.md`'s status line.
8. Produce the completion report described in `09-ACCEPTANCE.md` §2 item 5 and present it to the user before committing.

### Restrictions (hard rules, restated from `01-SCOPE.md` §7 — violating any of these means stop and re-read the pack, not push through)

- No file under `src/app/(dashboard)/**`.
- No `.tsx` file created or modified.
- No import of `react`, `next/navigation`, `next/link`, or `maplibre-gl` inside `src/lib/domain/mission-simulation.ts` or `src/server/services/simulation-service.ts`.
- No Prisma migration.
- No new npm dependency.
- No persisted computed position, ever.
- No modification to `mission-rules.ts` or `mission-estimate.ts` — import and reuse only.
- No `/system/simulation-lab` page or any other UI — see `11-OUT_OF_SCOPE.md` if you feel the urge to build one "for demo purposes." The demo is the scripted terminal walkthrough in `09-ACCEPTANCE.md` §3, not a page.

### If you find an ambiguity this pack does not resolve

1. Check `FAQ.md` first — it very likely already answers it.
2. If it truly is not covered, make the smallest, most conservative decision consistent with the rest of the pack's stated philosophy (pure core / thin service / thin transport, reuse over reimplementation, explicit over implicit), implement it, and **write down what you decided and why** in your final report so the pack can be amended afterward. Do not silently improvise something that contradicts an existing stated rule.
3. Do not ask the product owner to resolve something this pack already answers — that wastes their time and signals you did not read it.

### Reporting format

At the end of implementation, produce a report using this project's standard phase-completion template (see `docs/IMPLEMENTATION_PLAN.md`, "قالب گزارش پایان هر فاز"), filled in for Phase 9:

```text
Phase: 9 — Simulation Engine
Status: DONE
Visible output URL: (none — see 09-ACCEPTANCE.md §3 for the adapted demo method)
Demo account/data: (fixtures used for integration tests, if any)
Implemented scope: (bullet list matching 00-README.md §5 deliverables)
Files changed: (exact list)
Migration: ندارد
Automated tests: (exact pass counts: unit / integration / full-suite regression)
Manual demo steps: (the scripted walkthrough output, or a summary of it)
Offline/network check: (confirm zero network calls introduced)
Known limitations: (cross-reference 11-OUT_OF_SCOPE.md)
Deferred items: (cross-reference 11-OUT_OF_SCOPE.md §10 table)
Decisions changed: (ADR-024 in docs/DECISIONS.md; any new decisions you had to make per the ambiguity-resolution process above)
Commit/PR: (commit hash, direct-to-main per this project's standing preference)
```

### Completion Criteria

You are done when every box in `docs/phase-09-simulation-engine/12-CHECKLIST.md` is checked, `09-ACCEPTANCE.md`'s Definition of Done is fully satisfied, and the report above has been presented to the user. Do not start Phase 10 in the same session unless explicitly asked — this repository's standing rule is one phase per request/session.

---

## End of prompt
