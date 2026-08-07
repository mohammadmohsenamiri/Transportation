# Phase 15 — 11 — Out of Scope

Everything deliberately excluded, why, and who owns it. If it is listed here, building it in Phase 15 is a scope violation.

---

## 1. Owned by earlier phases — consume, never rebuild

| Excluded | Why | Owner |
|---|---|---|
| Mission creation, editing, publishing, cancellation, duplication | **Already shipped and in production use** — 11 service operations, 9 API routes, 11 UI modules, 9 test files. Rebuilding working, tested code is forbidden by `CLAUDE.md` §5. Phase 15 *extends* this module. | Phases 7–8 |
| Position, distance, bearing and ETA mathematics | Phase 9's pure engine is the single source. Phase 15 changes only **when** it is consulted (the freeze rule), never what it computes. | Phase 9 |
| Map rendering, markers, popups, route drawing | New statuses reach the map through `deriveMissionDisplayStatus`, not by editing map code. Touching `maplibre-map-inner.tsx` would signal a design error. | Phases 10–12 |
| Mission table, filters, selection, saved views | Phase 11 owns the interaction layer. Phase 15 adds two values to an existing filter's options — nothing more. | Phase 11 |
| Timeline engine and playback | Phase 15 consumes `viewTime`; it does not alter time control. | Phase 12 |
| Dashboard widget structure, layout persistence, charts | Phase 15 changes the **numbers**, never the widget architecture. | Phase 13 |
| Vehicle, cargo-type, office and warehouse management | Separate aggregates. Phase 15 references them by id and never mutates them. | Phases 2–3 |
| Route CRUD, CSV import, route versioning | Phase 5. Mission route *assignment* already ships in Phase 7. | Phase 5 |
| Authentication, sessions, password policy | Phase 1. | Phase 1 |

## 2. Owned by Phase 14

| Excluded | Why |
|---|---|
| User management, role assignment, role-escalation prevention | Phase 14's defined scope. Phase 15 only *consumes* `requireActor`. |
| Icon library, SVG sanitisation, MIME validation | Phase 14 builds the upload pipeline. |
| **Mission attachments** | Attachments need exactly the upload + sanitisation + size/MIME pipeline Phase 14 is building for `IconAsset`. Building a second one now would duplicate it and create two security surfaces to audit. Once Phase 14 ships, attachments are a thin model plus a reuse of that pipeline. |
| Audit-log viewer UI | Phase 14. Phase 15 *writes* audit entries and exposes them through the existing per-mission history endpoint; the cross-entity viewer is Phase 14's. |
| Timezone / provider / refresh-interval settings | Phase 14. |

## 3. Deferred capabilities — extension points, not implementations

Each has a designed seam (`01-SCOPE.md` §3). None is built now.

| Excluded | Why deferred | Seam that keeps it cheap |
|---|---|---|
| **Multi-stop missions** | Needs a `MissionStop` table and per-stop planned/actual pairs — a data-model expansion whose requirements are not yet defined. Building it speculatively would guess wrong. | Mission-level actuals become the final stop's; the transition table is per-mission and unchanged. |
| **Convoy missions** | Requires grouping semantics and a decision on whether a convoy fails atomically. Genuine product questions, unanswered. | `convoyId` groups missions; transitions stay per-mission. |
| **Recurring missions** | Needs a scheduling engine and a policy for what happens when an occurrence is missed. | A generator emits `DRAFT` missions upstream of the lifecycle. |
| **Split shipments** | `MissionShipment` is already many-to-many; splitting is an assignment concern, not a lifecycle one. | Adds rows, not states. |
| **Mission templates** | A template is a stored `MissionCreateInput`; `duplicateMission` already demonstrates the shape. Low value until mission volume justifies it. | No lifecycle change. |
| **Approval workflow** | The brief itself marks it optional. Adding an unused approval state would burden every downstream consumer with a status nobody produces. | Insert `PENDING_APPROVAL` as a table row plus one guard — ~10 lines. |
| **Electronic signatures** | Requires a legal/identity decision (what constitutes a valid signature) that is not an engineering question. | Attestation attaches to the per-transition audit row. |
| **External system integration** | No integration target exists yet. | `AuditLog` is the outbox; a consumer reads it with zero transition changes. |
| **Mission ownership / assignment to a specific user** | `createdById`/`updatedById` already record provenance. Making ownership *confer rights* is an authorization-model change belonging with Phase 14's role work. | — |
| **Mission versioning (business snapshots)** | Distinct from the `version` concurrency token. Snapshotting a mission's full history of edits duplicates what `AuditLog.afterJson` already stores. | Audit already holds it. |

## 4. Explicitly rejected

Not deferred — decided against.

| Rejected | Why |
|---|---|
| **Offline write queue / sync** | ADR-004 scopes offline as internet-independence, not LAN-independence. A queue would let two operators record contradictory outcomes offline and reconcile arbitrarily — exactly the silent-overwrite failure this phase exists to prevent. |
| **A `REOPENED` persisted state** | Doubles the state space for all four downstream consumers to express something `AuditLog` + `reopenCount` already record. ADR-P15-02. |
| **A `MissionEvent` event-sourcing table** | `AuditLog` already provides append-only, actor-attributed, queryable history (ADR-015). A parallel log fragments the trail. ADR-P15-01. |
| **A workflow/rules-engine library** | Eight transitions, nine guards. A dependency and an abstraction layer for negative benefit; violates the no-unnecessary-dependency principle held since Phase 0. |
| **Pessimistic locking on missions** | Editing is user-paced and can span a multi-step wizard; an abandoned browser tab would block a mission indefinitely. |
| **Auto-completing missions when the clock passes ETA** | This would recreate the exact bug the phase fixes — asserting a fact the system does not know. `ARRIVED` remains an estimate until a human confirms. |
| **Overwriting `estimatedArrivalAt` with the actual** | Destroys estimate-accuracy measurement, violates ADR-006 and invariant I-10. |
| **Merging `ARRIVED` and `COMPLETED`** | They are different facts: belief vs. confirmation. Merging them erases the phase's entire value. |
| **Reporting and analytics on variance** | `arrivalVarianceMinutes` is exposed so a future reporting phase can aggregate it. Building reports now is out of scope. |
| **Notification on transitions** | No notification system exists; the brief excludes it. Audit rows are the seam. |

## 5. Known pre-existing issues Phase 15 must not absorb

These are real defects, already documented, in **different** modules. Phase 15 must neither fix nor be blamed for them:

| Issue | Status |
|---|---|
| Organization tree and fleet list render every record with no pagination; two e2e tests fail at current data volume (~6,400 org units, ~1,229 vehicles) | Pre-existing, verified against the pre-Phase-13 commit. Tracked as separate work. |
| `mission-interaction.spec.ts:166` intermittently fails on `mobile-360` under full-suite load | Pre-existing; identical failure rate on the pre-Phase-13 baseline. |
| The shared dev database has grown large enough to make absolute-count assertions unreliable | Mitigated by delta-based assertions (`08-TESTS.md`). |
