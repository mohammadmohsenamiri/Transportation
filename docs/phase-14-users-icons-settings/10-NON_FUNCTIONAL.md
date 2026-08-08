# Phase 14 — 10 — Non-Functional Requirements

---

## 1. Performance

| ID | Requirement | Rationale |
|---|---|---|
| NF-P1 | Admin operations < 300 ms server-side, excluding password hashing. | Operator-facing. |
| NF-P2 | argon2 hashing takes 0.5–1 s **by design**. It is never "optimised". | Slowness is the security property. |
| NF-P3 | Every list endpoint is paginated at the database, default 25 (users) / 50 (audit). | This phase must **not** repeat the unpaginated-list defect that currently breaks two e2e tests on the org tree and fleet pages at ~6,400 and ~1,220 rows. |
| NF-P4 | Settings reads hit the per-process cache; a hit performs zero queries. | Settings are read on nearly every request. |
| NF-P5 | Icon bytes are served with `Cache-Control: private, max-age=31536000, immutable`, keyed by content hash. | Icons are immutable per hash; a replace changes the hash and busts the cache naturally. |
| NF-P6 | Icon resolution adds **no query** to map scene building — `iconAssetId` joins the existing `select`. | The scene query already reads every scheduled mission; adding a round trip would regress Phases 10–13. |
| NF-P7 | Every new foreign key is indexed. | An unindexed FK makes `usageCount` a sequential scan over 6,400 organisation units. |
| NF-P8 | SVG analysis is single-pass over text bounded at 2 MB. | Bounded by the size check that runs first. |

## 2. Memory

| ID | Requirement |
|---|---|
| NF-M1 | Uploads are bounded at 2 MB before any buffering; the size check precedes `arrayBuffer()`. |
| NF-M2 | Icon serving streams from disk; file contents are never held in a module-level variable. |
| NF-M3 | The settings cache holds one small entry per registry key — a fixed, known ceiling. |
| NF-M4 | No unbounded in-memory accumulation; every list is paginated in SQL. |

## 3. Scalability

| ID | Requirement |
|---|---|
| NF-S1 | Optimistic concurrency scales without lock contention. The one pessimistic lock (`FOR UPDATE` in the last-admin guard) is held for microseconds over ≤ a handful of admin rows. |
| NF-S2 | The design tolerates 10× user growth without structural change. |
| NF-S3 | Icon storage grows linearly with uploads and is bounded by admin behaviour, not user traffic. |
| NF-S4 | **Known ceiling:** the audit table has no `occurredAt` index. Past ~100k rows, date-range filtering degrades. Adding the index is deliberately deferred — every index slows the write path that all phases depend on. Recorded as a Phase 17 capacity item (`07-DATABASE.md` §9). |

## 4. Maintainability

| ID | Requirement |
|---|---|
| NF-Mt1 | Settings are a code registry, so adding one is a registry entry — never a migration. |
| NF-Mt2 | One rule in one place. No business rule appears in a component, route handler or Prisma callback. |
| NF-Mt3 | New services mirror the shipped shape (`cancelMission` / `createVehicle`): find → guard → transaction → audit after commit → return DTO. A reviewer familiar with Phase 7 finds nothing structurally novel. |
| NF-Mt4 | Persian comments explain **why**, matching the existing style. |
| NF-Mt5 | **No new runtime dependency.** PNG dimensions come from a 24-byte header parse; SVG analysis is regex-based. A native image library would complicate offline deployment for negligible benefit. |
| NF-Mt6 | The role→capability matrix is derived from code, so it cannot drift from the real gates. |

## 5. Offline compatibility

Per ADR-004, the product is offline **from the Internet**, not from the LAN.

| ID | Requirement |
|---|---|
| NF-O1 | No screen, service or asset in this phase contacts the Internet. |
| NF-O2 | No CDN, no external font, no external icon, no external authentication. |
| NF-O3 | Icons are stored on local disk and served from the application's own origin. |
| NF-O4 | Every administrative flow works with the Internet disconnected and the LAN up. |
| NF-O5 | An unreachable external map provider degrades the map (existing Phase 4 behaviour) and **never** impairs administration. |
| NF-O6 | The internal map provider remains a first-class option; nothing in this phase makes an external provider mandatory. |

## 6. Accessibility

| ID | Requirement |
|---|---|
| NF-A1 | WCAG AA contrast for all new UI in both themes. |
| NF-A2 | Status conveyed by icon + Persian label, never colour alone. |
| NF-A3 | Touch targets ≥ 44×44 CSS px. |
| NF-A4 | Every action keyboard-reachable; focus visible; `Escape` closes dialogs; focus returns to the trigger. |
| NF-A5 | **No hover-only affordance** — row actions are visible or reachable by tap, not revealed on hover. |
| NF-A6 | File upload is a real, focusable input; drag-and-drop is an addition, never the only path. |
| NF-A7 | Errors linked to fields via `aria-describedby`. |
| NF-A8 | Destructive confirmations name the target. |
| NF-A9 | Tables become cards below `md`; the permission matrix scrolls inside its own `overflow-x` container so the page never scrolls sideways. |
| NF-A10 | Logical CSS properties only; no hardcoded `left`/`right`. |
| NF-A11 | Motion respects `prefers-reduced-motion` (already global). |

## 7. Persian / RTL

