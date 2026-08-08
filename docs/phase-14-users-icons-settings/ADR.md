# Phase 14 — Architecture Decision Records

All **Accepted** and binding. The implementation engineer makes none of these choices again. On implementation these are copied into `docs/DECISIONS.md` as ADR-030 onward.

---

## ADR-P14-01 — Authorization stays role-based; no `Permission` entity

**Context.** The brief invites an RBAC permission model and asks whether the project uses roles, permissions, claims or policies. The repository uses exactly one mechanism: `assertRole(actor, allowedRoles)` over a three-value `RoleCode` enum, called by all 40 API routes. There is no permission table, no claim, no policy.

**Decision.** Keep it. Phase 14 manages **role assignment** and displays a read-only role→capability matrix derived from code. No `Permission` or `RolePermission` entity is created.

**Alternatives.**
- *Full RBAC with permissions* — two new tables, a join on every request or a security-sensitive cache, and a mechanical rewrite of 40 gates, to express exactly the three groupings that already exist.
- *Hybrid (roles expanding to permissions)* — all of the above cost, plus two concepts to keep synchronised.

**Trade-offs.** Fine-grained access control is impossible without a future migration. Accepted: nothing in `PROJECT_SPEC.md` asks for it, and the three roles map cleanly onto the three real personas.

**Future impact.** `assertRole` is one function with one call shape. Replacing it with `assertCapability` later touches one file plus mechanical gate edits — a contained change, not a rewrite.

---

## ADR-P14-02 — Roles are assignable, not creatable

**Context.** `RoleCode` is a PostgreSQL enum. Adding a value requires a migration.

**Decision.** Phase 14 provides role **assignment**. There is no create/rename/delete-role UI.

**Alternatives.**
- *A `Role` table with free-text codes* — would decouple roles from the enum, but every gate references `RoleCode` members by name; the enum is what makes those gates type-checked.
- *A "create role" button that requires a deploy* — a lie to the operator.

**Trade-offs.** A new role needs a developer. Accepted and honest.

---

## ADR-P14-03 — Icons on the filesystem, outside `public/`, served through an authenticated route

**Context.** `ARCHITECTURE_AND_DATA_MODEL.md` specifies `storagePath` and `sha256`, implying filesystem storage. Next.js serves `public/` statically **before** middleware.

**Decision.** Bytes on disk under `ICON_ROOT` (default `<repo>/storage/icons`, env-overridable), **outside `public/`**, with metadata in `IconAsset`. Filenames are server-generated UUIDs. `storagePath` is stored relative. Serving goes through `GET /api/v1/icons/[id]/content`.

**Alternatives.**
- *`public/icons/`* — simplest, but files become world-readable, unauthenticated and un-auditable, and no CSP can be attached. Disqualifying for admin-managed content.
- *Bytes in a database column* — no filesystem dependency, but bloats every row read and prevents streaming.

**Trade-offs.** Requires a writable directory and a backup routine (already noted in `API_SECURITY_OFFLINE_OPERATIONS.md`). Accepted — it is the only option that permits authentication, CSP and audit.

**Future impact.** Relative `storagePath` lets the root move without a data migration. The same pipeline serves Phase 15's deferred attachments.

---

## ADR-P14-04 — SVG safety is layered; the sanitiser is the second line of defence

**Context.** `API_SECURITY_OFFLINE_OPERATIONS.md` §6 requires rejecting `<script>`, `<foreignObject>`, event handlers and external references. Hand-written SVG sanitisers have a long history of bypasses.

**Decision.** Two independent layers.
- **Primary:** uploaded SVG is rendered **only via `<img src>`**, never inlined, and served with `Content-Security-Policy: default-src 'none'; sandbox` and `X-Content-Type-Options: nosniff`. Scripts in an SVG loaded through `<img>` do not execute in any current browser.
- **Secondary:** an allowlist analyser that **rejects** (never silently strips) any forbidden construct, naming it in the error.

**Alternatives.**
- *Sanitiser only* — makes a regex parser the sole barrier against stored XSS. One bypass is a full compromise.
- *Add a sanitisation dependency (DOMPurify + jsdom)* — a heavyweight server-side DOM for one validation path, complicating offline container builds. Still would not remove the need for `<img>` + CSP.
- *Reject SVG entirely, allow PNG only* — genuinely safer, but SVG is explicitly required by the original requirements and is the right format for map icons at multiple zoom levels.

**Trade-offs.** The regex analyser may reject an exotic but benign file. Accepted: a false rejection is a message to the admin; a false acceptance would be stored XSS, and the `<img>` layer means even that is not exploitable.

**Future impact.** If a vetted sanitisation library is later adopted, it slots in as a third layer without changing the rendering contract.

---

## ADR-P14-05 — Users are soft-deleted; the last active Admin is protected inside the transaction

**Context.** `User` has ten back-relations to historical business records across six entities. `IMPLEMENTATION_PLAN.md` Phase 14 requires blocking removal of the last active Admin.

**Decision.** `deletedAt` soft delete. The last-admin guard runs **inside** the transaction, after the mutation is staged, with `SELECT … FOR UPDATE` over the admin rows. Restore returns a user to `INACTIVE`, never straight to `ACTIVE`.

