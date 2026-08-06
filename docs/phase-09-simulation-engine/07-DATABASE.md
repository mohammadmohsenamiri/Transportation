# 07 — Database Impact

## 1. Summary

**Phase 9 requires zero changes to `prisma/schema.prisma` and zero migrations.** This is a hard constraint, not a preference — see [01-SCOPE.md](./01-SCOPE.md) §7 item 4 and `CLAUDE.md` §2's ban on persisting computed positions.

## 2. Migration Requirements

None. If the implementer finds themselves reaching for `npx prisma migrate dev`, stop — that means the design has drifted from this pack and the pack (or the implementer's understanding of it) needs to be revisited before continuing, not the schema.

## 3. Reads Performed by Phase 9

All reads happen inside `getMissionSimulation()` in `src/server/services/simulation-service.ts`. Exactly one Prisma query:

```ts
const mission = await prisma.mission.findFirst({
  where: { id: missionId, deletedAt: null },
  include: {
    route: {
      include: {
        points: { orderBy: { sequence: "asc" } },
      },
    },
  },
});
```

**Important subtlety (route version pinning, BR-3):** the `route: { include: ... } }` relation traverses `Mission.routeId`, which points at the Prisma-relation Route row — but `Route` rows are versioned by `(code, version)` with a *new row per version* (ADR-020), and `Mission.routeId` is a foreign key to one specific `Route.id`, which is already version-pinned by construction (each version is a distinct row with a distinct `id`). **Therefore `mission.route` (via the FK) already IS the exact pinned version — no separate lookup by `routeVersion` is needed at read time.** `Mission.routeVersion` (the `Int?` column) is redundant with the FK for this read path; it exists for audit/display purposes elsewhere (`mission-service.ts`'s `toDTO()`). The loader should still defensively assert `mission.route?.version === mission.routeVersion` and throw `SIMULATION_ROUTE_SNAPSHOT_MISSING` if they disagree (this would only happen under data corruption, never under normal operation — see [02-REQUIREMENTS.md](./02-REQUIREMENTS.md) EC-9).

## 4. Indexes

No new indexes required. The query above is satisfied entirely by existing indexes:

| Index (existing) | Used by |
|---|---|
| `Mission.id` (primary key) | `WHERE id = missionId` |
| `RoutePoint(routeId, sequence)` — enforced via `@@unique([routeId, sequence])` on `RoutePoint` | `points: { orderBy: { sequence: "asc" } }` (the unique constraint's underlying B-tree index serves this ordering directly) |

Cross-reference: `docs/ARCHITECTURE_AND_DATA_MODEL.md` §7 already lists the indexes a future *listing/filtering* query over many missions would need (`Mission(startAt)`, `Mission(estimatedArrivalAt)`, `Mission(vehicleId,startAt)`, etc.) — those are **Phase 10's concern** (querying *which* missions are active in a time window), not Phase 9's (simulating *one already-identified* mission). Phase 9 does not add or require any of those listing indexes.

## 5. Future Compatibility

| Future need | Compatibility |
|---|---|
| Phase 10 needs to simulate many missions in one map load | Achievable by adding a new service function (`getMissionSimulations(missionIds, viewTime)`) that batches the same `findFirst`-shaped read into a single `findMany`, without touching Phase 9's schema-independent design. No migration needed for this either — it is purely a new query, not a new column. |
| A future phase wants to persist a periodic snapshot for historical playback (Phase 12's seeker) | Out of scope for Phase 9 (see [11-OUT_OF_SCOPE.md](./11-OUT_OF_SCOPE.md)). If ever built, it would be an explicit, separate, deliberately-designed snapshot table with its own retention/versioning policy — not something Phase 9 should anticipate with speculative columns now. |

## 6. Caching Tables

**None in Phase 9.** See [04-ARCHITECTURE.md](./04-ARCHITECTURE.md) §10 for the full caching-strategy rationale, and ADR-017 in the main `docs/DECISIONS.md` ("Redis در شروع اجباری نیست") for the project-wide precedent this follows.

## 7. Snapshot Strategy

Phase 9 does not create snapshots of its own. It **consumes** the snapshot Phase 7 already created (`Mission.speedSnapshotKmh`, `Mission.originLatitude`/etc., `Mission.routeId`+`routeVersion`) — this is the entire point of Phase 7's snapshot design (`CLAUDE.md` §2: "تغییر متوسط سرعت خودرو نباید تاریخچه مأموریت جاری/گذشته را تغییر دهد؛ سرعت در زمان برنامه‌ریزی یا انتشار مأموریت snapshot شود"). Phase 9 is a pure consumer of that guarantee, not a producer of any new one.

## 8. Versioning Strategy

Not applicable — Phase 9 introduces no persisted schema, so there is no schema version to manage. The *data* versioning it relies on (Route's append-only `version` column, ADR-020) is Phase 5's concern, already shipped, already stable.
