# Phase 15 — 08 — Test Plan

Every test states **Purpose · Input · Expected**. IDs are referenced by `09-ACCEPTANCE.md` and `12-CHECKLIST.md`.

Conventions from the shipped suites: Vitest for unit, Playwright for e2e across the four viewports (`mobile-360`, `tablet-768`, `desktop-1024`, `desktop-1440`), Persian test names, self-contained per-file fixture helpers.

> **Numeric assertions must be delta-based.** The shared dev database already holds ~1,000 missions. Assert "this counter moved by exactly 1", never "this counter equals 3" — the pattern proven in Phase 13's suite.

---

## 1. Unit — transition table (`L`)

| ID | Purpose | Input | Expected |
|---|---|---|---|
| L-01 | Valid transition accepted | `canTransition("SCHEDULED","complete")` | `true` |
| L-02 | Valid transition accepted | `canTransition("SCHEDULED","fail")` | `true` |
| L-03 | Archive from each terminal state | `("COMPLETED"\|"FAILED"\|"CANCELLED","archive")` | `true` for all three |
| L-04 | Reopen only from completed/failed | `("COMPLETED","reopen")`, `("FAILED","reopen")` | `true` |
| L-05 | Reopen rejected from cancelled | `("CANCELLED","reopen")` | `false` |
| L-06 | Reopen rejected from archived | `("ARCHIVED","reopen")` | `false` |
| L-07 | Complete rejected from draft | `("DRAFT","complete")` | `false` |
| L-08 | Complete not idempotent | `("COMPLETED","complete")` | `false` |
| L-09 | Fail rejected from cancelled | `("CANCELLED","fail")` | `false` |
| L-10 | Archive rejected from active states | `("DRAFT"\|"SCHEDULED","archive")` | `false` |
| L-11 | Unknown action | `("SCHEDULED","teleport" as any)` | `false`, no throw |
| L-12 | `assertTransitionAllowed` throws typed error | `("DRAFT","complete")` | throws `DomainError` code `MISSION_INVALID_TRANSITION` |
| L-13 | Unarchive resolves prior state | `resolveTargetStatus("unarchive",{statusBeforeArchive:"FAILED"})` | `"FAILED"` |
| L-14 | Unarchive without prior state | `statusBeforeArchive: null` | throws `MISSION_INVALID_TRANSITION` |
| L-15 | Every table row is reachable | iterate `MISSION_TRANSITIONS` | every `from` value is a valid enum member; no duplicate `(action, from)` pair |

## 2. Unit — guards (`G`)

| ID | Purpose | Input | Expected |
|---|---|---|---|
| G-01 | Future arrival rejected | `actualArrivalAt = now + 1s` | throws `MISSION_ARRIVAL_IN_FUTURE` |
| G-02 | Arrival at exactly now accepted | `actualArrivalAt = now` | no throw |
| G-03 | Arrival before start rejected | `actualArrivalAt = startAt - 1ms` | throws `MISSION_ARRIVAL_BEFORE_START` |
| G-04 | Arrival exactly at start accepted (E1) | `actualArrivalAt = startAt` | no throw |
| G-05 | **Late arrival accepted** (LR-03) | `actualArrivalAt = eta + 4h` | no throw |
| G-06 | **Early arrival accepted** (LR-03) | `actualArrivalAt = eta - 2h` (≥ startAt) | no throw |
| G-07 | Arrival exactly at ETA accepted (E2) | `actualArrivalAt = eta` | no throw |
| G-08 | Departure before start rejected | `actualDepartureAt < startAt` | throws `MISSION_DEPARTURE_WINDOW_INVALID` |
| G-09 | Departure after arrival rejected | `actualDepartureAt > actualArrivalAt` | throws same |
| G-10 | Departure omitted accepted | `actualDepartureAt: null` | no throw |
| G-11 | Empty failure reason rejected | `failureReason: "  "` | throws `MISSION_FAILURE_REASON_REQUIRED` |
| G-12 | 2-char reason rejected, 3-char accepted | boundary | reject / accept |
| G-13 | 501-char reason rejected, 500 accepted | boundary | reject / accept |
| G-14 | Future `failedAt` rejected | `failedAt = now + 1s` | throws |
| G-15 | Empty reopen reason rejected | `reopenReason: ""` | throws `MISSION_REOPEN_REASON_REQUIRED` |

## 3. Unit — display status (`D`)

**These protect four downstream phases. Treat any failure as a four-phase regression.**