**Alternatives.**
- *Hard delete* — orphans audit and provenance data, violating ADR-015. Not viable.
- *Guard before the transaction* — racy: two admins deactivating each other simultaneously would both observe a safe count and both succeed, leaving the system unadministrable.
- *Restore straight to `ACTIVE`* — one click silently re-granting login. Two deliberate steps is the safer default.

**Trade-offs.** `FOR UPDATE` serialises concurrent admin-status changes. Accepted — these are rare, and the alternative is an unadministrable system.

---

## ADR-P14-06 — Settings are a typed key–value registry, not a wide table

**Context.** No settings mechanism exists. `CLAUDE.md` §2 requires a configurable timezone.

**Decision.** `SystemSetting(key PK, value Json, version, updatedAt, updatedById)`, with a code-side registry defining type, default, env binding, validator, runtime effect and Persian labels. Rows are created lazily, so the table holds only deviations from default.

**Alternatives.**
- *One row, many typed columns* — a migration per new setting.
- *Type metadata in the database* — two sources of truth that can disagree; type safety would be lost at compile time.
- *Environment variables only* — not editable by an operator without a redeploy.

**Trade-offs.** `value` is `Json`, so the column itself is untyped; safety comes from the registry validator, which is the only writer. Accepted.

**Future impact.** Organisation-scoped settings add a nullable `organizationUnitId` and a compound unique key; the precedence chain already has the slot.

---

## ADR-P14-07 — Timezone becomes a setting without breaking the pure domain layer

**Context.** `TEHRAN_OFFSET_MINUTES` is a hardcoded constant in `jalali.ts`, contradicting `CLAUDE.md` §2. But `jalali.ts` is pure and consumed by pure domain modules (`mission-rules`, `dashboard-rules`, `timeline-rules`).

**Decision.** The pure functions gain an **optional** `offsetMinutes` parameter defaulting to the existing constant — every existing caller and test is unchanged. The configured value is read at the service/UI formatting boundary and passed in, which is exactly where `CLAUDE.md` says conversion belongs. Full propagation to every call site is explicitly not attempted in this phase.

**Alternatives.**
- *Make `jalali.ts` read settings directly* — turns a pure function async and couples the domain layer to the database, violating `CLAUDE.md` §2 and breaking every existing unit test.
- *A module-level mutable global set at startup* — hidden state, untestable, and wrong in a multi-tenant future.
- *Leave it hardcoded* — leaves `CLAUDE.md` §2 unsatisfied indefinitely.

**Trade-offs.** Call sites not yet updated continue to use Tehran. Accepted and documented as a known limitation rather than hidden.

**Future impact.** Each call site can adopt the parameter independently; no big-bang refactor.

---

## ADR-P14-08 — A system setting supplies a default; it never overrides a user's own choice

**Context.** Theme already persists per-browser in `localStorage` with a blocking init script. A "default theme" setting could plausibly overwrite it.

**Decision.** A system setting seeds users who have made **no** choice. It never overwrites an existing per-user value. The registry marks which keys have a user-level counterpart.

**Alternatives.**
- *System setting always wins* — an admin changing the default would yank every user's chosen theme. Hostile.
- *No system default at all* — a fresh deployment could not be branded.

**Trade-offs.** Two sources for one displayed value. Accepted; the precedence rule is stated once and applies uniformly.

**Future impact.** A `UserPreference` table slots beneath system defaults without changing the rule.

---

## ADR-P14-09 — Optimistic concurrency on `User`, `IconAsset` and `SystemSetting`

**Context.** No entity has concurrency control. Security configuration must not be silently overwritten.

**Decision.** A `version` integer, checked in the `UPDATE … WHERE` predicate and incremented on success. Mismatch ⇒ 409. Consistent with the decision already recorded for Phase 15 (ADR-P15-05).

**Alternatives.**
- *Pessimistic locks* — admin forms are human-paced; an abandoned tab would block the record.
- *Last-write-wins* — silently loses an administrator's change to security configuration.
- *`updatedAt` as the token* — timestamp collisions and clock adjustments make it unreliable.

**Trade-offs.** Clients must round-trip `version`. Accepted: Phase 14's own UI is the only consumer and ships together.

---

## ADR-P14-10 — Map provider CRUD is out of scope; only global map defaults are added

**Context.** The brief asks for map provider administration. Phase 4 already shipped it in full — CRUD, `isDefault`, `isEnabled`, `healthStatus`, connection test, `secretReference`.

**Decision.** Phase 14 does not touch provider management. It adds `map.defaultCenterLat/Lng`, `map.defaultZoom`, `map.sceneRefreshIntervalMs` and `map.showRouteLines` as settings — data Phase 4 never owned.

**Alternatives.**
- *Rebuild provider settings in the new settings UI* — duplicates a shipped, tested module and creates two places to change one value.
- *Migrate `MapProvider` config into `SystemSetting`* — destroys per-provider records, health status and the `secretReference` pattern.

**Trade-offs.** Map configuration lives in two places (`/system/map-providers` for providers, `/system/settings` for view defaults). Accepted — they are genuinely different concerns: *which tile server* versus *where the map opens*. The settings page links to the provider page.

**Future impact.** `secretReference` remains the established pattern for credentials, keeping secrets out of both stores (ADR-P14-06, I-13).
