# 06 — API Specification

## 1. Internal (In-Process) APIs

### 1.1 Pure engine — `src/lib/domain/mission-simulation.ts`

```ts
function calculateMissionGeometry(input: MissionGeometryInput): MissionGeometryResult;
function simulateMissionPosition(mission: MissionSnapshot, viewTime: Date): MissionSimulationResult;
```

Consumers: any server-side TypeScript code in this repository (Phase 10's server components, future batch jobs, tests). **Never call from client components** — this is a Node-side-only module in practice (no `"use client"` directive, no client bundling reason to import it, though nothing technically prevents it since it has zero DOM/browser API dependency — the restriction is architectural, not enforced by a bundler flag).

### 1.2 Service — `src/server/services/simulation-service.ts`

```ts
async function getMissionSimulation(missionId: string, viewTime: Date): Promise<MissionSimulationResult>;
```

Consumers: `src/app/api/v1/missions/[id]/simulate/route.ts` (this phase); any future server component or server action in Phase 10+.

Throws: `DomainError("MISSION_NOT_FOUND", "مأموریت یافت نشد.")` — reuses the exact error code already thrown by `getMissionById()` in `mission-service.ts`, and `DomainError("SIMULATION_ROUTE_SNAPSHOT_MISSING", ...)` per [02-REQUIREMENTS.md](./02-REQUIREMENTS.md) VR-3.

## 2. Public HTTP Service Interface

### `GET /api/v1/missions/:id/simulate`

| | |
|---|---|
| **Roles allowed** | `ADMIN`, `MISSION_PLANNER`, `STATUS_VIEWER` (all three — matches `/map`'s existing read access, since this endpoint's output is what Phase 10's map will eventually render; see `docs/PROJECT_SPEC.md` §4 permission matrix, "مشاهده داشبورد و نقشه" row) |
| **Auth pattern** | `requireActor([RoleCode.ADMIN, RoleCode.MISSION_PLANNER, RoleCode.STATUS_VIEWER])` — identical call shape to every other route handler in `src/app/api/v1/**` |
| **Path param** | `id` — Mission UUID |
| **Query param** | `viewTime` — optional, ISO-8601 datetime string |
| **Body** | none (GET) |
| **Idempotent** | Yes — pure read, safe to retry, safe to cache at any layer above this endpoint (though this phase adds none — see [04-ARCHITECTURE.md](./04-ARCHITECTURE.md) §10) |

### 2.1 Request

```http
GET /api/v1/missions/8b6e3b6b-1f2a-4b39-9c2e-2a5b6c7d8e9f/simulate?viewTime=2026-08-10T09:15:00.000Z HTTP/1.1
Cookie: <session cookie>
```

`viewTime` omitted:

```http
GET /api/v1/missions/8b6e3b6b-1f2a-4b39-9c2e-2a5b6c7d8e9f/simulate HTTP/1.1
```

→ server defaults `viewTime` to `new Date()` **at the route-handler boundary**, not inside the pure engine (this preserves the engine's purity — the one and only impure `new Date()` call in the whole feature lives in the route handler, exactly where impurity is expected and acceptable per this project's established convention, e.g. `assertValidStartAt()` in `mission-service.ts` already does the same thing).

### 2.2 Request Validation (Zod)

```ts
const simulateQuerySchema = z.object({
  viewTime: z.string().datetime({ offset: true }).optional(),
});
```

Placed in `src/lib/validation/simulation.ts` (new file, following the exact convention of `src/lib/validation/mission.ts`, `src/lib/validation/route.ts`, etc. — one validation file per feature area).

### 2.3 Response — 200 OK

```ts
export interface MissionSimulationResultDTO {
  status: "DRAFT" | "WAITING" | "IN_PROGRESS" | "ARRIVED" | "CANCELLED" | "ARCHIVED";
  position: { latitude: number; longitude: number };
  progressRatio: number;
  traveledMeters: number;
  remainingMeters: number;
  totalDistanceMeters: number;
  estimatedArrivalAt: string;   // ISO-8601
  remainingSeconds: number;
  bearingDegrees: number | null;
  isFallbackDirect: boolean;
  isEstimated: true;
  viewTime: string;             // ISO-8601 — the (possibly-defaulted) viewTime this result was computed for, echoed back for caller convenience
}
```

Example body:

```json
{
  "status": "IN_PROGRESS",
  "position": { "latitude": 35.1234, "longitude": 52.9876 },
  "progressRatio": 0.42,
  "traveledMeters": 189000,
  "remainingMeters": 261000,
  "totalDistanceMeters": 450000,
  "estimatedArrivalAt": "2026-08-10T14:30:00.000Z",
  "remainingSeconds": 19800,
  "bearingDegrees": 134.7,
  "isFallbackDirect": false,
  "isEstimated": true,
  "viewTime": "2026-08-10T09:15:00.000Z"
}
```

### 2.4 Errors

| Status | Code | When | Body |
|---|---|---|---|
| `401` | (none, standard auth rejection) | No valid session | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` — existing pattern from `requireActor` |
| `403` | (none, standard auth rejection) | Session valid, role not allowed (only possible if a 4th role is added in a future phase — currently all 3 existing roles are allowed) | Existing `requireActor` pattern |
| `404` | `MISSION_NOT_FOUND` | Mission does not exist or is soft-deleted | `{ "error": { "code": "MISSION_NOT_FOUND", "message": "مأموریت یافت نشد." } }` |
| `422` | `SIMULATION_INVALID_VIEW_TIME` | `viewTime` present but not a valid ISO-8601 datetime | `{ "error": { "code": "SIMULATION_INVALID_VIEW_TIME", "message": "زمان مشاهده نامعتبر است.", "fieldErrors": { "viewTime": "زمان مشاهده نامعتبر است." } } }` |
| `500` | `SIMULATION_ROUTE_SNAPSHOT_MISSING` | Mission has `routeId` set but the pinned `(routeId, routeVersion)` row cannot be found (data-integrity fault, not user error — hence 500, not 422) | `{ "error": { "code": "SIMULATION_ROUTE_SNAPSHOT_MISSING", "message": "نسخه مسیر ثبت‌شده روی مأموریت یافت نشد." } }` |

Error response envelope matches the exact shape already used by every other endpoint in this codebase (`domainErrorResponse()` helper, established in Phase 2 and reused through Phase 8).

## 3. Route Handler Implementation Contract

`src/app/api/v1/missions/[id]/simulate/route.ts` MUST:

1. Call `requireActor([RoleCode.ADMIN, RoleCode.MISSION_PLANNER, RoleCode.STATUS_VIEWER])`; return its `response` early if present (existing pattern, see any existing `route.ts` under `src/app/api/v1/missions/`).
2. Parse `request.nextUrl.searchParams.get("viewTime")` through `simulateQuerySchema.safeParse(...)`.
3. Compute `const viewTime = parsed.viewTime ? new Date(parsed.viewTime) : new Date();` — this is the single permitted `new Date()` call in the whole feature (§2.1).
4. Call `getMissionSimulation(params.id, viewTime)` inside a try/catch that maps `DomainError` to the status codes in §2.4, matching the existing `domainErrorResponse()` pattern used by every other route in this codebase.
5. Serialize the result: spread `MissionSimulationResult`, convert `estimatedArrivalAt: Date` → `.toISOString()`, add `viewTime: viewTime.toISOString()`.
6. MUST NOT contain any calculation logic — if you find yourself writing an `if` statement that isn't about HTTP status mapping or query parsing, that logic belongs in `simulation-service.ts` or `mission-simulation.ts`, not here.

This route handler is the **one and only** file in Phase 9 permitted to import from `next/server`.

## 4. No Write Endpoints

Phase 9 introduces **zero** `POST`/`PATCH`/`PUT`/`DELETE` endpoints. The simulation engine is entirely read-only, end to end — see [02-REQUIREMENTS.md](./02-REQUIREMENTS.md) BR-5.

## 5. Audit Logging

**Not required.** This endpoint is a pure read with no side effect; it does not appear in the "Actionهای audit اجباری" list in `docs/API_SECURITY_OFFLINE_OPERATIONS.md` §5, and read-only `GET` endpoints elsewhere in this codebase (`GET /missions`, `GET /routes`, `GET /map/organization-units`) are likewise not audited. Do not add an audit-log call to this endpoint.
