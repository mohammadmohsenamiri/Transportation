# Phase 14 — 06 — API Contract

Follows the shipped `/api/v1` conventions exactly. No new API style is introduced.

---

## 1. Conventions

- Base path `/api/v1`. Every route calls `requireActor(...)` **before** reading the body.
- **All routes require `ADMIN`** except `GET /icons/[id]/content` (any authenticated role — the map renders icons for everyone).
- Errors use the shipped envelope: `{ "error": { "code", "message", "fieldErrors" } }`, message in Persian.
- Timestamps are ISO-8601 UTC with offset (ADR-008); Jalali conversion happens at the UI boundary only.
- Mutating requests on `User`, `IconAsset` and `SystemSetting` require `version`; omitting it is 422, never a silent success.
- List endpoints are paginated: `?page` (1-based, default 1), `?pageSize` (default 25, max 100). Responses carry `{ items, total, page, pageSize }`.
- **No endpoint ever returns `passwordHash`.**

## 2. DTOs

```ts
export type UserStatusValue = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";

export interface UserDTO {
  id: string;
  username: string;              // LTR in UI
  displayName: string | null;
  status: UserStatusValue;       // derived, never stored
  isActive: boolean;
  suspendedAt: string | null;
  suspensionReason: string | null;
  deletedAt: string | null;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  roles: RoleCodeValue[];
  createdAt: string;
  updatedAt: string;
  version: number;               // concurrency token
  // passwordHash is NEVER present
}

export interface IconAssetDTO {
  id: string;
  name: string;
  category: IconCategoryValue;
  mimeType: "image/png" | "image/svg+xml";
  sha256: string;                // cache key
  width: number | null;
  height: number | null;
  fileSize: number;
  originalFilename: string | null;
  isActive: boolean;
  deletedAt: string | null;
  contentUrl: string;            // `/api/v1/icons/{id}/content`
  usageCount: number;            // entities referencing it — blocks nothing, informs the admin
  uploadedById: string | null;
  createdAt: string;
  version: number;
}

export interface SettingDTO {
  key: string;
  group: SettingGroup;
  type: "string" | "number" | "boolean" | "enum" | "json";
  value: unknown;                // effective value
  defaultValue: unknown;
  isDefault: boolean;            // no DB row / equals default
  isEnvLocked: boolean;          // env var wins → UI renders read-only
  envVar: string | null;
  allowedValues: unknown[] | null;   // enum only
  min: number | null;            // number only
  max: number | null;
  labelFa: string;
  descriptionFa: string;
  runtimeEffect: "IMMEDIATE" | "NEXT_REQUEST" | "NEXT_PAGE_LOAD";
  version: number;
}

export interface AuditEntryDTO {
  id: string;
  actorUserId: string | null;
  actorUsername: string | null;  // resolved for display
  action: string;
  entityType: string;
  entityId: string | null;
  beforeJson: unknown | null;
  afterJson: unknown | null;
  ipAddress: string | null;      // LTR in UI
  occurredAt: string;
}
```

## 3. User endpoints

### 3.1 `GET /api/v1/users`

Query: `q`, `role`, `status`, `includeDeleted` (default `false`), `page`, `pageSize`, `sort` (`username|createdAt|lastLoginAt`), `order`.

`200` → `{ items: UserDTO[], total, page, pageSize }`. Soft-deleted users are excluded unless `includeDeleted=true`.

### 3.2 `POST /api/v1/users`

```json
{ "username": "planner_01", "displayName": "زهرا محمدی",
  "password": "Temp1234", "roles": ["MISSION_PLANNER"] }
```

`201` → `UserDTO`. Side effects: `mustChangePassword=true`; audit `user.created`.

| Error | Status |
|---|---|
| `USER_USERNAME_INVALID` / `USER_PASSWORD_WEAK` / `USER_ROLES_REQUIRED` / `USER_DISPLAY_NAME_INVALID` | 422 |
| `USER_USERNAME_TAKEN` | 409 |
| `FORBIDDEN` / `UNAUTHENTICATED` | 403 / 401 |

### 3.3 `GET /api/v1/users/[id]` → `UserDTO` · 404 `USER_NOT_FOUND`

### 3.4 `PATCH /api/v1/users/[id]`

```json
{ "version": 3, "displayName": "زهرا محمدی‌فر" }
```

Only `displayName` is editable. **`username` is immutable** (BR-U03) and is rejected if present.

| Error | Status |
|---|---|
| `USER_VERSION_REQUIRED` | 422 |
| `USER_VERSION_CONFLICT` | 409 |
| `USER_NOT_FOUND` | 404 |

### 3.5 Lifecycle actions

All take `{ "version": n }`; suspend also takes `reason`. All return the updated `UserDTO`.

