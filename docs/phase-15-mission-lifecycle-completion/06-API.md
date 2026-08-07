# Phase 15 — 06 — API Contract

Every endpoint, DTO, command, error and example. Conventions follow the shipped `/api/v1` surface exactly.

---

## 1. Conventions

- Base path `/api/v1`. All routes require a session; `requireActor(...)` gates roles server-side.
- **All lifecycle endpoints: `ADMIN` + `MISSION_PLANNER` only.** `STATUS_VIEWER` receives 403 — matching the shipped rule that Status Viewer is entirely excluded from missions.
- Request/response bodies are JSON. Timestamps are ISO-8601 with offset (ADR-008); conversion to Jalali happens only at the UI boundary.
- Errors use the shipped envelope:

```json
{ "error": { "code": "MISSION_VERSION_CONFLICT", "message": "…", "fieldErrors": {} } }
```

- **Every mutating mission endpoint requires `version`.** Omitting it is 422, never a silent success.

## 2. DTOs

### 2.1 `MissionDTO` (extended)

Existing fields unchanged; new fields appended. Consumers that ignore unknown fields keep working.

```ts
export interface MissionDTO {
  // — existing —
  id: string;
  code: string;                       // "MS-" + 8 hex
  vehicleId: string;
  originTitle: string;
  destinationTitle: string;
  startAt: string;                    // planned departure
  estimatedArrivalAt: string;         // planned arrival
  persistedStatus: MissionPersistedStatusValue;
  displayStatus: MissionDisplayStatusValue;
  routeId: string | null;
  routeVersion: number | null;        // ⚠ route snapshot — NOT the concurrency token
  cancelledAt: string | null;
  cancellationReason: string | null;
  notes: string | null;               // legacy scalar; see noteCount
  // — new in Phase 15 —
  version: number;                    // ⚠ optimistic-concurrency token
  actualDepartureAt: string | null;
  actualArrivalAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  failureClassification: MissionFailureClassificationValue | null;
  archivedAt: string | null;
  statusBeforeArchive: MissionPersistedStatusValue | null;
  reopenCount: number;
  lastReopenedAt: string | null;
  missionType: { id: string; name: string } | null;
  noteCount: number;
  /** دقیقه اختلاف رسیدن واقعی از تخمین؛ مثبت = دیرکرد. فقط وقتی actualArrivalAt موجود باشد. */
  arrivalVarianceMinutes: number | null;
}
```

> `arrivalVarianceMinutes` is **derived on read**, never stored — storing it would create a second source of truth that could drift from its two inputs.

### 2.2 Commands

```ts
export interface CompleteMissionCommand {
  version: number;
  actualArrivalAt: string;            // ISO-8601 + offset
  actualDepartureAt?: string | null;
}

export interface FailMissionCommand {
  version: number;
  failedAt: string;
  failureReason: string;              // 3–500 chars, trimmed
  failureClassification: MissionFailureClassificationValue;
}

export interface ArchiveMissionCommand   { version: number }
export interface UnarchiveMissionCommand { version: number }

export interface ReopenMissionCommand {
  version: number;
  reopenReason: string;               // 3–500 chars, trimmed
}

export interface AddMissionNoteCommand { body: string }   // 1–2000, no version (CC-04)
```

### 2.3 `MissionNoteDTO`

```ts
export interface MissionNoteDTO {
  id: string;
  missionId: string;
  body: string;
  createdById: string;
  createdByUsername: string;
  createdAt: string;
  canDelete: boolean;      // author or admin — computed per requester
}
```

### 2.4 `MissionTypeDTO`

```ts
export interface MissionTypeDTO {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  missionCount: number;    // blocks deletion when > 0
}
```

## 3. Zod schemas

`src/lib/validation/mission-lifecycle.ts`

```ts
const versionField = z.number().int().nonnegative();
const reasonField  = z.string().trim().min(3).max(500);

export const completeMissionSchema = z.object({
  version: versionField,
  actualArrivalAt: z.string().datetime({ offset: true }),
  actualDepartureAt: z.string().datetime({ offset: true }).nullish(),
});

export const failMissionSchema = z.object({
  version: versionField,
  failedAt: z.string().datetime({ offset: true }),
  failureReason: reasonField,
  failureClassification: z.enum([
    "VEHICLE_BREAKDOWN", "ACCIDENT", "CARGO_ISSUE",
    "ROUTE_BLOCKED", "WEATHER", "DRIVER_UNAVAILABLE", "OTHER",
  ]),
});

export const archiveMissionSchema = z.object({ version: versionField });
export const reopenMissionSchema  = z.object({ version: versionField, reopenReason: reasonField });
export const addMissionNoteSchema = z.object({ body: z.string().trim().min(1).max(2000) });
```

> Zod enforces *shape*; the domain guards enforce *meaning*. "Is this a valid ISO timestamp" is Zod's job; "is this arrival before the planned start" is the domain's (LR-02). Never move a business rule into a schema.

## 4. Endpoints

### 4.1 `POST /api/v1/missions/[id]/complete`

Roles: `ADMIN`, `MISSION_PLANNER`

```http
POST /api/v1/missions/9f2c.../complete
Content-Type: application/json

{ "version": 3, "actualArrivalAt": "2026-08-07T14:32:00+03:30" }
```

**200** → full `MissionDTO` with `persistedStatus: "COMPLETED"`, `displayStatus: "COMPLETED"`, `version: 4`.

