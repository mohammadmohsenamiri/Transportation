# Phase 14 — 11 — Out of Scope

Everything deliberately excluded, why, and who owns it. Listed here ⇒ building it is a scope violation.

---

## 1. Owned by earlier phases — consume, never rebuild

| Excluded | Why | Owner |
|---|---|---|
| Authentication: login, logout, session issuance, password verification | Shipped and working. Phase 14 *extends* the login check to also reject suspended and deleted users — it does not rebuild the flow. | Phase 1 |
| argon2 hashing | Reused verbatim. Re-implementing or "improving" a password hash is how systems get weaker, not stronger. | Phase 1 |
| `assertRole` / `requireActor` | The authorization mechanism. Consumed unchanged. | Phase 1 |
| `AuditLog` schema | Already carries every field this phase needs. Only new `action` values are added. | Phase 1 |
| First-login forced password change | `mustChangePassword` already exists and already works. | Phase 1 |
| Organisation unit CRUD | Only `iconAssetId` is added. | Phase 2 |
| Vehicle / vehicle-type / cargo-type CRUD | Only `iconAssetId` is added. | Phase 3 |
| **Map provider CRUD, connection test, health status, `secretReference`** | Shipped in full. Phase 14 adds only global map *defaults* (centre, zoom, refresh) — data Phase 4 never owned. | Phase 4 |
| CSV import/export | Phase 14 reuses its upload *pattern*, not its code. | Phase 5 |
| Missions, shipments, routes, simulation, map rendering, timeline, dashboard | Untouched. | Phases 5–13 |
| Mission lifecycle states | Specified for Phase 15. | Phase 15 |

## 2. Deliberately rejected

Not deferred — decided against, with reasons.

| Rejected | Why |
|---|---|
| **`Permission` / `RolePermission` entities** | No permission model exists. Three fixed roles and 40 route gates all calling `assertRole`. Introducing permissions means two tables, a security-sensitive cache, and a mechanical rewrite of every gate — to express exactly the three groupings that already exist. Negative value today. ADR-P14-01. |
| **Role creation / deletion UI** | `RoleCode` is a PostgreSQL enum; a new role requires a migration. A "create role" button that cannot create a role would be a lie to the operator. Assignment is in scope; creation is not. ADR-P14-02. |
| **Storing icons in `public/`** | Next.js serves `public/` statically **before** middleware. Files there are world-readable, unauthenticated and un-auditable — disqualifying for admin-managed content. ADR-P14-03. |
| **Inlining uploaded SVG into the DOM** | Reintroduces the exact stored-XSS vector the design eliminates, including "just for the preview". The preview uses `<img>` like everything else. |
| **Relying on the SVG sanitiser alone** | Hand-written SVG sanitisers have a long history of bypasses. `<img>` rendering + CSP is the durable control; the parser is defence in depth. ADR-P14-04. |
| **An image-processing dependency (sharp, jimp)** | Dimensions come from a 24-byte PNG header parse. A native dependency for that complicates offline deployment and container builds for negligible benefit. |
| **Caching roles or permissions** | Stale security configuration: a revoked role would keep working. Roles are read per request, deliberately. |
| **Pessimistic locking on user edits** | Admin forms are human-paced; a row lock held across an open form would block the record on an abandoned browser tab. |
| **Hard-deleting users** | `User` has ten back-relations to historical business records. Hard deletion orphans audit and provenance data, violating ADR-015. |
| **Email-based password reset / self-service registration** | No mail infrastructure exists, and the deployment is LAN-only (ADR-004). Admin-issued passwords are the model. |
| **SSO / LDAP / OAuth** | Would make an external service a hard dependency for login, directly violating ADR-004's offline requirement. |
| **Secrets stored as settings** | The registry contains no secret key and the API rejects unknown keys. Credentials continue to use the `MapProvider.secretReference` pattern. |
| **Making Internet availability a dependency** | The internal map provider stays first-class; nothing in this phase requires an external provider. |

## 3. Deferred — extension points, not implementations

| Excluded | Why deferred | Seam that keeps it cheap |
|---|---|---|
| **Mission attachments** | Phase 15's pack explicitly defers them here so a second upload pipeline is never built. This phase must leave the pipeline reusable, not build attachments. | Upload → validate → hash → store → serve is written over a *category*, not hardcoded to icons. |
| **Per-vehicle icon assignment UI** | `Vehicle.iconAssetId` is created now and consulted first by `resolveIcon`; the initial UI assigns at type level because that is the operationally useful granularity. | Column and resolution already exist; UI only. |
| **Organisation-scoped settings** | `PROJECT_SPEC.md` marks organisational scoping optional in v1. Building a scope dimension with no consumer is speculation. | `SystemSetting` gains a nullable `organizationUnitId` and a compound unique key; the precedence chain already has the slot. |
| **Per-user preferences table** | Only theme has a real per-user need today, and `localStorage` already serves it. | The registry marks which keys have a user counterpart; a `UserPreference` table slots beneath system defaults. |
| **Icon editing (crop, resize, recolour)** | Requires an image-processing pipeline out of proportion to the need. Admins upload correctly-sized assets. | — |
| **Icon versioning with history** | Replace keeps identity and changes the hash, which is sufficient for cache correctness. Retaining every past version is storage growth with no stated requirement. | `sha256` already identifies content uniquely. |
| **Bulk user import (CSV)** | No stated requirement; the CSV pipeline exists if one appears. | Phase 5's pattern. |
| **User organisational assignment** | The brief lists it as "if applicable". `PROJECT_SPEC.md` makes org scoping optional in v1, and no feature consumes it. Building an unused FK invites incorrect assumptions. | Additive nullable FK when a consumer exists. |
| **Configuration import/export** | The brief lists it. Deferred: exporting settings is trivial once the registry exists, but *importing* is a privileged bulk-write path needing its own validation and audit design. Not built without a stated operational need. | Registry-driven serialisation. |
| **Audit retention, archival, export** | The viewer is read-only over an indexed table. Retention is an ops concern. | Phase 17. |
| **`occurredAt` index on `AuditLog`** | Every added index slows the write path that all phases depend on. The table is small today. | One migration when volume justifies it. |
| **Shared/multi-instance settings cache** | Deployment is single-instance (A1); the shipped rate limiter has the identical limitation. | Cache access is behind one module. |
| **Shared/persistent rate limiting** | Same limitation, already documented since Phase 1. | Phase 17. |
| **Full SSRF hardening of provider URLs** | Explicitly deferred by Phase 4's record. | Phase 17. |
| **Mapnik XML style import** | ADR-022 freezes the architecture; it needs its own phase. | Future phase. |

## 4. Known pre-existing issues Phase 14 must not absorb

Real defects in **other** modules. Phase 14 neither fixes nor is blamed for them:

| Issue | Status |
|---|---|
| Organisation tree and fleet list render every record with no pagination; two e2e tests fail at current volume (~6,400 units, ~1,220 vehicles) | Pre-existing, verified against the pre-Phase-13 commit. Tracked separately. **Phase 14 must not repeat the pattern** — every new list here is paginated (NF-P3). |
| `mission-interaction.spec.ts:166` intermittently fails on `mobile-360` under full-suite load | Pre-existing; identical failure rate on baseline. |
| In-memory, per-process rate limiting | Documented since Phase 1; Phase 17. |
| `username` uniqueness enforced in the service rather than by a functional database index | Documented in `07-DATABASE.md` §2 with its residual race; Phase 17 hardening. |
