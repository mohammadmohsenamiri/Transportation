# Phase 15 — 05 — Implementation Guide

Pseudocode, algorithms, transaction boundaries and complexity. Written so the implementation engineer types code, not decisions.

---

## 1. Build order

Strictly sequential — each step is independently verifiable.

| Step | Deliverable | Gate |
|---|---|---|
| 1 | Prisma migration (enums, fields, `MissionType`, `MissionNote`, indexes) | `prisma migrate dev` clean; `prisma generate` |
| 2 | `mission-labels.ts` extended | typecheck |
| 3 | `mission-lifecycle.ts` (pure) + unit tests | all L-tests green |
| 4 | `deriveMissionDisplayStatus` extended + unit tests | all D-tests green; **existing tests still pass** |
| 5 | `simulateMissionPosition` freeze extended + unit tests | all S-tests green |
| 6 | Optimistic concurrency on existing mutations | C-tests green |
| 7 | New service operations | integration tests green |
| 8 | Zod schemas + API routes | API tests green |
| 9 | Client hooks + UI | e2e green |
| 10 | Cross-phase regression (map/table/timeline/dashboard) | R-tests green |
| 11 | Docs + ADRs + ship | full verification |

> **Do not skip step 4's "existing tests still pass" gate.** `deriveMissionDisplayStatus` is consumed by Phases 9–13; a regression there is a four-phase regression.

## 2. Pure lifecycle module

`src/lib/domain/mission-lifecycle.ts`

```ts
export function canTransition(from: MissionPersistedStatus, action: MissionAction): boolean {
  const spec = MISSION_TRANSITIONS.find((t) => t.action === action);
  return spec ? spec.from.includes(from) : false;
}

export function assertTransitionAllowed(from: MissionPersistedStatus, action: MissionAction): void {
  if (!canTransition(from, action)) {
    throw new DomainError(
      "MISSION_INVALID_TRANSITION",
      `انجام این عملیات روی مأموریتی با وضعیت «${missionPersistedStatusLabel[from]}» ممکن نیست.`,
    );
  }
}

export function resolveTargetStatus(
  action: MissionAction,
  mission: { persistedStatus: MissionPersistedStatus; statusBeforeArchive: MissionPersistedStatus | null },
): MissionPersistedStatus {
  const spec = MISSION_TRANSITIONS.find((t) => t.action === action)!;
  if (spec.to) return spec.to;
  // فقط unarchive هدف محاسبه‌شده دارد: به همان وضعیت پایانی پیش از بایگانی برمی‌گردد.
  if (action === "unarchive") {
    if (!mission.statusBeforeArchive) {
      throw new DomainError("MISSION_INVALID_TRANSITION", "وضعیت پیش از بایگانی ثبت نشده است.");
    }
    return mission.statusBeforeArchive;
  }
  throw new DomainError("MISSION_INVALID_TRANSITION", "هدف این گذار قابل تعیین نیست.");
}
```

### 2.1 Guards

```ts
export function validateCompletionTimes(
  mission: { startAt: Date },
  input: { actualArrivalAt: Date; actualDepartureAt?: Date | null },
  now: Date,
): void {
  if (input.actualArrivalAt.getTime() > now.getTime()) {
    throw new DomainError("MISSION_ARRIVAL_IN_FUTURE", "زمان رسیدن واقعی نمی‌تواند در آینده باشد.",
      { actualArrivalAt: "زمان رسیدن واقعی نمی‌تواند در آینده باشد." });
  }
  if (input.actualArrivalAt.getTime() < mission.startAt.getTime()) {
    throw new DomainError("MISSION_ARRIVAL_BEFORE_START", "زمان رسیدن واقعی نمی‌تواند پیش از زمان شروع باشد.",
      { actualArrivalAt: "زمان رسیدن واقعی نمی‌تواند پیش از زمان شروع باشد." });
  }
  if (input.actualDepartureAt) {
    const d = input.actualDepartureAt.getTime();
    if (d < mission.startAt.getTime() || d > input.actualArrivalAt.getTime()) {
      throw new DomainError("MISSION_DEPARTURE_WINDOW_INVALID",
        "زمان حرکت واقعی باید بین زمان شروع و زمان رسیدن باشد.",
        { actualDepartureAt: "زمان حرکت واقعی باید بین زمان شروع و زمان رسیدن باشد." });
    }
  }
  // عمداً هیچ مقایسه‌ای با estimatedArrivalAt انجام نمی‌شود:
  // دیر یا زود رسیدن «داده» است نه «خطا» (LR-03).
}
```

## 3. Extending `deriveMissionDisplayStatus`

**The single highest-risk edit in the phase.** Two lines inserted at the correct position; the surrounding logic is untouched.

```ts
export function deriveMissionDisplayStatus(mission: MissionStatusInput, now: Date): MissionDisplayStatus {
  if (mission.persistedStatus === "DRAFT") return "DRAFT";
  if (mission.persistedStatus === "CANCELLED") return "CANCELLED";
  if (mission.persistedStatus === "ARCHIVED") return "ARCHIVED";
  if (mission.persistedStatus === "COMPLETED") return "COMPLETED";  // ← new
  if (mission.persistedStatus === "FAILED") return "FAILED";        // ← new
  if (now.getTime() < mission.startAt.getTime()) return "WAITING";
  if (now.getTime() >= mission.estimatedArrivalAt.getTime()) return "ARRIVED";
  return "IN_PROGRESS";
}
```

