# Phase 15 — 01 — Scope

Binding scope boundary for Phase 15. If a task is not listed in §1, it is out of scope; §2 and `11-OUT_OF_SCOPE.md` say why.

---

## 1. In scope

### 1.1 Domain & data

| ID | Item |
|---|---|
| S1 | Add `COMPLETED` and `FAILED` to `MissionPersistedStatus` (existing `ARCHIVED` reused, never redefined). |
| S2 | Add `COMPLETED` and `FAILED` to `MissionDisplayStatus`. |
| S3 | New enum `MissionFailureClassification`. |
| S4 | Actual-time fields on `Mission`: `actualDepartureAt`, `actualArrivalAt`, `failedAt`, `archivedAt`. |
| S5 | Failure fields on `Mission`: `failureReason`, `failureClassification`. |
| S6 | Reopen bookkeeping on `Mission`: `reopenCount`, `lastReopenedAt`. |
| S7 | Optimistic concurrency token on `Mission`: `version Int @default(0)`. |
| S8 | New reference-data model `MissionType` + nullable `Mission.missionTypeId`. |
| S9 | New model `MissionNote` (timestamped, authored thread). |
| S10 | One additive Prisma migration covering S1–S9. |

### 1.2 Pure rules

| ID | Item |
|---|---|
| S11 | New pure module `src/lib/domain/mission-lifecycle.ts`: transition table, guards, invariants, terminal-state predicates. No DB, no React. |
| S12 | Extend `deriveMissionDisplayStatus()` so persisted terminal states short-circuit the clock comparison (§4.2 of `00-README.md`). |
| S13 | Extend `simulateMissionPosition()`'s freeze rule to `COMPLETED` and `FAILED`, mirroring the existing `CANCELLED` behaviour. **Position/geometry maths is not otherwise touched.** |

### 1.3 Services

| ID | Item |
|---|---|
| S14 | `completeMission(id, input, actor)` — records actual arrival, settles shipments. |
| S15 | `failMission(id, input, actor)` — records reason + classification, releases shipments. |
| S16 | `archiveMission(id, actor)` / `unarchiveMission(id, actor)`. |
| S17 | `reopenMission(id, input, actor)` — returns a terminal mission to `SCHEDULED`. |
| S18 | Optimistic-concurrency enforcement on all mutating mission operations (existing and new) per ADR-P15-05. |
| S19 | `MissionType` CRUD service (reference data, Admin-managed). |
| S20 | `MissionNote` create/list/soft-delete service. |
| S21 | Audit + history entries for every new transition, matching the shipped `mission.cancelled` pattern. |

### 1.4 API

| ID | Item |
|---|---|
| S22 | `POST /api/v1/missions/[id]/complete` |
| S23 | `POST /api/v1/missions/[id]/fail` |
| S24 | `POST /api/v1/missions/[id]/archive` and `.../unarchive` |
| S25 | `POST /api/v1/missions/[id]/reopen` |
| S26 | `GET`/`POST`/`DELETE /api/v1/missions/[id]/notes` |
| S27 | `GET`/`POST`/`PATCH`/`DELETE /api/v1/mission-types` |
| S28 | Zod schema per endpoint; server-side role gate on every one. |

### 1.5 UI

| ID | Item |
|---|---|
| S29 | Lifecycle action affordances on mission detail (`mission-detail-view.tsx`): complete, fail, archive, reopen — each with a confirmation dialog carrying the required inputs. |
| S30 | Note thread panel on mission detail. |
| S31 | New statuses rendered wherever mission status is displayed: list, detail, operational table, map detail panel, dashboard. |
| S32 | Conflict (409) surfaced as a clear, recoverable Persian error with a reload affordance — never a silent overwrite. |
| S33 | `MissionType` admin page under `/system/`. |
| S34 | All of the above at 360 / 768 / 1024 / 1440, RTL, keyboard-operable, 44px touch targets. |

### 1.6 Tests & docs

| ID | Item |
|---|---|
| S35 | Unit tests for S11–S13 including every transition and every boundary. |
| S36 | Integration/e2e tests per `08-TESTS.md`, including a real concurrency test. |
| S37 | Regression proof that Phases 10–13 still agree on status. |
| S38 | `PHASE_STATUS.md` entry, `README.md` update, ADRs for every resolved question. |

## 2. Out of scope

Summarised here; reasoned in full in `11-OUT_OF_SCOPE.md`.

