# Phase 14 — 01 — Scope

Binding boundary. Not listed in §1 ⇒ out of scope; §2 and `11-OUT_OF_SCOPE.md` say why.

---

## 1. In scope

### 1.1 Database

| ID | Item |
|---|---|
| S1 | `User` additive columns: `displayName`, `deletedAt`, `lastLoginAt`, `suspendedAt`, `suspensionReason`, `version` |
| S2 | New model `IconAsset` |
| S3 | New enum `IconCategory` = `VEHICLE` \| `OFFICE` \| `WAREHOUSE` \| `DESTINATION` \| `OTHER` |
| S4 | New model `SystemSetting` |
| S5 | `iconAssetId` nullable FK on `OrganizationUnit`, `VehicleType`, `Vehicle` + index on each |
| S6 | One additive migration covering S1–S5, no backfill |

### 1.2 Pure domain

| ID | Item |
|---|---|
| S7 | `src/lib/domain/user-rules.ts` — username rules, password policy, `deriveUserStatus`, `canDeactivate`/`canRemoveAdminRole` (last-admin guard), self-modification rules |
| S8 | `src/lib/domain/icon-rules.ts` — extension/MIME/size/magic-byte validation, SVG allowlist analysis, `resolveIcon` chain, category↔entity mapping |
| S9 | `src/lib/settings/settings-registry.ts` — every key with type, default, validator, audit sensitivity, runtime-effect note |
| S10 | `jalali.ts` gains an **optional** `offsetMinutes` parameter defaulting to the current Tehran constant — every existing caller and test unchanged |

### 1.3 Services

| ID | Item |
|---|---|
| S11 | `user-service`: create, update, activate, deactivate, suspend, unsuspend, soft-delete, restore, assign/unassign roles, reset password, list, get |
| S12 | Last-admin guard enforced **inside** the transaction with a locking read |
| S13 | Optimistic concurrency (`version`) on user mutations |
| S14 | `icon-service`: upload, list, get metadata, replace, soft-delete, restore, assign to entity/type, serve bytes |
| S15 | Filesystem storage outside `public/`, UUID filenames, `sha256` content hash |
| S16 | `settings-service`: get typed value, get all, set (validated), reset to default, per-process cache with write invalidation |
| S17 | `audit-query-service`: filter by actor/entity type/entity id/action/date range, paginated |
| S18 | Audit entries for every administrative mutation |

### 1.4 API

| ID | Item |
|---|---|
| S19 | `GET`/`POST /api/v1/users`, `GET`/`PATCH /api/v1/users/[id]` |
| S20 | `POST /api/v1/users/[id]/{activate,deactivate,suspend,unsuspend,restore,reset-password}`, `DELETE /api/v1/users/[id]` |
| S21 | `PUT /api/v1/users/[id]/roles` |
| S22 | `GET`/`POST /api/v1/icons`, `GET`/`PATCH`/`DELETE /api/v1/icons/[id]`, `POST /api/v1/icons/[id]/restore` |
| S23 | `GET /api/v1/icons/[id]/content` — authenticated byte serving with CSP + `nosniff` |
| S24 | `PUT /api/v1/icons/assignments` — assign an icon to an org unit / vehicle type / vehicle |
| S25 | `GET`/`PUT /api/v1/settings`, `POST /api/v1/settings/[key]/reset` |
| S26 | `GET /api/v1/audit` — filtered, paginated |
| S27 | Zod schema per endpoint; `requireActor([ADMIN])` on every one except S23 (all authenticated roles, since the map renders icons for everyone) |

### 1.5 UI

| ID | Item |
|---|---|
| S28 | `/system/users` — list, filters, create/edit sheet, status actions, role assignment, confirmations |
| S29 | `/system/icons` — gallery, upload with preview, replace, delete/restore, assignment |
| S30 | `/system/settings` — grouped, typed form controls, per-field validation, reset-to-default |
| S31 | `/system/audit` — filterable, paginated read-only table with Jalali timestamps |
| S32 | Read-only role→capability matrix on the users page, derived from code |
| S33 | Icon rendering in the map's existing marker layer, with the coloured circle as fallback |
| S34 | All of the above at 360/768/1024/1440, RTL, keyboard-operable, 44px touch targets, both themes |

### 1.6 Tests & docs

