# Phase 15 — Mission Lifecycle Completion — Pre-Implementation Dependency Review

**Status: Review artifact, produced before `00-README.md`.** This is the audit the commissioning brief requires ("identify missing interfaces, terminology inconsistencies, dependency gaps and architectural conflicts") before any numbered pack document is written. It is not itself a pack document.

**Resolution adopted (post-review, by the product owner).** This review was commissioned as "Phase 14 — Mission Management". It found two blocking conflicts (§1, §2) and recommended a resolution (§8). The product owner accepted recommendation §8:

- The phase is **retitled "Mission Lifecycle Completion"** — it extends the shipped Phase 7/8 mission module rather than introducing it.
- Its scope is **the delta in §3–§5 only**; the Phase 7/8 surface is existing foundation to consume, never to rebuild.
- It is **numbered Phase 15**, inserted ahead of the former Phases 15–17, which shift to 16–18. Rationale: this is core business capability and must land before the responsive/offline-hardening/UAT phases. The plan's original **Phase 14 (users, icons, settings) is left untouched**.

Everything below is the original audit as written, and remains the binding technical basis for the pack.

**Headline finding: this review is blocking.** Two conflicts are material enough that writing `00-README.md` before they are resolved would produce a pack that contradicts the repository. Both are described in §1 and §2, with a recommended resolution in §8. Everything from §3 onward is the substantive audit, which is valid regardless of how §1/§2 are resolved.

Reviewed sources: `docs/IMPLEMENTATION_PLAN.md` (all phases, esp. 7, 8, 14), `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE_AND_DATA_MODEL.md`, `docs/DECISIONS.md` (ADR-001…ADR-029, esp. ADR-006, ADR-018, ADR-019), `docs/PHASE_STATUS.md`, `CLAUDE.md`, the Phase 9–13 packs, and the live source tree — `prisma/schema.prisma`, `src/server/services/mission-service.ts`, `src/lib/domain/mission-rules.ts`, `src/lib/validation/mission.ts`, `src/app/api/v1/missions/**`, `src/features/missions/**`, and the mission unit/e2e suites.

---

## 1. Conflict A — Phase 14 is already allocated to a different scope

`docs/IMPLEMENTATION_PLAN.md` defines Phase 14 as **«مدیریت کاربران، آیکن‌ها و تنظیمات تکمیلی»** — user management, role assignment, the `IconAsset` library with SVG sanitisation, icon assignment to org units/vehicle types, timezone and provider settings, and an audit-log viewer. Its stated acceptance criterion is that malicious SVG, oversized files, forged MIME types and role escalation are rejected at the API.

That is an entirely different module from Mission Management. `IMPLEMENTATION_PLAN.md` is binding under `CLAUDE.md` §1 ("در هر PR/تغییر فقط یک فاز از `docs/IMPLEMENTATION_PLAN.md` را اجرا کن"), and `PHASE_STATUS.md` already lists Phase 14 with that scope and an `ADR`-tracked pipeline through Phase 17. Publishing a pack that calls Mission Management "Phase 14" would put two different definitions of Phase 14 into the same repository.

Further, the commissioning brief's own premise — "The previous phases have already implemented Simulation Engine, Operational Map, Interaction Layer, Timeline Engine, Situation Dashboard" — describes Phases 9–13 exactly. The next unbuilt phase in that sequence is 14, but its content is users/icons/settings, not missions.

## 2. Conflict B — Mission Management is already implemented and shipped

This is the more consequential finding. The brief treats Mission Management as a greenfield module ("Phase 14 introduces Mission Management"). It is not new: it shipped in **Phase 7** (mission planning from a form) and **Phase 8** (mission creation from the map), both recorded `DONE` in `PHASE_STATUS.md`, and it has been consumed by every phase since.

What already exists in `main` today:

| Capability from the brief's feature list | Status in repo | Evidence |
|---|---|---|
| Mission Creation | **Shipped** | `createMissionDraft()`; six-step wizard `mission-wizard.tsx`; map flow `mission-map-create-panel.tsx` |
| Mission Editing | **Shipped** | `updateMission()`, gated by ADR-018 lock rule |
| Mission Cancellation | **Shipped** | `cancelMission()` with mandatory `cancellationReason`; `mission-cancel-dialog.tsx` |
| Mission Duplication | **Shipped** | `duplicateMission()`; `mission-duplicate-dialog.tsx` |
| Mission Scheduling | **Shipped** | `publishMission()` — DRAFT → SCHEDULED with `startAt` |
| Mission Validation | **Shipped** | `src/lib/validation/mission.ts` (Zod) + `mission-rules.ts` domain rules |
| Vehicle Assignment | **Shipped** | `vehicleId` + availability/conflict checks at publish |
| Warehouse / Destination Selection | **Shipped** | origin warehouse + `destinationMode` (org unit or free coordinates) |
| Route Assignment + CSV Route | **Shipped** | `routeId` + `routeVersion` snapshot; CSV import is Phase 5 |
| Departure / Estimated Arrival | **Shipped** | `startAt`, `estimatedArrivalAt`, `estimateMissionPreview()` |
| Automatic ETA Calculation | **Shipped** | Phase 7 estimate + Phase 9 simulation engine |
| Mission Progress / Simulation / Timeline / Map / Dashboard integration | **Shipped** | Phases 9–13, all consuming the mission model |
| Mission List / Details / Search | **Shipped** | `listMissions()`, `missions-list-view.tsx`, `mission-detail-view.tsx` |
| Mission History / Audit Trail | **Shipped** | `getMissionHistory()` over `AuditLog`; `mission-history.tsx` |
| Mission Status Management | **Partial** | see §3 — two-vocabulary model, no terminal write-states |
| Mission Notes | **Partial** | scalar `notes String?` on `Mission`; no note thread/entity |

