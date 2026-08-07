# Phase 15 — 07 — Database

Schema changes, indexes, migration strategy and compatibility.

---

## 1. Principles

- **Additive only.** Applied migrations are immutable (`CLAUDE.md` §5). No existing column is dropped, renamed or retyped.
- **`ARCHIVED` is reused, never redefined.** It already exists in `MissionPersistedStatus`; Phase 15 is the first code to write it.
- **Soft delete + audit** on all business records (ADR-015).
- **UTC in the database**, Jalali only at the UI boundary (ADR-008).
- **Nullable by necessity.** Every new mission column is nullable or defaulted, so the migration needs no backfill and existing rows stay valid.

## 2. Enum changes

```prisma
enum MissionPersistedStatus {
  DRAFT
  SCHEDULED
  COMPLETED   // new
  FAILED      // new
  CANCELLED
  ARCHIVED    // existed since Phase 7 — never written until now
}

enum MissionFailureClassification {   // new
  VEHICLE_BREAKDOWN
  ACCIDENT
  CARGO_ISSUE
  ROUTE_BLOCKED
  WEATHER
  DRIVER_UNAVAILABLE
  OTHER
}
```

> PostgreSQL enum values can be added but **not removed or reordered**. Append `COMPLETED`/`FAILED`; do not attempt to place them "logically" between existing values.

## 3. Model changes

### 3.1 `Mission` — added columns

```prisma
model Mission {
  // … all existing fields unchanged …

  actualDepartureAt     DateTime?
  actualArrivalAt       DateTime?
  failedAt              DateTime?
  failureReason         String?
  failureClassification MissionFailureClassification?
  archivedAt            DateTime?
  statusBeforeArchive   MissionPersistedStatus?
  reopenCount           Int      @default(0)
  lastReopenedAt        DateTime?
  version               Int      @default(0)
  missionTypeId         String?

  missionType MissionType?  @relation(fields: [missionTypeId], references: [id])
  missionNotes MissionNote[]

  @@index([missionTypeId])
  @@index([persistedStatus, startAt])
  @@index([actualArrivalAt])
}
```

**Why `version` defaults to 0, not 1:** every existing row gets 0 with no backfill, and the first mutation moves it to 1. Any client sending a version it actually read is correct from day one.

**Why `statusBeforeArchive` is a column rather than inferred from audit:** unarchive must be deterministic and cheap. Reconstructing the pre-archive state by scanning `AuditLog` would be slow, fragile, and would fail if audit were ever pruned.

### 3.2 `MissionType` — new

```prisma
model MissionType {
  id          String  @id @default(uuid())
  code        String? @unique
  name        String  @unique
  description String?
  isActive    Boolean @default(true)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  missions Mission[]

  @@index([isActive])
}
```

Deliberately identical in shape to the shipped `VehicleType` / `CargoType`, so the admin UI and service can follow the existing pattern verbatim.

### 3.3 `MissionNote` — new

```prisma
model MissionNote {
  id          String   @id @default(uuid())
  missionId   String
  body        String   @db.VarChar(2000)
  createdById String
  createdAt   DateTime @default(now())
  deletedAt   DateTime?

  mission Mission @relation(fields: [missionId], references: [id])

  @@index([missionId, createdAt])
  @@index([createdById])
}
```

`@@index([missionId, createdAt])` is composite because the only query is "notes for this mission, newest first" — a compound index serves both the filter and the sort from one structure.

## 4. Indexes

| Index | Serves | Why it is needed |
|---|---|---|
| `Mission(persistedStatus, startAt)` | dashboard range queries, mission list filters | The dashboard reads all missions in a range and the list filters by status. With ~1,000 missions today and growth ongoing, the existing single-column index on `persistedStatus` no longer covers the sort. |
| `Mission(actualArrivalAt)` | future variance/report queries; archive sweeps | Cheap now, avoids a later migration on a bigger table. |
| `Mission(missionTypeId)` | type filter; deletion-guard count | FK columns without indexes make the `missionCount` guard a sequential scan. |
| `MissionNote(missionId, createdAt)` | note thread | Filter + sort in one. |
| `MissionNote(createdById)` | "my notes"; author-deletion check | |
| *(existing)* `MissionShipment` partial unique on `shipmentId WHERE isActiveAssignment` | ADR-019 | **Unchanged.** Reopen (LR-13) depends on it firing. |

