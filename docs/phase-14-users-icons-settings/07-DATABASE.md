# Phase 14 — 07 — Database

Schema changes, indexes, migration, compatibility.

---

## 1. Principles

- **Additive only.** Applied migrations are immutable (`CLAUDE.md` §5). Nothing is dropped, renamed or retyped.
- **No backfill.** Every new column is nullable or defaulted, so existing rows stay valid.
- **Soft delete + audit** on business records (ADR-015).
- **UTC in the database**, Jalali at the UI boundary (ADR-008).
- **Reuse before create.** `User`, `Role`, `UserRole`, `Session`, `AuditLog` and `MapProvider` already exist and are extended, never duplicated.

## 2. `User` — additive columns only

```prisma
model User {
  // … every existing field unchanged …
  displayName      String?
  deletedAt        DateTime?
  lastLoginAt      DateTime?
  suspendedAt      DateTime?
  suspensionReason String?
  version          Int       @default(0)

  uploadedIcons    IconAsset[]     @relation("IconAssetUploadedBy")
  updatedSettings  SystemSetting[] @relation("SystemSettingUpdatedBy")

  @@index([deletedAt])
  @@index([isActive, deletedAt])
}
```

**Why `version` defaults to 0:** every existing row gets 0 with no backfill; the first mutation moves it to 1.

**Why `@@index([isActive, deletedAt])`:** the last-admin guard and the default user list both filter on exactly this pair. Without it, the guard — which runs inside a transaction holding `FOR UPDATE` — would sequentially scan.

> **`username` is deliberately not made case-insensitive at the database level.** Adding `citext` or a functional unique index would alter an applied migration's semantics. Uniqueness is enforced in the service with a case-insensitive query (BR-U01/V-U02) plus the existing exact `@unique` as a backstop. Documented as a known limitation: a race between two case-variant creations could theoretically pass the service check; the exact-match unique index still prevents identical duplicates, and a functional unique index is the Phase 17 hardening.

## 3. `IconAsset` — new

```prisma
enum IconCategory {
  VEHICLE
  OFFICE
  WAREHOUSE
  DESTINATION
  OTHER
}

model IconAsset {
  id               String       @id @default(uuid())
  name             String
  category         IconCategory
  mimeType         String       // "image/png" | "image/svg+xml"
  storagePath      String       // RELATIVE to ICON_ROOT — "{uuid}.{ext}"
  sha256           String
  width            Int?
  height           Int?
  fileSize         Int
  originalFilename String?      // display metadata only — never used to build a path
  isActive         Boolean      @default(true)
  version          Int          @default(0)

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?
  uploadedById String?

  uploadedBy        User?              @relation("IconAssetUploadedBy", fields: [uploadedById], references: [id])
  organizationUnits OrganizationUnit[]
  vehicleTypes      VehicleType[]
  vehicles          Vehicle[]

  @@index([category, isActive])
  @@index([deletedAt])
  @@index([sha256])
}
```

| Choice | Rationale |
|---|---|
| `storagePath` **relative** | The storage root can move (container volume, ops change) without a data migration. |
| `sha256` indexed | Duplicate detection on upload and integrity verification, without scanning. |
| `name` **not** `@unique` at DB level | Uniqueness applies only among *non-deleted* rows (V-I11); a plain unique index would wrongly block reusing a deleted icon's name. Enforced in the service. |
| `originalFilename` kept | Useful provenance for the admin; explicitly never touches the filesystem path (SEC-11). |
| Three back-relations | Makes `usageCount` a cheap aggregate instead of three separate counts. |

## 4. `SystemSetting` — new

```prisma
model SystemSetting {
  key         String   @id
  value       Json
  version     Int      @default(0)
  updatedAt   DateTime @updatedAt
  updatedById String?

  updatedBy User? @relation("SystemSettingUpdatedBy", fields: [updatedById], references: [id])
}
```

**`key` is the primary key** — one row per setting, no surrogate id, no uniqueness ambiguity.

**Rows are created lazily.** A key with no row uses its registry default, so the table contains exactly the operator's *deviations from default* — which makes "what has been changed here?" a `SELECT *`.

**No `group`, `type` or `default` columns.** Those live in the code registry (ADR-P14-06); duplicating them in the database would create two sources of truth that can disagree.

## 5. Icon foreign keys on existing entities

```prisma
model OrganizationUnit {
  // … existing …
  iconAssetId String?
  iconAsset   IconAsset? @relation(fields: [iconAssetId], references: [id], onDelete: SetNull)
  @@index([iconAssetId])
}

model VehicleType {
  // … existing …
  iconAssetId String?
  iconAsset   IconAsset? @relation(fields: [iconAssetId], references: [id], onDelete: SetNull)
  @@index([iconAssetId])
}

model Vehicle {
  // … existing …
  iconAssetId String?
  iconAsset   IconAsset? @relation(fields: [iconAssetId], references: [id], onDelete: SetNull)
  @@index([iconAssetId])
}
```