Surface area already in place: **11 service operations**, **9 API routes** (`/missions`, `/missions/[id]`, `publish`, `cancel`, `duplicate`, `history`, `simulate`, `estimate`, `summary`), **11 UI modules**, and **9 test files** (5 unit, 4 e2e).

Writing a pack that specifies all of this as work-to-be-done would direct the implementation engineer to rebuild a working, tested, shipped module — the precise outcome `CLAUDE.md` §5 forbids ("بازنویسی بی‌دلیل معماری").

## 3. What is genuinely missing — the real Phase-14-as-Mission-Management scope

Stripping out what already ships, the brief's feature list still contains a substantial and coherent body of *new* work. This is the part worth a pack:

### 3.1 Lifecycle: no terminal write-states exist

`MissionPersistedStatus` is `DRAFT | SCHEDULED | CANCELLED | ARCHIVED`. Of these:

- **`ARCHIVED` is dead today.** It is declared in the enum and read defensively in `updateMission()` (line 486) — but **nothing ever writes it**. There is no archive operation, no API route, no UI affordance. The brief's "Mission Archive" is genuinely new.
- **There is no `FAILED` state at all.** The brief's "Mission Failure" has no representation in the schema, domain, or UI. This is the single largest modelling gap.
- **There is no `COMPLETED` write-state.** "Arrived" is *computed* by `deriveMissionDisplayStatus()` from the clock — a mission whose `estimatedArrivalAt` has passed displays as `ARRIVED` forever, with no operator confirmation, no actual-arrival timestamp, and no way to record that it arrived late, early, or not at all. The brief's "Mission Completion" (an explicit operator action producing a persisted fact) does not exist.
- **"Mission Activation" and "Mission Start"** are likewise computed, not commanded. There is no `actualStartAt`.

The consequence is architecturally important and must be stated plainly in `03-DOMAIN.md`: **the system currently has no concept of what actually happened — only of what was planned and what the clock implies.** Adding real terminal states means introducing *actual* timestamps alongside the planned ones, and deciding what happens when they disagree (see §5).

### 3.2 Absent entirely

| Brief item | Status |
|---|---|
| Mission Failure (+ reason, classification) | **Absent** — no state, no field |
| Mission Reopen | **Absent** — depends on terminal states existing first |
| Mission Archive (operation) | **Absent** — enum value exists but is never written |
| Mission Approval workflow | **Absent** — brief marks it an optional extension point |
| Mission Attachments | **Absent** — no model; brief marks it future |
| Mission Notes (as a thread) | **Absent** — only a scalar `notes` field |
| Mission Type | **Absent** — no `MissionType` model or enum anywhere |
| Mission versioning | **Absent** — `routeVersion` snapshots the *route*, not the mission |
| Optimistic concurrency on Mission | **Absent** — see §4 |
| Mission ownership | **Absent** — `createdById`/`updatedById` exist but confer no rights |
| Multi-stop / convoy / recurring / split / templates | **Absent** — all listed as future extension points |

### 3.3 Mission numbering already has a strategy

The brief asks for a "Mission numbering strategy" as if undecided. `Mission.code` is already `@unique` and generated by the service. Any pack must document the *existing* scheme rather than invent a second one; changing it would orphan every shipped mission code and break e2e fixtures that search by code.

## 4. Concurrency — a real, precisely-scoped gap

The brief asks for an "Optimistic/Pessimistic concurrency approach". The current state is **asymmetric and deliberately so**:

- **Shipment assignment is protected pessimistically.** `publishMission()` issues `SELECT id FROM "Shipment" WHERE id = ... FOR UPDATE` inside the transaction (line 406), backed by a partial unique index, per **ADR-019**. Two concurrent publishes cannot assign the same shipment.
- **The Mission row itself has no concurrency control.** No `version` column, no `updatedAt` precondition check. Two operators editing the same `SCHEDULED` mission produce a silent last-write-wins overwrite. `updateMission()` reads, validates, then writes without asserting the row is unchanged since the read.

