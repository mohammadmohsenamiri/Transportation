# Phase 15 — Architecture Decision Records

Every decision is **Accepted** and binding. The implementation engineer makes none of these choices again. On implementation, these are copied into `docs/DECISIONS.md` as ADR-030 onward.

---

## ADR-P15-01 — Actual timestamps live on `Mission`, not in an event table

**Context.** Completion, failure and departure are *observations*, unlike the *planned* fields ADR-006 freezes at publish. They could live as columns on `Mission` or as rows in a `MissionEvent` log.

**Decision.** Columns on `Mission`: `actualDepartureAt`, `actualArrivalAt`, `failedAt`, `archivedAt`. No event table.

**Alternatives.**
- *Event-sourcing table* — richest history, but duplicates `AuditLog` (ADR-015), which already stores actor-attributed append-only entries with `afterJson` snapshots. Two logs means two places to look and two to keep consistent.
- *Separate `MissionObservation` table* — one join on the hottest read path (`getMapScene` loads every scheduled mission) for no gain at current cardinality of one observation per mission.

**Trade-offs.** Multi-stop missions will need per-stop actuals. Accepted: at that point a `MissionStop` table is the correct seam, and mission-level actuals become the final stop's — a mechanical migration, not a redesign. Speculating a table shape now for undefined requirements would likely guess wrong.

**Future impact.** Adding `MissionStop` later does not invalidate these columns.

---

## ADR-P15-02 — Reopen returns to `SCHEDULED`; no `REOPENED` state

**Context.** Reopening a completed or failed mission could target `SCHEDULED` or a distinct `REOPENED` state.

**Decision.** `SCHEDULED`. The reopen fact is recorded via `reopenCount`, `lastReopenedAt` and an audit entry.

**Alternatives.**
- *A `REOPENED` persisted state* — makes reopening visible in the status itself, but adds a ninth display status that map, table, timeline and dashboard must each handle, label, colour and filter. A whole cross-cutting status to express what a counter and an audit row already record.

**Trade-offs.** Status alone does not reveal that a mission was reopened; detail and history do. Accepted — the information is preserved, just not in the status enum.

**Future impact.** If an approval workflow later needs "reopened pending re-approval", it becomes a transition into `PENDING_APPROVAL`, not a new terminal state.

---

## ADR-P15-03 — Completed and failed missions freeze in the simulation

**Context.** Once a mission has a persisted terminal state, should the Phase 9 engine keep interpolating its position?

**Decision.** Freeze at `actualArrivalAt` / `failedAt`, exactly mirroring the shipped `CANCELLED` / `cancelledAt` behaviour.

**Alternatives.**
- *Keep simulating* — a "completed" mission would still appear to move, which is incoherent.
- *Hide from the map entirely* — the scene query already filters to `SCHEDULED`, so they naturally leave the live map; but a historical timeline scrub must still render them correctly, which requires a frozen position rather than no position.

**Trade-offs.** None material. This generalises an existing pattern rather than inventing one.

---

## ADR-P15-04 — `ARRIVED` and `COMPLETED` stay distinct, with distinct labels and counters

**Context.** `ARRIVED` (clock-derived) and `COMPLETED` (operator-asserted) could be merged for UI simplicity.

**Decision.** Keep them distinct everywhere. `ARRIVED` is relabelled **«رسیده (تخمینی)»**; `COMPLETED` is **«تکمیل‌شده»**. The dashboard counts them separately.

**Alternatives.**
- *Merge into one "arrived" concept* — destroys the phase's entire value. The whole point is distinguishing belief from confirmation.
- *Keep `ARRIVED` labelled «رسیده»* — an operator could not tell an estimate from a fact at a glance.

**Trade-offs.** A user-visible copy change to shipped text, and one more status for users to learn. Accepted: the ambiguity being removed is worth more than the familiarity being lost. Must be announced, not slipped in.

**Future impact.** Reporting can measure estimate accuracy precisely because the two are never conflated.

---

## ADR-P15-05 — Optimistic concurrency on missions; pessimistic stays on shipments

**Context.** `updateMission()` is read-validate-write with no precondition — two concurrent edits silently overwrite each other. ADR-019 already protects *shipment assignment* pessimistically.

**Decision.** Add `version Int @default(0)` to `Mission`. Every mutating operation sends the version it read; the update is conditional on it and increments it. Mismatch ⇒ `MISSION_VERSION_CONFLICT` (409). ADR-019's `SELECT … FOR UPDATE` on shipments is unchanged. Notes are exempt.