`onDelete: SetNull` is belt-and-braces alongside soft delete: icons are soft-deleted in practice, but if a row is ever hard-deleted the FK cannot dangle and break map rendering.

Every FK is indexed — an unindexed FK would make `usageCount` and the assignment lookups sequential scans on a table that already holds ~6,400 organisation units.

> **This finally implements what `ARCHITECTURE_AND_DATA_MODEL.md` has specified since Phase 2.** `PHASE_STATUS.md` incorrectly claims `iconAssetId` is already "پیش‌بینی شده در schema" — it is not (see `PRE_IMPLEMENTATION_REVIEW.md` §6, D1). Correcting those two entries is part of this phase.

## 6. Migration

One additive migration: `prisma migrate dev --name phase14_users_icons_settings`.

| Step | Operation | Risk |
|---|---|---|
| 1 | `CREATE TYPE "IconCategory"` | none |
| 2 | `ALTER TABLE "User" ADD COLUMN …` ×6, all nullable/defaulted | none — nullable adds and `Int DEFAULT 0` are metadata-only on PG 11+ |
| 3 | `CREATE TABLE "IconAsset"` | none |
| 4 | `CREATE TABLE "SystemSetting"` | none |
| 5 | `ALTER TABLE` ×3 add `iconAssetId` + FK | none — nullable |
| 6 | `CREATE INDEX` ×8 | brief write lock; use `CONCURRENTLY` if the deployment cannot take it |

**No data migration.** Every existing user is valid: `deletedAt`/`suspendedAt`/`lastLoginAt`/`displayName` null, `version` 0. `deriveUserStatus` returns `ACTIVE` or `INACTIVE` from the existing `isActive` exactly as before.

### 6.1 Storage directory

`ICON_ROOT` is created at startup if absent. Default `<repo>/storage/icons`, overridable by `ICON_STORAGE_ROOT`. **Added to `.gitignore`** — uploaded content is operator data, not source. Backup is an ops concern already noted in `API_SECURITY_OFFLINE_OPERATIONS.md` §deployment ("backup روزانه PostgreSQL و upload icons").

## 7. Rollback

| Scenario | Action |
|---|---|
| Migration fails mid-way | Prisma wraps it in a transaction; nothing applied; re-run after fixing. |
| Rollback before any admin data is created | Dropping the new tables/columns is safe. |
| Rollback after users/icons/settings exist | **Destroys business data.** `IconCategory` cannot be removed from PostgreSQL. Practical rollback is a forward fix. |
| Storage directory lost | Icon rows survive; resolution falls back to defaults (BR-I02); the gallery marks entries damaged. **The map keeps working** — this is exactly why the fallback is silent. |

## 8. Compatibility with existing consumers

| Consumer | Impact |
|---|---|
| Login / session | Must now also reject `suspendedAt != null` and `deletedAt != null`, not just `isActive`. **This is a required change to the shipped auth flow** — without it a suspended user could still log in. |
| `getCurrentUser()` | Must exclude soft-deleted users. |
| Every existing user query | Must add `deletedAt: null`. This is the classic soft-delete trap (risk R2) and has an explicit test. |
| `map-scene-service` | Adds `iconAssetId` to an existing `select` — no new query. |
| `/api/v1/map/organization-units` | Same. |
| Map marker rendering | Reads the resolved icon; falls back to today's coloured circle. |
| `jalali.ts` | Gains an optional offset parameter defaulting to the current constant — **every existing caller and test is unchanged**. |
| Phase 13 dashboard | Unaffected. |
| Phase 15 pack | Unaffected; its deferred attachments reuse this phase's pipeline. |

## 9. Query patterns

| Query | Shape | Index used |
|---|---|---|
| User list (default) | `where deletedAt null` + page | `User(isActive, deletedAt)` |
| Username uniqueness | case-insensitive equality | seq scan on a small table — acceptable; a functional index is Phase 17 |
| Last-admin guard | join `UserRole`→`Role`, `FOR UPDATE` | `User(isActive, deletedAt)` + `UserRole` PK |
| Icon gallery | `where category, isActive, deletedAt null` | `IconAsset(category, isActive)` |
| Icon usage count | 3 aggregates over back-relations | the three `iconAssetId` indexes |
| Settings read | PK lookup, cached | PK |
| Audit list | filter + order by `occurredAt` desc | existing `(entityType, entityId)` and `(actorUserId)` |

> **Audit filtering by date range alone is not covered by an existing index.** If the audit table grows past ~100k rows, add `@@index([occurredAt])`. Not added now because the table is small and every additional index slows the write path that every phase depends on. Recorded as a Phase 17 capacity item.
