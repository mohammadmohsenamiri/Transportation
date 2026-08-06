# 09 — Acceptance Criteria

## 1. Acceptance Criteria

| # | Criterion | Verification method |
|---|---|---|
| AC-1 | `calculateMissionGeometry()` exists at `src/lib/domain/mission-simulation.ts`, matches the exact signature in [05-IMPLEMENTATION.md](./05-IMPLEMENTATION.md) §2, and imports nothing beyond `@/lib/geo/distance` and `@/lib/domain/mission-rules`. | Code review + `npx tsc --noEmit` + manual import inspection |
| AC-2 | `simulateMissionPosition()` exists, reuses `deriveMissionDisplayStatus()` unmodified. | Code review; test S10 in [08-TESTS.md](./08-TESTS.md) |
| AC-3 | All 53 tests in [08-TESTS.md](./08-TESTS.md) exist and pass. | `npm run test` (unit) + `npm run test:e2e` (integration subset) |
| AC-4 | `npm run typecheck`, `npm run lint`, `npm run build` all succeed with zero new errors and zero new warnings beyond the two pre-existing `react-hooks/incompatible-library` warnings already present in the repository (`map-provider-form.tsx`, `organization-form.tsx` — unrelated to this phase). | CI-equivalent local run |
| AC-5 | Zero new Prisma migrations exist. | `git diff` on `prisma/migrations/` shows no new files |
| AC-6 | Zero new npm dependencies in `package.json`. | `git diff package.json` |
| AC-7 | Zero files under `src/app/(dashboard)/**` or any `.tsx` file created or modified. | `git diff --stat` |
| AC-8 | `GET /api/v1/missions/:id/simulate` exists, matches [06-API.md](./06-API.md) exactly (roles, status codes, response shape). | Integration tests I1–I9 |
| AC-9 | `docs/PHASE_STATUS.md` has a new Phase 9 completion record following the exact template every prior phase uses. | Document review |
| AC-10 | Determinism: running the full unit test suite twice in a row (`npm run test` twice) produces identical pass/fail results and, for any test asserting on a fixed input/output pair, bit-for-bit-identical numeric assertions both times. | Two consecutive local `npm run test` runs |

## 2. Definition of Done

Phase 9 is **Done** only when **all** of the following are true simultaneously:

1. All items in §1 (AC-1 through AC-10) are satisfied.
2. `12-CHECKLIST.md`'s Implementation, Review, Testing, and Documentation checklists are fully checked off.
3. No item from [01-SCOPE.md](./01-SCOPE.md) §4 (Out of Scope) or §7 (Must Not Implement) has been implemented.
4. `docs/IMPLEMENTATION_PLAN.md`'s Phase 9 section matches this pack's scope (already updated as part of this pack's introduction — the implementer must not need to touch it further, but must verify it still matches before declaring done).
5. A completion report is produced in the exact format `docs/IMPLEMENTATION_PLAN.md`'s "قالب گزارش پایان هر فاز" specifies, adapted for the no-UI nature of this phase per §3 below.

## 3. Demo Scenario (Adapted For a UI-Less Phase)

Every other phase in this project demonstrates itself through a clickable UI flow. Phase 9 has none, by design (see [01-SCOPE.md](./01-SCOPE.md) §2). Its demo scenario is therefore a **scripted, reproducible terminal walkthrough**, run and its output captured verbatim in the completion report:

```bash
# 1. Run the full targeted unit suite and show it passing
npx vitest run tests/unit/mission-simulation.test.ts

# 2. Demonstrate the algorithm interactively for a human reviewer:
#    a small, throwaway ts-node/tsx script (NOT committed to the repo) that:
#    - builds a MissionSnapshot for a mission with a known route
#    - calls simulateMissionPosition() at four view times:
#      before start / mid-trip / at ETA / after a simulated cancellation
#    - prints the four MissionSimulationResult objects as JSON
```

The product owner reviews the four printed JSON objects and confirms, by inspection:

- Before start: `status: "WAITING"`, `progressRatio: 0`, `position` equals origin.
- Mid-trip: `status: "IN_PROGRESS"`, `0 < progressRatio < 1`, `position` plausibly between origin and destination, `bearingDegrees` a sensible compass value.
- At ETA: `status: "ARRIVED"`, `progressRatio: 1`, `position` equals destination.
- After cancellation: `status: "CANCELLED"`, position frozen at the cancellation-time progress, not advanced further.

This scripted walkthrough MAY be kept as a scratch file during development but MUST NOT be committed to the repository as a permanent script, page, or endpoint (that would reintroduce UI/demo surface area this phase explicitly excludes) — it exists only to give the reviewer something to look at during sign-off. If the product owner wants a **permanent** way to explore this interactively, that is exactly the deferred simulation-lab page — see [11-OUT_OF_SCOPE.md](./11-OUT_OF_SCOPE.md) §2, owned by Phase 10.

## 4. Manual Verification Checklist

| Step | Expected result |
|---|---|
| Read `src/lib/domain/mission-simulation.ts` top to bottom | No import from `react`, `next/*`, `maplibre-gl`, or `@prisma/client` |
| Read `src/server/services/simulation-service.ts` | Exactly one exported function, one Prisma query, no calculation logic (all math delegated to `mission-simulation.ts`) |
| Read `src/app/api/v1/missions/[id]/simulate/route.ts` | No calculation logic, matches [06-API.md](./06-API.md) §3 contract |
| Run `git log --oneline -1 -- prisma/schema.prisma` before and after the phase | No new commit touches this file for this phase |
| Run `git diff --stat main` (or equivalent) at phase end | File list matches [00-README.md](./00-README.md) §5 exactly — no extra files |

## 5. Performance Targets (Restated From 02-REQUIREMENTS.md For Sign-Off)

| Metric | Target | Must be demonstrated via |
|---|---|---|
| `calculateMissionGeometry()` latency | `< 1 ms` avg | Test P1/P2 |
| `getMissionSimulation()` latency | `< 50 ms` p95 | Test P3 |
| Large route (10,000 points) | No behavioral or performance cliff | Test U23, P2 |

## 6. Quality Gates

| Gate | Threshold |
|---|---|
| Unit test pass rate | 100% (35/35 in `tests/unit/mission-simulation.test.ts`: U1–U23, S1–S10, B1–B3, N1–N2) |
| Integration test pass rate | 100% (9/9: I1–I9) |
| TypeScript strict mode | Zero errors, zero `any` without a written justification comment (per `CLAUDE.md` §2: "استفاده از `any` فقط با توضیح مکتوب و محدود") |
| ESLint | Zero new errors; zero new warnings |
| Production build | Succeeds; route count in the build output increases by exactly 1 (`/api/v1/missions/[id]/simulate`) |