## 5. Migration strategy

Single additive migration, `prisma migrate dev --name phase15_mission_lifecycle`.

| Step | Operation | Risk |
|---|---|---|
| 1 | `ALTER TYPE "MissionPersistedStatus" ADD VALUE 'COMPLETED'` / `'FAILED'` | None. Additive. **Note:** PostgreSQL historically forbade using a newly added enum value in the *same* transaction. Verify against the project's PG version; if affected, split into two migrations — enum first, columns second. |
| 2 | `CREATE TYPE "MissionFailureClassification"` | None |
| 3 | `ALTER TABLE "Mission" ADD COLUMN …` (all nullable/defaulted) | None. No table rewrite for nullable adds; `version Int DEFAULT 0` is metadata-only on PG 11+. |
| 4 | `CREATE TABLE "MissionType"`, `"MissionNote"` | None |
| 5 | `CREATE INDEX …` | Locking on a large table — use `CONCURRENTLY` if the deployment cannot take a brief write lock. |

**No data backfill.** Every existing mission remains valid: `DRAFT`/`SCHEDULED`/`CANCELLED` rows keep their status, all new columns are null or 0, and every invariant in `03-DOMAIN.md` §5 holds for them (I-02/I-03/I-05 are implications whose antecedents are false).

### 5.1 Legacy `Mission.notes`

**Not migrated into `MissionNote`.** It holds the planner's original free-text note, authored at creation with no timestamp or author — synthesising those would fabricate audit data. It stays as-is, displayed as "planner's note" on mission detail; the thread is additive alongside it. A future phase may migrate it once a defensible authorship rule exists.

## 6. Rollback

| Scenario | Action |
|---|---|
| Migration fails mid-way | Prisma wraps it in a transaction; nothing applied. Re-run after fixing. |
| Rollback after deploy | Dropping the added columns is safe **only if no row uses `COMPLETED`/`FAILED`**. Once any mission is completed, rollback would lose that business fact — so the practical rollback is a forward fix, not a down-migration. Enum values cannot be removed in PostgreSQL at all. |
| Partial index creation | Re-runnable; `CREATE INDEX IF NOT EXISTS`. |

**This is a one-way door once the first mission is completed.** That is normal for business-fact schema and must be stated in the release checklist rather than discovered.

## 7. Compatibility

| Consumer | Impact |
|---|---|
| `getMapScene` (Phase 10) | Reads `persistedStatus` and passes it to `deriveMissionDisplayStatus`. New values flow through automatically. **Verify** its `where` clause: it filters `persistedStatus: "SCHEDULED"`, so completed missions correctly drop off the live map. |
| `getDashboardSummary` (Phase 13) | Counts by display status; gains two buckets. Its narrow `select` must add the new fields only if it needs them — it does not, since it derives status from the three existing time/status fields. |
| `useMissionInteraction` (Phase 11) | Filters by display status; new values must be added to its filter options. |
| `missions-list-view` (Phase 7) | Status dropdown gains `COMPLETED`/`FAILED`. |
| Existing e2e fixtures | Unaffected — they create `DRAFT`/`SCHEDULED` missions. |
| Any client omitting `version` | **Breaks by design** (422). The mission UI is the only client and ships in the same phase. |

## 8. Query patterns

| Query | Shape | Index used |
|---|---|---|
| Mission detail + notes | 1 read + 1 note query | PK, `MissionNote(missionId, createdAt)` |
| Transition | conditional `updateMany` on `(id, version)` | PK |
| List by status | `where persistedStatus in (…) order by startAt` | `Mission(persistedStatus, startAt)` |
| Dashboard range | `where deletedAt null and startAt between …` narrow select | `Mission(persistedStatus, startAt)` |
| Type deletion guard | `count where missionTypeId = ?` | `Mission(missionTypeId)` |

No Phase 15 query is unbounded, and none introduces an N+1 — shipment side effects are set-based `updateMany` (P-02).