| Item | Why | Owner |
|---|---|---|
| Simulation algorithms | Phase 9 owns position/ETA maths. Phase 15 only changes *when* the engine is consulted. | Phase 9 |
| Map rendering | Phase 10/11/12. New statuses reach the map through display status, not by editing map code. | Phases 10–12 |
| Dashboard widget structure | Phase 13. Counters change; widget architecture does not. | Phase 13 |
| Authentication / user & role administration | Phase 1 / Phase 14. | Phase 14 |
| Vehicle, cargo-type, office/warehouse management | Phases 2–3. | Phases 2–3 |
| Reporting, analytics, notifications | Not in the roadmap for this phase. | Future |
| Mission attachments (files) | Requires an upload/sanitisation pipeline that Phase 14 introduces for `IconAsset`. Building a second one now would duplicate it. | Phase 14+ |
| Approval workflow | Extension point only — the transition table is designed to admit it without restructuring. | Future |
| Multi-stop, convoy, recurring, split shipments, templates | Extension points; see §3. | Future |
| Offline write queue / sync | The product is offline-*from-the-internet*, not offline-from-the-LAN (ADR-004). No offline mutation queue exists or is needed. | ADR-004 |
| Pagination for org tree / fleet list | Real, known scale defect — but a different module. | Separate task |

## 3. Future work — designed-for extension points

Phase 15 must leave these possible **without architectural change** (Goal G12). Each is a documented seam, not an implementation:

| Extension | Seam that makes it possible |
|---|---|
| **Multi-stop missions** | Actual times live on the mission today (ADR-P15-01); a future `MissionStop` table carries per-stop planned/actual pairs and the mission-level actual becomes the last stop's. The transition table is per-mission and unchanged. |
| **Convoy missions** | A future `convoyId` groups missions; transitions stay per-mission, with a group operation composing them. Nothing in the state machine assumes a single vehicle. |
| **Recurring missions** | A future `MissionSchedule` emits new `DRAFT` missions. The lifecycle starts where it does today. |
| **Split shipments** | `MissionShipment` is already many-to-many with `isActiveAssignment`; splitting adds rows, not states. |
| **Mission templates** | A template is a stored `MissionCreateInput`. `duplicateMission` already proves the shape. |
| **Approval workflows** | Insert `PENDING_APPROVAL` between `DRAFT` and `SCHEDULED`. Because the transition table is data (§`03-DOMAIN.md`), this is a table entry plus a guard, not a rewrite. |
| **Electronic signatures** | A signature is an attestation attached to a transition record; the audit entry per transition (S21) is the anchor. |
| **External system integration** | Every transition already writes an audit row; an outbox consumer reads it. No transition logic changes. |

## 4. Dependencies

Restated from `00-README.md` §3 in dependency order. The implementation engineer must confirm each exists before starting:

1. `Mission`, `MissionShipment`, `AuditLog` models — Phase 7 / Phase 1.
2. `deriveMissionDisplayStatus`, `isMissionOperationallyLocked` — `src/lib/domain/mission-rules.ts`.
3. `simulateMissionPosition` — `src/lib/domain/mission-simulation.ts`.
4. `mission-service.ts` — the 11 shipped operations.
5. `logAudit` — `src/lib/audit/`.
6. `requireActor` + `RoleCode` — `src/lib/http/api-auth.ts`, `src/lib/permissions/roles.ts`.
7. `getMapScene`, `getDashboardSummary` — the two batch consumers that must stay consistent.

## 5. Assumptions

| # | Assumption | If false |
|---|---|---|
| A1 | A mission has exactly one vehicle. | Convoy support would change assignment cardinality; the state machine still holds. |
| A2 | Operators record outcomes manually; there is no telemetry feed. | A future integration would call the same service operations. |
| A3 | Actual times are entered in Jalali local time and converted at the boundary (ADR-008). | — |
| A4 | An actual arrival may legitimately precede or follow the ETA by any margin. | Validation must not reject "late" or "early"; only impossible values (see `02-REQUIREMENTS.md` V-rules). |
| A5 | `STATUS_VIEWER` never mutates missions — matching shipped behaviour and the existing e2e test. | — |
| A6 | Concurrent edits are rare but must be safe; user-paced editing makes pessimistic mission locks inappropriate. | — |
| A7 | The dev database is shared and already large; new queries must be indexed, not full-scan. | — |