`MissionStatusInput.persistedStatus` widens to the six-value union. Because the two new branches sit **before** every clock comparison, a completed mission reports `COMPLETED` at any `viewTime` — including a timeline scrub into the past (edge case E12).

## 4. Simulation freeze

Generalise the existing cancelled-freeze rather than adding a parallel branch:

```ts
// در mission-simulation.ts، جایی که امروز فقط CANCELLED بررسی می‌شود:
const freezeAt =
  status === "CANCELLED" ? mission.cancelledAt :
  status === "COMPLETED" ? mission.actualArrivalAt :   // ← new
  status === "FAILED"    ? mission.failedAt :          // ← new
  null;

const effectiveTime = freezeAt && freezeAt < viewTime ? freezeAt : viewTime;
```

No geometry, distance, bearing or ETA maths changes (S13).

## 5. Optimistic concurrency

```ts
async function updateMissionGuarded<T>(
  tx: Prisma.TransactionClient,
  id: string,
  expectedVersion: number,
  data: Prisma.MissionUpdateInput,
): Promise<Mission> {
  const result = await tx.mission.updateMany({
    where: { id, version: expectedVersion, deletedAt: null },
    data: { ...data, version: { increment: 1 } },
  });
  if (result.count === 0) {
    throw new DomainError(
      "MISSION_VERSION_CONFLICT",
      "این مأموریت توسط کاربر دیگری تغییر کرده است. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.",
    );
  }
  return tx.mission.findFirstOrThrow({ where: { id }, include: MISSION_INCLUDE });
}
```

`updateMany` is required — Prisma's `update` targets a unique field and cannot express the compound `id + version` predicate. `count === 0` is the conflict signal; it fires whether the row changed or vanished, and both are conflicts from the caller's perspective.

## 6. Transition implementations

### 6.1 `completeMission`

```ts
export async function completeMission(
  id: string,
  input: { version: number; actualArrivalAt: Date; actualDepartureAt?: Date | null },
  actor: ActorContext,
): Promise<MissionDTO> {
  const existing = await prisma.mission.findFirst({
    where: { id, deletedAt: null },
    include: { shipments: true },
  });
  if (!existing) throw new DomainError("MISSION_NOT_FOUND", "مأموریت یافت نشد.");

  assertTransitionAllowed(existing.persistedStatus, "complete");
  validateCompletionTimes(existing, input, new Date());

  const updated = await prisma.$transaction(async (tx) => {
    const activeIds = existing.shipments.filter((s) => s.isActiveAssignment).map((s) => s.shipmentId);

    const mission = await updateMissionGuarded(tx, id, input.version, {
      persistedStatus: "COMPLETED",
      actualArrivalAt: input.actualArrivalAt,
      actualDepartureAt: input.actualDepartureAt ?? null,
      updatedById: actor.userId,
    });

    // LR-05 — مجموعه‌ای، نه حلقه‌ای (P-02)
    await tx.missionShipment.updateMany({
      where: { missionId: id, isActiveAssignment: true },
      data: { isActiveAssignment: false },
    });
    if (activeIds.length > 0) {
      await tx.shipment.updateMany({ where: { id: { in: activeIds } }, data: { status: "DELIVERED" } });
    }
    return mission;
  });

  const dto = toDTO(updated);
  await logAudit({
    actorUserId: actor.userId,
    action: "mission.completed",
    entityType: "Mission",
    entityId: id,
    afterJson: dto as unknown as Prisma.InputJsonValue,
  });
  return dto;
}
```

### 6.2 `failMission`

Identical shape. Differences: target `FAILED`; writes `failedAt`, `failureReason`, `failureClassification`; shipments return to `WAITING_FOR_DISPATCH` (LR-08) rather than `DELIVERED`; audit action `mission.failed`.

### 6.3 `archiveMission` / `unarchiveMission`

```ts
// archive — وضعیت پایانی فعلی را برای بازگشت ذخیره می‌کند (LR-09)
await updateMissionGuarded(tx, id, input.version, {
  persistedStatus: "ARCHIVED",
  archivedAt: new Date(),
  statusBeforeArchive: existing.persistedStatus,
  updatedById: actor.userId,
});

// unarchive — دقیقاً همان وضعیت را برمی‌گرداند (LR-10)
const target = resolveTargetStatus("unarchive", existing);
await updateMissionGuarded(tx, id, input.version, {
  persistedStatus: target,
  archivedAt: null,
  statusBeforeArchive: null,
  updatedById: actor.userId,
});
```

Neither touches shipments — archiving is a filing action, not an operational one.

### 6.4 `reopenMission` — the most delicate

Reopen must **re-acquire** shipments, and that can legitimately fail if another mission took one meanwhile (LR-13).