| Endpoint | From → To | Extra input | Side effects | Audit |
|---|---|---|---|---|
| `POST .../activate` | INACTIVE → ACTIVE | — | — | `user.activated` |
| `POST .../deactivate` | ACTIVE/SUSPENDED → INACTIVE | — | revoke sessions; last-admin guard | `user.deactivated` |
| `POST .../suspend` | any live → SUSPENDED | `reason` 3–500 | revoke sessions; last-admin guard | `user.suspended` |
| `POST .../unsuspend` | SUSPENDED → previous | — | — | `user.unsuspended` |
| `DELETE .../[id]` | any live → DELETED | `version` in body | revoke sessions; last-admin guard | `user.deleted` |
| `POST .../restore` | DELETED → **INACTIVE** | — | — | `user.restored` |

Restore returns to `INACTIVE`, never `ACTIVE` (`03-DOMAIN.md` §2.2) — re-enabling login must be a deliberate second act.

Additional error on the guarded four: **409 `LAST_ADMIN_PROTECTED`**.

### 3.6 `PUT /api/v1/users/[id]/roles`

```json
{ "version": 5, "roles": ["MISSION_PLANNER", "STATUS_VIEWER"] }
```

Replaces the whole set atomically (CC-05). Errors add `USER_ROLES_REQUIRED` (422) and `LAST_ADMIN_PROTECTED` (409). Audit `user.roles_changed` with before/after role arrays.

### 3.7 `POST /api/v1/users/[id]/reset-password`

```json
{ "version": 5, "newPassword": "Temp9876" }
```

`200` → `{ user: UserDTO, mustChangePassword: true }`.

Side effects: hash replaced, `mustChangePassword=true`, **all sessions revoked**, audit `user.password_reset` **with no password material in any field**.

> The password is transmitted in the request and displayed once by the UI. It is never returned in the response, never stored in plain text, never audited (SEC-15, BR-P06/P07).

## 4. Icon endpoints

### 4.1 `GET /api/v1/icons`
Query: `category`, `q`, `includeDeleted`, `page`, `pageSize` → `{ items: IconAssetDTO[], … }`.

### 4.2 `POST /api/v1/icons` — multipart

Fields: `file` (File), `name` (string), `category` (IconCategory).

`201` → `IconAssetDTO`. Validation runs in the exact order of `02-REQUIREMENTS.md` §4.2; **the first failure short-circuits and no byte is written**.

| Error | Status | Trigger |
|---|---|---|
| `ICON_FILE_REQUIRED` | 422 | missing/not a File |
| `ICON_INVALID_EXTENSION` | 422 | not `.png`/`.svg` |
| `ICON_INVALID_MIME` | 422 | MIME not allowed |
| `ICON_TYPE_MISMATCH` | 422 | extension ≠ MIME |
| `ICON_TOO_LARGE` | 422 | > 2 MB |
| `ICON_EMPTY` | 422 | 0 bytes |
| `ICON_CONTENT_MISMATCH` | 422 | magic bytes / XML root disagree |
| `ICON_DIMENSIONS_INVALID` | 422 | PNG outside 16–512 px |
| `ICON_SVG_UNSAFE` | 422 | allowlist finding; **message names the construct** |
| `ICON_NAME_TAKEN` | 409 | duplicate name |

Audit `icon.uploaded` with `{ id, name, category, mimeType, sha256, fileSize }` — metadata only, never bytes.

### 4.3 `POST /api/v1/icons/[id]/replace` — multipart

Same validation. Keeps `id`, `name`, `category` and **all assignments**; changes `storagePath`, `sha256`, dimensions, `fileSize`; increments `version`. Audit `icon.replaced` with both hashes. Cache busts naturally because the hash changed.

### 4.4 `DELETE /api/v1/icons/[id]` · `POST /api/v1/icons/[id]/restore`

Soft delete / restore. Deleting does **not** clear assignments — they are retained so restore reinstates them, and resolution falls through meanwhile (BR-I02, E7). Audit `icon.deleted` / `icon.restored`.

### 4.5 `GET /api/v1/icons/[id]/content` — the only non-Admin route

Roles: `ADMIN`, `MISSION_PLANNER`, `STATUS_VIEWER`.

Response headers, all mandatory:

```
Content-Type: image/png | image/svg+xml
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox
Content-Disposition: inline
Cache-Control: private, max-age=31536000, immutable
ETag: "<sha256>"
```

`404` if absent, soft-deleted, or the file is missing on disk. `401` if unauthenticated — the browser sends session cookies with `<img>` requests on same-origin, so this works transparently.

### 4.6 `PUT /api/v1/icons/assignments`

```json
{ "targetType": "VEHICLE_TYPE", "targetId": "…", "iconAssetId": "…", "version": 2 }
```

`targetType` ∈ `ORGANIZATION_UNIT` | `VEHICLE_TYPE` | `VEHICLE`. `iconAssetId: null` clears the assignment. `version` is the **target entity's** version, not the icon's.

Errors: `ICON_NOT_FOUND` (404), `ASSIGNMENT_TARGET_NOT_FOUND` (404), `ICON_CATEGORY_MISMATCH` (422 — advisory guard, see `03-DOMAIN.md` §2.5), `*_VERSION_CONFLICT` (409). Audit `icon.assigned` / `icon.unassigned`.

## 5. Settings endpoints

