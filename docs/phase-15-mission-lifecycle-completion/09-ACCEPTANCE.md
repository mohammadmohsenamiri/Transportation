# Phase 15 — 09 — Acceptance

The phase is Done only when every box here is checked with evidence.

---

## 1. Definition of Done

Inherits `CLAUDE.md` §4 in full, plus this phase's specifics.

| # | Criterion | Evidence |
|---|---|---|
| 1 | Migration and seed run without error | `prisma migrate dev` + `prisma generate` clean |
| 2 | `npm run lint` — **zero errors** | only the 2 known pre-existing `react-hooks/incompatible-library` warnings |
| 3 | `npm run typecheck` clean | — |
| 4 | `npm run test` — all unit tests pass | includes every `L`/`G`/`D`/`S`/`C` test |
| 5 | **`npm run build` succeeds** | ⚠ mandatory, not optional — see §6 |
| 6 | Permissions tested server-side, not just hidden in UI | A-01…A-04, E-06 |
| 7 | loading / empty / error / success / destructive-confirm states present | E-01…E-05 |
| 8 | Usable at 360 / 768 / 1024 / 1440 and with touch | E-tests on four Playwright projects |
| 9 | Dark + light, RTL, long Persian text, keyboard navigation verified | E-11 + manual |
| 10 | No unintended runtime internet request | OF-01 |
| 11 | `PHASE_STATUS.md`, `README.md`, ADRs updated | — |
| 12 | Summary lists changed files, migrations, tests, remaining limits | — |

## 2. Acceptance criteria

### 2.1 Lifecycle

| # | Criterion | Test |
|---|---|---|
| AC-01 | A `SCHEDULED` mission can be completed with an actual arrival time | I-01, E-01 |
| AC-02 | A `SCHEDULED` mission can be failed with reason + classification | I-05, E-02 |
| AC-03 | Terminal missions can be archived and unarchived, restoring the exact prior state | I-07, I-08, E-04 |
| AC-04 | Completed/failed missions can be reopened with a reason | I-10, E-05 |
| AC-05 | Every invalid transition in `02-REQUIREMENTS.md` §2.3 is rejected | L-05…L-12, A-09 |
| AC-06 | Every transition writes audit and appears in history | I-03, E-08 |

### 2.2 The governing invariant

| # | Criterion | Test |
|---|---|---|
| AC-07 | Persisted terminal status always beats clock-derived status, at any `viewTime` | D-01…D-05 |
| AC-08 | **Map and dashboard report the same status for the same mission at the same instant** | R-01 |
| AC-09 | `ARRIVED` and `COMPLETED` remain visibly and numerically distinct | R-04 |
| AC-10 | Timeline scrubbing does not resurrect a terminal mission | R-05, D-03 |
| AC-11 | Completed/failed missions freeze in the simulation | S-01, S-02 |
| AC-12 | No pre-Phase-15 behaviour changes | D-14, S-05, R-07 |

### 2.3 Concurrency

| # | Criterion | Test |
|---|---|---|
| AC-13 | Two concurrent mutations: exactly one succeeds | X-01, X-02 |
| AC-14 | The loser gets a clear, recoverable Persian conflict message — never a silent overwrite | E-07 |
| AC-15 | Notes never conflict and never bump `version` | X-04, X-05 |
| AC-16 | ADR-019's shipment lock still holds | X-06, I-12 |

### 2.4 Data integrity

| # | Criterion | Test |
|---|---|---|
| AC-17 | Planned fields are never mutated by a transition | I-14 |
| AC-18 | Reopen clears every terminal fact it reverses | I-10 |
| AC-19 | Every invariant in `03-DOMAIN.md` §5 holds after every transition | I-suite |
| AC-20 | Existing missions remain valid with no backfill | migration test |

### 2.5 Access control

| # | Criterion | Test |
|---|---|---|
| AC-21 | Status Viewer sees no lifecycle controls and is rejected at the API | A-02, E-06 |
| AC-22 | Admin and Planner can perform every transition | A-03, A-04 |
| AC-23 | Mission-type management is Admin-only | A-suite |

## 3. Quality gates

| Gate | Threshold |
|---|---|
| Branch coverage of `mission-lifecycle.ts` + extended `deriveMissionDisplayStatus` | **100%** |
| Lint errors | 0 |
| Type errors | 0 |
| New e2e tests passing on all four viewports | 100% |
| Pre-existing test suites | unchanged and passing |
| Real parallel concurrency test | at least one (X-01) |

## 4. Performance targets

| Metric | Target | Test |
|---|---|---|
| Single transition, server-side | < 300 ms | P-01 |
| Query count per transition | constant in shipment count | P-02 |
| Dashboard summary latency | within 10% of baseline | P-03 |
| Map scene build | within 10% of baseline | P-04 |
| List-by-status query plan | index scan | P-05 |

Baselines must be captured **before** starting, on the same database.

## 5. Demo scenarios

### D1 — Late arrival (the phase's raison d'être)
Publish a mission with a 2-hour ETA. Wait past the ETA — it displays «رسیده (تخمینی)». Complete it with an actual arrival 90 minutes later than the ETA. It becomes «تکمیل‌شده», detail shows planned vs actual side by side with a +90-minute variance, and the dashboard moves it from the estimated-arrival counter to the completed counter.

### D2 — Failure after apparent arrival (edge case E8)
Publish a short mission, let the clock pass its ETA so it shows «رسیده (تخمینی)», then fail it (`VEHICLE_BREAKDOWN`). It becomes «ناموفق» everywhere, its shipments return to «در انتظار ارسال» and can be planned onto a new mission.

### D3 — Concurrent edit
Open the same mission in two tabs. Complete in tab A. Attempt to fail in tab B. Tab B shows the Persian conflict message with a reload action; after reloading it correctly shows «تکمیل‌شده». **Nothing was overwritten.**

### D4 — Reopen with a rival assignment
Complete mission M (shipment S released). Assign S to mission N and publish. Attempt to reopen M → rejected with «یکی از مرسوله‌های این مأموریت هم‌اکنون به مأموریت دیگری تخصیص یافته است.» M stays completed.

### D5 — Archive lifecycle
Archive a completed and a failed mission; both leave active views. Unarchive each; each returns to exactly its prior state. History shows every step with actor and Jalali timestamp.

### D6 — Consistency sweep
With one mission in each of the eight display statuses, open dashboard, map, mission table and timeline. All four agree, on all four viewports, in both themes.

## 6. Manual verification

Beyond automated tests:

1. **Run `npm run build`.** Phase 13 shipped a bug that `tsc` accepted and Turbopack rejected — a client component importing a server-only module. Typecheck alone is not sufficient evidence.
2. **Disconnect the internet, keep the LAN.** Perform every transition (OF-03).
3. **Long Persian text.** 500-char failure reason and 2000-char note — no overflow, no clipping.
4. **Both themes, all four widths.** Every new badge and dialog.
5. **Keyboard only.** Complete a mission without a mouse.
6. **Screen reader.** Status change announced once, not repeatedly.
7. **Verify the label change.** «رسیده» became «رسیده (تخمینی)» — confirm no shipped test or copy still expects the bare label.

## 7. Rollout notes

- **One-way door.** Once any mission is completed or failed, rollback would destroy a business fact and PostgreSQL cannot remove enum values. Ship forward-only (`07-DATABASE.md` §6).
- **Breaking client change.** `PATCH /missions/[id]` and `POST /missions/[id]/cancel` now require `version`. The mission UI is the only client and ships together.
- **User-visible copy change.** The `ARRIVED` label gains «(تخمینی)». Announce it; do not let it surprise operators.