| ID | Purpose | Input | Expected |
|---|---|---|---|
| D-01 | Completed beats clock (before ETA) | `COMPLETED`, `viewTime < eta` | `"COMPLETED"` |
| D-02 | Completed beats clock (after ETA) | `COMPLETED`, `viewTime > eta` | `"COMPLETED"` |
| D-03 | Completed beats clock (before start) — E12 | `COMPLETED`, `viewTime < startAt` | `"COMPLETED"` |
| D-04 | Failed beats clock — E8 | `FAILED`, `viewTime > eta` | `"FAILED"` |
| D-05 | Archived still wins | `ARCHIVED` | `"ARCHIVED"` |
| D-06 | Cancelled unchanged | `CANCELLED` | `"CANCELLED"` |
| D-07 | Draft unchanged | `DRAFT` | `"DRAFT"` |
| D-08 | Scheduled before start | `SCHEDULED`, `viewTime < startAt` | `"WAITING"` |
| D-09 | Scheduled mid-flight | between | `"IN_PROGRESS"` |
| D-10 | Scheduled past ETA | `viewTime ≥ eta` | `"ARRIVED"` |
| D-11 | Boundary: exactly `startAt` | `viewTime = startAt` | `"IN_PROGRESS"` (existing rule preserved) |
| D-12 | Boundary: exactly `eta` | `viewTime = eta` | `"ARRIVED"` (existing rule preserved) |
| D-13 | Totality | every persisted value × three viewTimes | never throws; always returns a valid member |
| D-14 | **Regression: all pre-Phase-15 cases unchanged** | replay existing `mission-rules.test.ts` cases | identical results |

## 4. Unit — simulation freeze (`S`)

| ID | Purpose | Input | Expected |
|---|---|---|---|
| S-01 | Completed freezes at actual arrival | `COMPLETED`, `viewTime > actualArrivalAt` | position equals position at `actualArrivalAt` |
| S-02 | Failed freezes at `failedAt` | `FAILED`, `viewTime > failedAt` | position equals position at `failedAt` |
| S-03 | Cancelled freeze unchanged | existing case | identical to pre-Phase-15 |
| S-04 | No freeze before the freeze point | `viewTime < actualArrivalAt` | normal interpolation |
| S-05 | Geometry untouched | scheduled mission, any viewTime | byte-identical to pre-Phase-15 output |

## 5. Unit — concurrency helper (`C`)

| ID | Purpose | Input | Expected |
|---|---|---|---|
| C-01 | Version increments by one | v=7 → success | stored v=8 |
| C-02 | Mismatch throws | expected 7, stored 8 | `MISSION_VERSION_CONFLICT` |
| C-03 | Deleted row treated as conflict | soft-deleted, matching version | `MISSION_VERSION_CONFLICT` |
| C-04 | Version never decreases (I-08) | 20 sequential ops | strictly increasing |

## 6. Integration — services (`I`)

| ID | Purpose | Input | Expected |
|---|---|---|---|
| I-01 | Complete happy path | published mission, valid arrival | `COMPLETED`; `actualArrivalAt` stored; version +1 |
| I-02 | Complete settles shipments (LR-05) | 2 active shipments | both `DELIVERED`, `isActiveAssignment` false |
| I-03 | Complete writes audit | — | one `mission.completed` row with actor |
| I-04 | Complete rejected on draft | draft | `MISSION_INVALID_TRANSITION` |
| I-05 | Fail happy path | reason + classification | `FAILED`; fields stored |
| I-06 | Fail releases shipments (LR-08) | 2 active | both `WAITING_FOR_DISPATCH`, released |
| I-07 | Archive stores prior state | completed → archive | `ARCHIVED`, `statusBeforeArchive = COMPLETED` |
| I-08 | Unarchive restores exactly | above → unarchive | back to `COMPLETED`, `archivedAt` null |
| I-09 | Archive→unarchive→archive | thrice | each audited; final `ARCHIVED` |
| I-10 | Reopen clears terminal facts (I-12) | completed → reopen | `SCHEDULED`; arrival/failure fields null; `reopenCount` 1 |
| I-11 | Reopen re-acquires shipments | free shipments | `isActiveAssignment` true, `IN_TRANSIT` |
| I-12 | **Reopen blocked by rival assignment (LR-13)** | shipment assigned elsewhere | `SHIPMENT_ALREADY_ASSIGNED`; mission stays terminal |
| I-13 | Reopen twice | reopen ×2 | `reopenCount` 2 |
| I-14 | Planned fields never mutated (I-10) | any transition | `startAt`, `estimatedArrivalAt`, `speedSnapshotKmh`, `distanceMeters`, `routeVersion` byte-identical |
| I-15 | Zero-shipment mission completes (E5) | none active | success, no shipment writes |
| I-16 | Note added and listed | body | appears newest-first with author |
| I-17 | Note soft-deleted by author | — | excluded from list, row retained |
| I-18 | Note deletion by non-author non-admin | other planner | 403 |
| I-19 | Note on archived mission (E10) | archived | accepted |
| I-20 | Mission type deletion guarded | type in use | `MISSION_TYPE_IN_USE` |
| I-21 | Soft-deleted mission invisible | deleted, any transition | `MISSION_NOT_FOUND` |

## 7. Concurrency (`X`) — must be real, not simulated

| ID | Purpose | Input | Expected |
|---|---|---|---|
| X-01 | Two completes race | both hold v=3, fired in parallel | exactly one 200, one 409 `MISSION_VERSION_CONFLICT`; one `actualArrivalAt` stored |
| X-02 | Complete vs fail race | same version | exactly one wins; final state is that one, never a blend |
| X-03 | Stale edit after archive | edit with pre-archive version | 409; no write |
| X-04 | Notes do not conflict (CC-04) | two parallel notes | both persist |
| X-05 | Note does not bump version | add note | mission `version` unchanged |
| X-06 | Reopen races rival assignment | parallel reopen + publish of rival | exactly one succeeds; ADR-019 index holds |