```ts
const updated = await prisma.$transaction(async (tx) => {
  const shipmentIds = existing.shipments.map((s) => s.shipmentId);

  // ADR-019: قفل بدبینانه پیش از تلاش برای تخصیص مجدد
  for (const sid of shipmentIds) {
    await tx.$queryRaw`SELECT id FROM "Shipment" WHERE id = ${sid} FOR UPDATE`;
  }

  const mission = await updateMissionGuarded(tx, id, input.version, {
    persistedStatus: "SCHEDULED",
    actualArrivalAt: null,
    actualDepartureAt: null,
    failedAt: null,
    failureReason: null,
    failureClassification: null,
    reopenCount: { increment: 1 },
    lastReopenedAt: new Date(),
    updatedById: actor.userId,
  });

  // ایندکس یکتای جزئی ADR-019 اینجا ممکن است خطا بدهد — همان‌جا به خطای دامنه نگاشت می‌شود.
  try {
    await tx.missionShipment.updateMany({
      where: { missionId: id },
      data: { isActiveAssignment: true },
    });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      throw new DomainError(
        "SHIPMENT_ALREADY_ASSIGNED",
        "یکی از مرسوله‌های این مأموریت هم‌اکنون به مأموریت دیگری تخصیص یافته است.",
      );
    }
    throw error;
  }
  if (shipmentIds.length > 0) {
    await tx.shipment.updateMany({ where: { id: { in: shipmentIds } }, data: { status: "IN_TRANSIT" } });
  }
  return mission;
});
```

**I-12 depends on the null-clearing above.** Omitting it leaves a `SCHEDULED` mission carrying a stale `actualArrivalAt`, which breaks the invariant and would make the mission look completed to any future code reading actuals directly.

## 7. Notes service

Append-only, no version check (CC-04):

```ts
export async function addMissionNote(missionId: string, body: string, actor: ActorContext) {
  const mission = await prisma.mission.findFirst({ where: { id: missionId, deletedAt: null } });
  if (!mission) throw new DomainError("MISSION_NOT_FOUND", "مأموریت یافت نشد.");
  const note = await prisma.missionNote.create({
    data: { missionId, body: body.trim(), createdById: actor.userId },
  });
  await logAudit({ actorUserId: actor.userId, action: "mission.note.added",
                   entityType: "Mission", entityId: missionId });
  return note;
}
```

Deletion is soft and permitted to the author or an Admin only — enforced in the service, not the UI.

## 8. Complexity

| Operation | Queries | Complexity | Notes |
|---|---|---|---|
| `canTransition` | 0 | O(8) ≈ O(1) | linear scan of a fixed 8-row table |
| `deriveMissionDisplayStatus` | 0 | O(1) | no allocation; hot path |
| `completeMission` / `failMission` | 1 read + 3 writes | O(1) queries, O(n) rows for n shipments | set-based, never per-row |
| `archiveMission` / `unarchiveMission` | 1 read + 1 write | O(1) | |
| `reopenMission` | 1 read + n locks + 3 writes | O(n) locks | n = shipments per mission, in practice 1–5 |
| `addMissionNote` | 1 read + 1 write | O(1) | |
| Notes list | 1 | O(k) | indexed on `missionId`, ordered by `createdAt` |

`reopenMission`'s per-shipment `FOR UPDATE` loop is the only O(n) query pattern. It mirrors the shipped `publishMission` exactly and is bounded by missions-per-shipment cardinality (typically ≤ 5), so it is acceptable; batching it would change ADR-019's locking semantics and is explicitly not done.

## 9. Performance notes

- **Set-based side effects.** `updateMany` for shipments, never a loop of `update` (P-02).
- **Narrow reads.** Transitions read the mission plus its `shipments` relation only — never routes or points.
- **No new hot-path cost.** The two added branches in `deriveMissionDisplayStatus` execute before the existing clock comparisons, so the common path gets *marginally* cheaper for terminal missions and is unchanged otherwise.
- **Indexes.** `07-DATABASE.md` §4 specifies indexes for the new filterable columns. Given the shared dev DB already holds ~1,000 missions and ~6,400 org units, unindexed filters would regress immediately.

## 10. Error handling

| Layer | Responsibility |
|---|---|
| Route | Zod → 422. `requireActor` → 401/403. Map `DomainError.code` to HTTP per `04-ARCHITECTURE.md` §6. |
| Service | Throw `DomainError` only. Never leak Prisma errors; translate unique-constraint violations to domain codes. |
| Domain | Throw `DomainError`; never touch I/O. |
| Client | Render `message` and `fieldErrors`. `MISSION_VERSION_CONFLICT` gets a dedicated recoverable state with a reload action (CC-06). |

## 11. Recovery

| Failure | Recovery |
|---|---|
| Transaction aborts | Nothing persisted; mission unchanged; client retries. |
| Post-commit audit failure | Business fact stands; error logged; not surfaced as failure (TX-03). |
| Partial migration | Migration is a single additive transaction; re-runnable. |
| Corrupt `statusBeforeArchive` | `resolveTargetStatus` throws `MISSION_INVALID_TRANSITION` rather than guessing. |
| Stale client version | 409 with reload affordance; no data loss because nothing was written. |