**Alternatives.**
- *Pessimistic mission locks* — editing is user-paced and can span a multi-step wizard. One abandoned browser tab would block a mission indefinitely.
- *Last-write-wins (status quo)* — silently loses an operator's work. This is the defect being fixed.
- *`updatedAt` as the token* — timestamp granularity can collide, and clock adjustments make it unreliable. An integer is unambiguous.

**Trade-offs.** Clients must round-trip `version`, making `PATCH` and `cancel` breaking changes. Accepted: the mission UI is the only client and ships in the same phase.

**Future impact.** The same token supports any future multi-user editing.

---

## ADR-P15-06 — Lifecycle transitions are Admin + Mission Planner; Status Viewer excluded

**Context.** Who may complete, fail, archive or reopen?

**Decision.** `ADMIN` and `MISSION_PLANNER`. `STATUS_VIEWER` sees no controls and is rejected server-side. Mission-type *management* is Admin-only. This matches the shipped rule — the existing e2e test asserts Status Viewer is entirely excluded from missions.

**Alternatives.**
- *Admin-only* — makes Planners unable to close their own work; unnecessary friction.
- *Let Status Viewer complete* — contradicts the role's read-only purpose and the shipped test.

**Trade-offs.** No per-mission ownership; any Planner may close any mission. Accepted for this phase — ownership-confers-rights is an authorization-model change belonging with Phase 14.

---

## ADR-P15-07 — Shipment side effects are defined per transition

**Context.** Each terminal transition must leave shipments in a defensible state. Cancellation already releases them to `DRAFT`.

**Decision.**

| Transition | Shipment outcome |
|---|---|
| complete | `DELIVERED`, released |
| fail | `WAITING_FOR_DISPATCH`, released — immediately re-plannable |
| cancel | `DRAFT`, released *(existing, unchanged)* |
| archive / unarchive | no change — filing, not operational |
| reopen | re-acquired, `IN_TRANSIT`; rejected if taken meanwhile |

**Alternatives.**
- *Fail → `DRAFT`* — matches cancel, but a shipment that was dispatched and failed is operationally different from one never dispatched. `WAITING_FOR_DISPATCH` reflects reality: it exists, it needs transport, it has no mission.
- *Leave shipments assigned on failure* — they would be stranded, unassignable, invisible to planning.

**Trade-offs.** Reopen can fail for a reason outside the operator's control. Accepted and surfaced explicitly — the alternative is silently stealing a shipment from another mission, violating ADR-019.

---

## ADR-P15-08 — `MissionType` is reference data, not an enum

**Context.** Mission type could be a hardcoded enum or an admin-managed table.

**Decision.** A `MissionType` table mirroring the shipped `VehicleType` / `CargoType` shape. `Mission.missionTypeId` is nullable.

**Alternatives.**
- *An enum* — directly violates `CLAUDE.md` §5, which forbids hardcoding types in business logic, and would require a migration for every new operational category.
- *Free text* — unqueryable and ungroupable.

**Trade-offs.** One more admin screen. Accepted; the pattern is already established twice.

**Future impact.** Nullable, so existing missions need no backfill and typing can be adopted gradually.

---

## ADR-P15-09 — Legacy `Mission.notes` is not migrated into `MissionNote`

**Context.** A scalar `notes String?` exists. The new thread could absorb it.

**Decision.** Leave it. It is displayed as the planner's original note; the thread is additive alongside.

**Alternatives.**
- *Migrate into the thread* — requires inventing an author and a timestamp the data does not have. **Fabricating audit data is not acceptable**, even convenient audit data.
- *Drop it* — destroys real content.

**Trade-offs.** Two places show notes on mission detail. Accepted, and made coherent by labelling them distinctly.

**Future impact.** A later phase may migrate it once a defensible authorship rule exists.

---

## ADR-P15-10 — The transition table is data, not control flow

**Context.** Eight transitions with guards could be `if`/`switch` chains, a class hierarchy, or a declarative table.

**Decision.** A frozen module-level array of `TransitionSpec`, with guards as plain functions keyed by action.

**Alternatives.**
- *`if`/`switch` chains* — transitions become scattered and unlistable; adding one means editing several functions.
- *A workflow/rules-engine library* — a dependency and an abstraction layer for eight transitions; violates the no-unnecessary-dependency principle held since Phase 0.
- *A state-machine class hierarchy* — ceremony without benefit at this size.

**Trade-offs.** Table lookup is O(8) rather than a compiled jump. Irrelevant at this scale.

**Future impact.** This is what makes the approval-workflow extension a one-row change instead of a refactor — the single most important property for Goal G12.
