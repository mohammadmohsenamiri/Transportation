# Phase 15 — 10 — Non-Functional Requirements

---

## 1. Performance

| ID | Requirement | Rationale |
|---|---|---|
| NF-P1 | A transition completes in < 300 ms server-side at ~1,000 missions. | Operator-facing action; anything slower feels broken. |
| NF-P2 | Query count per transition is constant in shipment count. | Set-based `updateMany`, never a loop (P-02). |
| NF-P3 | `deriveMissionDisplayStatus` stays O(1), allocation-free. | It runs once per mission per scene build **and** once per mission per dashboard request — the hottest pure function in the system. |
| NF-P4 | No new sequential scans. | Indexes per `07-DATABASE.md` §4. The dev DB already holds ~1,000 missions and ~6,400 org units; unindexed filters regress immediately. |
| NF-P5 | Map scene and dashboard latency within 10% of pre-phase baseline. | Capture baselines before starting. |
| NF-P6 | Note list is paginated or bounded if a mission exceeds 200 notes. | Prevents an unbounded thread from degrading mission detail. |

**Known scale caveat, inherited not introduced:** the organization tree and fleet list render every record with no pagination — a documented Phase 2/3 limitation that now causes two pre-existing e2e failures at current data volume. Phase 15 must not make it worse and must not be blamed for it.

## 2. Memory

| ID | Requirement |
|---|---|
| NF-M1 | No transition loads a full mission graph; reads are the mission plus its `shipments` relation only. |
| NF-M2 | The transition table is a module-level frozen constant — allocated once, never per call. |
| NF-M3 | No unbounded in-memory accumulation; all multi-row work is set-based in SQL. |

## 3. Scalability

| ID | Requirement |
|---|---|
| NF-S1 | Optimistic concurrency scales without lock contention — no shared lock, no queue, no coordinator. |
| NF-S2 | The design tolerates 10× mission growth without structural change; the first thing to revisit at that scale is dashboard/scene batch queries, not the lifecycle. |
| NF-S3 | `reopenMission`'s per-shipment `FOR UPDATE` loop is O(n) but bounded by shipments-per-mission (typically ≤ 5) and mirrors the shipped `publishMission`. |
| NF-S4 | Extension points (`01-SCOPE.md` §3) are additive — multi-stop, convoy and approvals need no state-machine restructuring. |

## 4. Maintainability

| ID | Requirement |
|---|---|
| NF-Mt1 | Transitions are **data** (`MISSION_TRANSITIONS`), not `if`/`switch` chains — a new transition is a table row plus a guard. |
| NF-Mt2 | One rule lives in exactly one place. Business rules never appear in components, route handlers or Prisma callbacks (`CLAUDE.md` §2). |
| NF-Mt3 | Persian labels live in `src/lib/domain/mission-labels.ts` (domain layer, established in Phase 13) so server and client share one source. |
| NF-Mt4 | Comments explain **why**, not what — matching the codebase's existing Persian comment style. |
| NF-Mt5 | New code matches the shipped `cancelMission` shape exactly; a reviewer familiar with Phase 7 should find nothing novel in structure. |
| NF-Mt6 | No new runtime dependency. |

## 5. Offline compatibility

Per ADR-004, the product is offline **from the internet**, not from the LAN.

| ID | Requirement |
|---|---|
| NF-O1 | No transition touches any external host, CDN, font, icon or analytics endpoint. |
| NF-O2 | Every asset is local; no new dependency introduces a remote fetch. |
| NF-O3 | With the internet disconnected and the LAN up, every lifecycle action works end to end. |
| NF-O4 | If the internal API is unreachable, the UI shows a recoverable error with retry. It **does not** queue, replay, or fabricate a transition — a mission outcome must never be invented client-side. |

> **No offline write queue is built, deliberately.** Queued lifecycle transitions would let two operators record contradictory outcomes offline and reconcile them arbitrarily on reconnect — precisely the silent-overwrite failure this phase exists to prevent.

## 6. Accessibility