### 5.1 `GET /api/v1/settings`
Optional `?group=`. Returns **every registry key**, whether or not a row exists, with effective value, default, `isDefault` and `isEnvLocked`.

### 5.2 `PUT /api/v1/settings`

```json
{ "changes": [ { "key": "map.defaultZoom", "value": 11, "version": 0 } ] }
```

Batch, applied in **one transaction — all or nothing**, so a form save cannot half-apply. `200` → updated `SettingDTO[]`.

| Error | Status |
|---|---|
| `SETTING_UNKNOWN_KEY` / `SETTING_TYPE_MISMATCH` / `SETTING_VALUE_INVALID` / `SETTING_VERSION_REQUIRED` | 422 |
| `SETTING_ENV_LOCKED` / `SETTING_VERSION_CONFLICT` | 409 |

Audit: one `setting.changed` entry **per key**, with before and after — not one entry for the batch, so each change is independently traceable.

### 5.3 `POST /api/v1/settings/[key]/reset`
Deletes the row so the registry default applies. `{ "version": n }`. Audit `setting.reset`.

## 6. Audit endpoint

### `GET /api/v1/audit`
Query: `actorUserId`, `entityType`, `entityId`, `action`, `from`, `to`, `page`, `pageSize` (default 50, max 200).

`200` → `{ items: AuditEntryDTO[], total, page, pageSize }`, newest first. Read-only — **no POST/PATCH/DELETE exists for audit at any path** (I-14).

## 7. Settings registry — the complete key list

Every key. Nothing outside this table is a valid setting (BR-S03).

| Key | Group | Type | Default | Env var | Validation | Runtime effect |
|---|---|---|---|---|---|---|
| `general.appName` | GENERAL | string | `آرمان حمل` | — | 1–64 | NEXT_PAGE_LOAD |
| `general.appDescription` | GENERAL | string | `سامانه مدیریت حمل‌ونقل` | — | 0–200 | NEXT_PAGE_LOAD |
| `locale.timezone` | LOCALE | enum | `Asia/Tehran` | `APP_TIMEZONE` | IANA allowlist | NEXT_REQUEST |
| `locale.calendar` | LOCALE | enum | `jalali` | — | `jalali` | NEXT_PAGE_LOAD |
| `locale.firstDayOfWeek` | LOCALE | enum | `saturday` | — | 7 weekday values | NEXT_PAGE_LOAD |
| `locale.usePersianDigits` | LOCALE | boolean | `true` | — | — | NEXT_PAGE_LOAD |
| `locale.dateFormat` | LOCALE | enum | `YYYY/MM/DD` | — | 3 formats | NEXT_PAGE_LOAD |
| `locale.timeFormat` | LOCALE | enum | `HH:mm` | — | `HH:mm`, `HH:mm:ss` | NEXT_PAGE_LOAD |
| `map.defaultCenterLat` | MAP | number | `35.6892` | — | −90…90 | NEXT_PAGE_LOAD |
| `map.defaultCenterLng` | MAP | number | `51.3890` | — | −180…180 | NEXT_PAGE_LOAD |
| `map.defaultZoom` | MAP | number | `11` | — | integer 0…22 | NEXT_PAGE_LOAD |
| `map.sceneRefreshIntervalMs` | MAP | number | `5000` | — | 2000…60000 | NEXT_PAGE_LOAD |
| `map.showRouteLines` | MAP | boolean | `true` | — | — | NEXT_PAGE_LOAD |
| `visualization.defaultTheme` | VISUALIZATION | enum | `light` | — | `light`, `dark` | NEXT_PAGE_LOAD |
| `visualization.enableAnimations` | VISUALIZATION | boolean | `true` | — | — | NEXT_PAGE_LOAD |
| `visualization.showEntityLabels` | VISUALIZATION | boolean | `true` | — | — | NEXT_PAGE_LOAD |
| `timeline.defaultMode` | TIMELINE | enum | `LIVE` | — | `LIVE`, `HISTORICAL` | NEXT_PAGE_LOAD |
| `timeline.defaultPlaybackSpeed` | TIMELINE | enum | `1` | — | `0.25,0.5,1,2,4,8` | NEXT_PAGE_LOAD |
| `dashboard.refreshIntervalMs` | OPERATIONAL | number | `30000` | — | 5000…300000 | NEXT_PAGE_LOAD |
| `dashboard.defaultRange` | OPERATIONAL | enum | `ALL` | — | `ALL,TODAY,LAST_7_DAYS,LAST_30_DAYS` | NEXT_PAGE_LOAD |

**Notes.**
- `locale.timezone` is the key that finally satisfies `CLAUDE.md` §2. It is env-overridable because a deployment may need to pin it.
- `visualization.defaultTheme` supplies a default for users with no stored choice; it **never** overwrites `localStorage` (BR-S06).
- `timeline.defaultMode` seeds the initial mode only. It does not weaken ADR-028 — a page load still resets to that default rather than restoring a stale session.
- **No key is a secret** (BR-S05, I-13). Credentials continue to use `MapProvider.secretReference`.
- No key duplicates Phase 4's provider configuration (ADR-P14-10).