| ID | Requirement |
|---|---|
| NF-R1 | All UI text, labels, validation and errors in Persian. |
| NF-R2 | RTL layout throughout. |
| NF-R3 | **LTR technical values** — username, URL, IP address, filename, SHA-256, UUID — render inside `dir="ltr"` spans so they are not visually reordered. |
| NF-R4 | Timestamps display in Jalali; stored values remain UTC (ADR-008). |
| NF-R5 | Persian digits for counts; `tabular-nums` where numbers align in columns. |
| NF-R6 | Mixed Persian/English text renders correctly — a Persian display name beside an LTR username in one row is the common case and must be tested. |
| NF-R7 | Keyboard navigation follows RTL reading order. |
| NF-R8 | Date and time formats honour the corresponding settings. |

## 8. Logging & observability

| ID | Requirement |
|---|---|
| NF-L1 | Every administrative mutation writes an `AuditLog` row: actor, action, entity type, entity id, before, after, IP, user agent, timestamp. |
| NF-L2 | Action names follow the shipped `entity.verb` convention. |
| NF-L3 | A failed audit write is logged as an operational error and **never** rolls back a committed business fact. |
| NF-L4 | **No password, hash, token or secret ever enters a log or an audit payload.** Audit payloads are field-allowlisted, never whole-entity spreads. |
| NF-L5 | Version conflicts are logged at info level — expected, not exceptional. |
| NF-L6 | Rejected uploads log the finding category, never the file contents. |
| NF-L7 | Orphan files (written, then DB failure, then failed cleanup) are logged with their path for the Phase 17 sweeper. |

## 9. Security

| ID | Requirement |
|---|---|
| NF-Sec1 | Every administrative endpoint gated by `requireActor([ADMIN])` server-side. UI hiding is never the control. |
| NF-Sec2 | Every input Zod-validated at the boundary. |
| NF-Sec3 | Free text rendered as text; `dangerouslySetInnerHTML` appears nowhere in this phase. |
| NF-Sec4 | **Uploaded SVG is rendered only via `<img src>`.** Primary XSS control. |
| NF-Sec5 | Icon responses carry `nosniff` and `Content-Security-Policy: default-src 'none'; sandbox`. |
| NF-Sec6 | Filenames are server-generated UUIDs; client names are metadata only. |
| NF-Sec7 | Storage lives outside `public/`, so nothing is served unauthenticated. |
| NF-Sec8 | Path containment asserted with `realpath` in addition to a UUID-shape regex. |
| NF-Sec9 | Passwords hashed with the existing argon2 helper; never re-implemented. |
| NF-Sec10 | Deactivation, suspension, deletion and password reset revoke sessions in the same transaction. |
| NF-Sec11 | Privilege escalation impossible — role assignment is Admin-gated. |
| NF-Sec12 | IDOR resisted — UUID ids and re-authorization on every `[id]` operation. |
| NF-Sec13 | Admin mutations rate-limited with the existing limiter. |
| NF-Sec14 | No secret is storable as a setting; the registry defines every legal key and contains none. |
| NF-Sec15 | No cryptographic algorithm is invented; only existing project primitives are used. |

## 10. Transaction safety

| ID | Requirement |
|---|---|
| NF-T1 | Each administrative mutation is a single `prisma.$transaction`. |
| NF-T2 | The version check is part of the `UPDATE … WHERE` predicate, never a prior `SELECT`. |
| NF-T3 | The last-admin guard runs **inside** the transaction, after the mutation is staged, with `FOR UPDATE`. |
| NF-T4 | Session revocation is inside the same transaction as the status change. |
| NF-T5 | `logAudit` runs after commit. |
| NF-T6 | Icon upload writes the file first, the row second, with a compensating delete — so a row can never point at a file that was never written. |
| NF-T7 | Batch setting writes are all-or-nothing. |
| NF-T8 | No transaction spans an HTTP boundary or waits on user input. |

## 11. Concurrency

| ID | Requirement |
|---|---|
| NF-C1 | Optimistic concurrency (`version`) on `User`, `IconAsset`, `SystemSetting`. |
| NF-C2 | One pessimistic lock only: the last-admin guard's `FOR UPDATE`. |
| NF-C3 | Role assignment replaces the whole set atomically, so concurrent edits cannot interleave. |
| NF-C4 | No deadlock: the guard acquires locks in a single deterministic statement within a short transaction. |
| NF-C5 | Lost updates impossible for user and setting state. |
| NF-C6 | **Authorization data is never cached.** Roles are read from the session's user on every request — a role cache would let a revoked role keep working. |

## 12. Error recovery

| Failure | Recovery |
|---|---|
| DB unavailable | Transaction rolls back; 500 with a Persian message; retry offered. |
| Version conflict | 409 with a reload affordance; nothing written, nothing lost. |
| Last-admin violation | 409; state unchanged; the constraint is explained in Persian. |
| File written, row failed | File deleted in the same request; failure to delete is logged as an orphan. |
| Row exists, file missing | Resolution falls back to the default; gallery marks it damaged; **the map keeps working**. |
| Corrupt setting row | Default used; discrepancy logged. |
| Audit write fails post-commit | Business fact stands; logged; never surfaced as failure. |
| Zero active admins somehow reached | Documented break-glass: re-run the Phase 1 seed script, which provisions the initial Admin from environment variables. |