| Status | Code | Cause |
|---|---|---|
| 401 | `UNAUTHENTICATED` | no session |
| 403 | `FORBIDDEN` | Status Viewer |
| 404 | `MISSION_NOT_FOUND` | absent/soft-deleted |
| 409 | `MISSION_INVALID_TRANSITION` | not `SCHEDULED` |
| 409 | `MISSION_VERSION_CONFLICT` | stale `version` |
| 422 | `MISSION_ARRIVAL_IN_FUTURE` | LR-01 |
| 422 | `MISSION_ARRIVAL_BEFORE_START` | LR-02 |
| 422 | `MISSION_DEPARTURE_WINDOW_INVALID` | LR-04 |

Side effects: active shipments → `DELIVERED`, `isActiveAssignment = false`; audit `mission.completed`.

### 4.2 `POST /api/v1/missions/[id]/fail`

```json
{
  "version": 3,
  "failedAt": "2026-08-07T11:05:00+03:30",
  "failureReason": "خرابی گیربکس در کیلومتر ۸۰ و عدم امکان ادامه مسیر",
  "failureClassification": "VEHICLE_BREAKDOWN"
}
```

**200** → `persistedStatus: "FAILED"`. Errors as above plus `MISSION_FAILURE_REASON_REQUIRED` (422).
Side effects: shipments → `WAITING_FOR_DISPATCH`, released; audit `mission.failed`.

### 4.3 `POST /api/v1/missions/[id]/archive` · `.../unarchive`

Body `{ "version": n }`. Archive requires a terminal state; unarchive requires `ARCHIVED` and restores `statusBeforeArchive`. No shipment side effects. Audit `mission.archived` / `mission.unarchived`.

### 4.4 `POST /api/v1/missions/[id]/reopen`

```json
{ "version": 5, "reopenReason": "تکمیل اشتباه ثبت شده بود؛ بار تحویل نشده است." }
```

**200** → `persistedStatus: "SCHEDULED"`, terminal facts cleared, `reopenCount` incremented.
Additional error: **409 `SHIPMENT_ALREADY_ASSIGNED`** — a shipment was re-assigned elsewhere while this mission sat terminal (LR-13). This is expected, not exceptional; the UI must explain it in plain Persian.
Audit `mission.reopened`.

### 4.5 Notes

| Method | Path | Roles | Notes |
|---|---|---|---|
| `GET` | `/missions/[id]/notes` | Admin, Planner | newest first |
| `POST` | `/missions/[id]/notes` | Admin, Planner | no `version` (CC-04) |
| `DELETE` | `/missions/[id]/notes/[noteId]` | author or Admin | soft delete |

### 4.6 Mission types

| Method | Path | Roles |
|---|---|---|
| `GET` | `/mission-types` | Admin, Planner (needed by the wizard) |
| `POST` / `PATCH` / `DELETE` | `/mission-types[/id]` | **Admin only** |

`DELETE` refuses when `missionCount > 0`, returning `MISSION_TYPE_IN_USE` (409) — same rule as vehicle/cargo types.

### 4.7 Extended existing endpoints

| Endpoint | Change |
|---|---|
| `GET /missions/[id]` | Response gains the new DTO fields. |
| `GET /missions` | Gains optional `persistedStatus=COMPLETED\|FAILED` filter values. Existing values unchanged. |
| `PATCH /missions/[id]` | **Now requires `version`.** Breaking for any client that omits it — the mission UI is the only client and is updated in the same phase. |
| `POST /missions/[id]/cancel` | **Now requires `version`.** |
| `GET /missions/summary` | Gains `completed` and `failed` counters. |
| `GET /missions/[id]/history` | Surfaces the new audit actions; no shape change. |

## 5. Events (audit stream)

No message bus exists (ADR-017). "Events" are `AuditLog` rows — the integration seam for any future outbox consumer.

| Action | Written by | Payload |
|---|---|---|
| `mission.completed` | `completeMission` | `afterJson` = full DTO |
| `mission.failed` | `failMission` | `afterJson` = full DTO |
| `mission.archived` / `mission.unarchived` | archive services | `afterJson` = full DTO |
| `mission.reopened` | `reopenMission` | `afterJson` = full DTO + reason |
| `mission.note.added` / `mission.note.deleted` | note service | note id |

## 6. Worked example — the phase's reason for existing

A mission planned to arrive at 12:00 actually arrives at 14:32.

```
1. GET /missions/{id}
   → displayStatus "ARRIVED"  (clock passed ETA — belief, not fact)
     version 3, actualArrivalAt null

2. POST /missions/{id}/complete { version: 3, actualArrivalAt: "…T14:32:00+03:30" }
   → 200 · persistedStatus "COMPLETED" · displayStatus "COMPLETED"
     version 4 · arrivalVarianceMinutes 152

3. Immediately and consistently:
   • operational map    → marker frozen at actualArrivalAt
   • mission table      → «تکمیل‌شده», not «رسیده (تخمینی)»
   • timeline scrub     → still COMPLETED at any viewTime (E12)
   • dashboard          → moves from the ARRIVED counter to the COMPLETED counter

4. A second operator holding version 3 tries to fail it
   → 409 MISSION_VERSION_CONFLICT, nothing overwritten
```

Step 3 is the architectural payoff: **nothing in Phases 10–13 was edited to make it happen.** All four consumers read `deriveMissionDisplayStatus`, so extending that one function propagates everywhere by construction.