| ID | Item |
|---|---|
| S35 | Unit tests for S7–S9 with 100% branch coverage |
| S36 | Integration tests per `08-TESTS.md` |
| S37 | **Full security suite** — unauthorised, forbidden, privilege escalation, IDOR, XSS, SVG injection, path traversal, oversized/malicious upload, MIME spoofing |
| S38 | Concurrency tests, including the last-admin race |
| S39 | Offline test — every flow with the Internet disconnected |
| S40 | `PHASE_STATUS.md`, `README.md`, ADR-030…039, and the four documentation defects corrected |

## 2. Out of scope

| Item | Why | Owner |
|---|---|---|
| `Permission` / `RolePermission` entities | No permission model exists; 40 route gates use `assertRole`. Introducing permissions rewrites every gate for zero present benefit. ADR-P14-01. | Future, if ever |
| Creating or deleting **roles** | `RoleCode` is a PostgreSQL enum; a new role needs a migration. Assignment is in scope, creation is not. ADR-P14-02. | Future |
| Map provider CRUD | Shipped in Phase 4. | Phase 4 |
| Self-service registration, password recovery by email | No mail infrastructure; LAN-only deployment. Admin-issued passwords only. | Not planned |
| SSO / LDAP / OAuth | Would make an external service a hard dependency, violating ADR-004. | Not planned |
| Mission attachments | Phase 15 defers them here; this phase must leave the upload pipeline reusable but does not build attachments. | Phase 15+ |
| Mapnik XML style import | ADR-022, explicitly a separate future phase. | Future |
| Shared/persistent rate limiting | In-memory limitation inherited from Phase 1. | Phase 17 |
| Full SSRF hardening of provider URLs | Explicitly deferred by Phase 4's record. | Phase 17 |
| Org-unit-scoped user visibility | `PROJECT_SPEC.md` marks organisational scoping optional in v1; the model supports it later. | Future |
| Pagination for the org tree / fleet list | Real pre-existing scale defect in another module. | Separate task |
| Icon editing (crop, resize, recolour) | An image-editing pipeline needs a dependency; out of proportion. Admins upload correctly-sized assets. | Future |

## 3. Future work — designed-for extension points

| Extension | Seam |
|---|---|
| Permission-based authorization | `assertRole` is one function with one call shape. Replacing it with `assertCapability` later touches one file plus the route gates mechanically. |
| Per-entity icon on individual vehicles | `Vehicle.iconAssetId` is created in this phase and consulted first by `resolveIcon`, even though the UI initially assigns at type level. |
| Organisation-scoped settings | `SystemSetting` gains a nullable `organizationUnitId` and a compound unique key; the registry and precedence chain already anticipate a scope dimension. |
| User preferences table | The settings registry marks which keys have a user-level counterpart; a `UserPreference` table slots beneath system defaults without changing the precedence rule. |
| Mission attachments (Phase 15) | The upload → validate → hash → store → serve pipeline is written generically over a category, not hardcoded to icons. |
| Multi-instance settings cache | Cache access is behind one module; swapping in a shared store is a single-file change. |

## 4. Dependencies to verify before starting

1. `User`, `Role`, `UserRole`, `Session`, `AuditLog` exist as described in `PRE_IMPLEMENTATION_REVIEW.md` §2.1.
2. `assertRole` / `requireActor` / `ActorContext` unchanged.
3. argon2 hashing helpers in `src/lib/auth/`.
4. `rate-limit.ts` exports a usable limiter.
5. `src/app/api/v1/routes/import-csv/route.ts` still shows the upload pattern.
6. `OrganizationUnit`, `VehicleType`, `Vehicle` exist and have no `iconAssetId`.
7. `MapProvider` and `/system/map-providers` are live and must not be modified.
8. `/system` layout shell exists.
9. `src/lib/dates/jalali.ts` exports `utcIsoToJalali`, `jalaliToUtcIso`, `tehranCalendarDayRange`.

## 5. Assumptions

| # | Assumption | If false |
|---|---|---|
| A1 | Deployment is single-instance; per-process caching is acceptable. | Multi-instance needs a shared cache — Phase 17. |
| A2 | The app process can write to a local directory outside `public/`. | Storage strategy must change; the service boundary contains it. |
| A3 | Admins upload already-sized icons; no server-side image processing. | Editing is out of scope. |
| A4 | Passwords are issued by an Admin and changed on first login (`mustChangePassword` already exists). | — |
| A5 | Three roles suffice; no user-defined roles. | Would require ADR-P14-01/02 to be revisited. |
| A6 | Icons are small (≤ 2 MB, per `API_SECURITY_OFFLINE_OPERATIONS.md` §6). | — |
| A7 | The audit table is small enough for filtered, paginated reads without archival. | Retention/archival is a Phase 17 ops concern. |