## 8. API (`A`)

| ID | Purpose | Input | Expected |
|---|---|---|---|
| A-01 | Unauthenticated | no session | 401 |
| A-02 | Status Viewer forbidden | viewer session, each lifecycle endpoint | 403, no state change |
| A-03 | Planner allowed | planner session | 200 |
| A-04 | Admin allowed | admin session | 200 |
| A-05 | Missing `version` | body without it | 422 `MISSION_VERSION_REQUIRED` |
| A-06 | Malformed timestamp | `"yesterday"` | 422, no DB access |
| A-07 | Unknown classification | `"ALIEN_ABDUCTION"` | 422 |
| A-08 | Unknown mission | random uuid | 404 |
| A-09 | Invalid transition | complete a draft | 409 `MISSION_INVALID_TRANSITION` |
| A-10 | Error envelope shape | any failure | `{error:{code,message,fieldErrors}}`, Persian message |
| A-11 | Extended DTO present | `GET /missions/[id]` | new fields present; existing unchanged |
| A-12 | `arrivalVarianceMinutes` derived | completed 152 min late | `152` |
| A-13 | Variance null when incomplete | scheduled | `null` |
| A-14 | Summary gains counters | — | `completed`, `failed` present |
| A-15 | List filter accepts new values | `?persistedStatus=FAILED` | only failed returned |

## 9. E2E (`E`) — four viewports

| ID | Purpose | Steps | Expected |
|---|---|---|---|
| E-01 | Complete from detail | publish → open → complete → confirm | «تکمیل‌شده» badge; actual time shown |
| E-02 | Fail from detail | fail with reason + classification | «ناموفق»; reason visible |
| E-03 | Reason required | submit empty reason | inline error; no request sent |
| E-04 | Archive & unarchive | archive → unarchive | returns to prior state; both in history |
| E-05 | Reopen | complete → reopen with reason | back to «در انتظار حرکت»/«در حال حرکت» |
| E-06 | Controls hidden for viewer | viewer opens detail | no lifecycle buttons; endpoints 403 |
| E-07 | **Conflict surfaced** | two tabs, both complete | second shows Persian conflict message + reload; no silent overwrite |
| E-08 | History lists transitions | after several | each with actor + Jalali time |
| E-09 | Note thread | add, reload, delete | persists; ordered; soft-deleted vanishes |
| E-10 | Status in list | complete a mission | list shows «تکمیل‌شده»; filter finds it |
| E-11 | Keyboard operable | Tab/Enter/Escape | all actions reachable; dialogs close |
| E-12 | Mission type selectable | admin creates type; planner picks it | shown on detail |

## 10. Cross-phase regression (`R`) — the highest-value tests

| ID | Purpose | Steps | Expected |
|---|---|---|---|
| R-01 | **Map & dashboard agree** | complete a mission, read `/map/scene` and `/dashboard/summary` at same `viewTime` | both report it completed; counters reconcile |
| R-02 | Completed leaves live map | complete | no longer in the `SCHEDULED` scene query |
| R-03 | Dashboard counters still sum | after several transitions | distribution total = mission total (Phase 13 invariant) |
| R-04 | ARRIVED vs COMPLETED distinct | one clock-arrived, one confirmed | two different labels, two different counters |
| R-05 | Timeline scrub respects persisted state (E12) | scrub before completion | still «تکمیل‌شده» |
| R-06 | Phase 11 filters accept new statuses | filter by failed | table and markers agree |
| R-07 | **Existing suites unchanged** | run all pre-Phase-15 mission tests | all pass without modification |
| R-08 | Drill-down still works | dashboard KPI → filtered list | Phase 13 behaviour intact |

## 11. Performance (`P`)

| ID | Purpose | Input | Expected |
|---|---|---|---|
| P-01 | Transition latency | mission with 5 shipments | < 300 ms server-side |
| P-02 | No N+1 | complete with 20 shipments | constant query count |
| P-03 | Dashboard unregressed | before/after | within 10% |
| P-04 | Scene build unregressed | ~1,000 missions | within 10% |
| P-05 | Index effectiveness | `EXPLAIN` list-by-status | index scan, not sequential |

## 12. Negative & boundary summary

Covered above: G-01…G-15 (guards), L-05…L-12 (invalid transitions), A-01…A-09 (auth/validation), X-01…X-06 (races), I-12/I-21 (conflict & deletion), E-03/E-06/E-07 (UI negatives), plus edge cases E1–E14 from `02-REQUIREMENTS.md` §10, each mapped to a test above.

## 13. Coverage requirement

- `mission-lifecycle.ts` and the extended `deriveMissionDisplayStatus`: **100% branch coverage.** They are pure, small, and load-bearing for four phases — there is no excuse for an untested branch.
- Service layer: every transition's happy path, every guard rejection, every side effect.
- At least one **real** concurrency test (X-01) issuing genuinely parallel requests, not sequential calls pretending to race.