| ID | Requirement |
|---|---|
| NF-A1 | WCAG AA contrast for every new badge, in both themes. |
| NF-A2 | Status is never colour-only — icon plus Persian label (`UX_MAP_AND_DESIGN_SYSTEM.md` §4). |
| NF-A3 | Touch targets ≥ 44×44 CSS px. |
| NF-A4 | Every action keyboard-reachable; visible focus ring; `Escape` closes dialogs. |
| NF-A5 | Dialogs trap focus and restore it to the trigger on close. |
| NF-A6 | Status changes announced through a bounded `aria-live="polite"` region — once, not on every poll. |
| NF-A7 | Confirmation dialogs name the mission (code + route) so the user knows what they are confirming. |
| NF-A8 | Errors are associated with their field via `aria-describedby`. |
| NF-A9 | Logical CSS properties only; no hardcoded `left`/`right`. |
| NF-A10 | Timestamps, codes and numbers render LTR inside RTL text with `dir="ltr"`. |
| NF-A11 | Motion respects `prefers-reduced-motion` (already global in `globals.css`). |

## 7. Logging & observability

| ID | Requirement |
|---|---|
| NF-L1 | Every transition writes an `AuditLog` row: actor, action, entity, timestamp, `afterJson`. |
| NF-L2 | Audit action names follow the shipped convention: `mission.<past-tense-verb>`. |
| NF-L3 | A failed audit write is logged as an operational error and **never** rolls back a committed business fact (TX-03). |
| NF-L4 | Version conflicts are logged at info level — they are expected, not exceptional. |
| NF-L5 | No secret, token or password ever enters a log or an audit payload. |
| NF-L6 | The mission history endpoint surfaces the full transition trail with actor and Jalali time. |

## 8. Transaction safety

| ID | Requirement |
|---|---|
| NF-T1 | Each transition is exactly one `prisma.$transaction`. |
| NF-T2 | Guards are re-evaluated inside the transaction against freshly-read state. |
| NF-T3 | The version check is part of the `UPDATE … WHERE` predicate, never a prior `SELECT`. |
| NF-T4 | Shipment side effects are inside the same transaction as the mission update — a completed mission with unsettled shipments must be impossible. |
| NF-T5 | `logAudit` runs after commit. |
| NF-T6 | No transaction spans an HTTP request boundary or waits on user input. |

## 9. Concurrency

| ID | Requirement |
|---|---|
| NF-C1 | Optimistic control on the mission row (`version`). |
| NF-C2 | Pessimistic control on shipment assignment (ADR-019) — unchanged. |
| NF-C3 | The two coexist without interaction; neither is a substitute for the other. |
| NF-C4 | No deadlock: shipment locks are acquired in a deterministic order within a single short transaction. |
| NF-C5 | Lost updates are impossible for mission state (NF-T3). |
| NF-C6 | Notes are append-only and exempt. |

## 10. Security

| ID | Requirement |
|---|---|
| NF-Sec1 | Every endpoint gated by `requireActor` at the server. Hiding a button is not authorization (`CLAUDE.md` §2). |
| NF-Sec2 | Every input validated with Zod at the boundary. |
| NF-Sec3 | Note bodies are rendered as text, never as HTML — no injection surface. |
| NF-Sec4 | Note deletion is authorised in the service (author or Admin), not the UI. |
| NF-Sec5 | Failure reasons and notes are free text and may contain operational detail; they inherit the same access control as the mission. |
| NF-Sec6 | No new file upload surface (attachments deferred to Phase 14's sanitised pipeline). |

## 11. Error recovery

| Failure | Recovery |
|---|---|
| DB unavailable | Transaction rolls back; 500 with Persian message; retry offered. |
| Version conflict | 409; UI offers reload; no data lost because nothing was written. |
| Shipment already assigned | 409; mission stays terminal; operator informed which constraint blocked it. |
| Audit write failure | Business fact stands; logged; not surfaced as failure. |
| Migration failure | Single transaction; nothing applied; re-runnable. |
| Corrupt `statusBeforeArchive` | Throws `MISSION_INVALID_TRANSITION` rather than guessing a state. |