This is a genuine correctness gap and the most defensible technical item in the whole brief. Recommended resolution (to be formalised as an ADR in the pack): **add optimistic concurrency to `Mission` via a monotonically incrementing `version Int` column**, require the client to send the version it read, and reject mismatches with a domain error rather than overwriting. Pessimistic row locks are *not* recommended for the mission row — edits are user-paced and holding a lock across a multi-step wizard would be pathological. Keep ADR-019's pessimistic shipment lock exactly as is; the two mechanisms address different problems and should coexist.

## 5. Architectural conflict: planned vs. actual time (must be resolved in `03-DOMAIN.md`)

**ADR-005** states the computed position is not the source of truth, and **ADR-006** freezes planning data at publish. Together they establish that a mission's record is a *plan*, and everything operational is derived from that plan plus the clock.

Introducing Completion/Failure/Start breaks that symmetry: those are *observations*, not derivations. This produces a decision the pack must make explicitly, not leave implicit:

- Do actual timestamps (`actualStartAt`, `actualArrivalAt`, `failedAt`) live on `Mission` alongside the planned ones, or in a separate event/observation table?
- Once a mission is `COMPLETED`, does the simulation engine stop being consulted for it — i.e. does the map show its frozen final position rather than a clock-derived one? (Phase 9 already does exactly this for `CANCELLED` via `cancelledAt`; the same pattern extends naturally.)
- What does the Situation Dashboard count as "arrived" once both a computed `ARRIVED` and a persisted `COMPLETED` exist? **This is not cosmetic** — Phase 13's ADR-029 committed the dashboard to deriving mission status from `deriveMissionDisplayStatus()` precisely so its numbers can never diverge from the map's. Adding a persisted completion state changes that function's contract and therefore changes the dashboard and the map simultaneously.

**Recommendation:** extend `deriveMissionDisplayStatus()` so persisted terminal states win over clock-derived ones (exactly as `CANCELLED`/`ARCHIVED` already do), keeping it the single arbiter. That preserves ADR-029's guarantee at zero cost to Phases 10–13.

## 6. Terminology to freeze

| Term | Ruling |
|---|---|
| "نمای پایش" for the map | **Stale.** ADR-025 kept "نقشه عملیات". Never reintroduce. |
| Mission status vocabulary | Two vocabularies coexist by design: persisted (`persistedStatus`) and computed (`deriveMissionDisplayStatus`). Any pack **must** name which one each rule refers to, every time. This was the single most consequential ambiguity in Phase 13 (ADR-029 §1). |
| "Mission Assignment" | The brief uses this for vehicle assignment; the codebase uses `MissionShipment.isActiveAssignment` for *shipment* assignment. Two different meanings — must be disambiguated. |
| "Completed" vs "Arrived" | Currently `ARRIVED` (computed, Persian «رسیده»). If a persisted completion state is added, it needs a distinct Persian label; reusing «رسیده» for both would make the UI ambiguous. |
| Mission «مأموریت», Shipment «مرسوله» | Confirmed, per `UX_MAP_AND_DESIGN_SYSTEM.md` §11. |

## 7. Constraints any Phase 14 pack must respect

- **One phase per change** (`CLAUDE.md` §1) — the pack must not bundle users/icons/settings with mission work.
- **A mission may have one *or many* shipments** (`CLAUDE.md` §5) — already modelled via `MissionShipment`; never regress to one.
- **Applied migrations are immutable** (`CLAUDE.md` §5) — new states/fields require *new* migrations. The `ARCHIVED` enum value already exists and must not be redefined.
- **Business rules stay out of components** (`CLAUDE.md` §2) — the brief's "Special Requirements" agree.
- **Soft delete + audit on business records** (ADR-015) — every new lifecycle transition must write an `AuditLog` entry, consistent with existing operations.
- **ADR-018's edit lock** — after a mission starts, only non-operational fields are editable; cancel-then-duplicate is the sanctioned path. Any new transition must state its interaction with this rule.

## 8. Recommendation

The brief's *content* is sound and identifies real gaps (§3, §4, §5). Its *framing* — "Phase 14 introduces Mission Management" — contradicts the repository on two counts. Recommended resolution:

1. **Retitle the phase to what the work actually is.** Something like **"Mission Lifecycle Completion"** — it extends the shipped Phase 7/8 module with terminal states, concurrency control, and workflow, rather than introducing it.
2. **Scope the pack to the delta in §3–§5 only**, explicitly listing the Phase 7/8 surface as *existing foundation to consume, not rebuild*. This keeps the pack honest and keeps the implementation engineer from re-deriving working code.
3. **Choose a phase number that does not collide.** Either renumber the plan (mission lifecycle becomes 14, users/icons shifts to 15, and everything downstream +1) or give this work a later free number and leave the plan's Phase 14 intact.

Item 3 is a product-owner decision, not an architectural one: it changes which module gets built next and reorders the remaining roadmap. It is the one question that must be answered before `00-README.md` can be written, because the pack's title, phase number, dependency section, and `PHASE_STATUS.md` entry all depend on it.

Everything else in this review is settled and ready to be carried into the numbered documents.
