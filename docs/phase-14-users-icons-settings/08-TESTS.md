# Phase 14 — 08 — Test Plan

Every test states **Purpose · Preconditions · Input · Expected**. IDs are referenced by `09-ACCEPTANCE.md` and `12-CHECKLIST.md`.

Conventions from the shipped suites: Vitest for unit, Playwright across `mobile-360` / `tablet-768` / `desktop-1024` / `desktop-1440`, Persian test names, self-contained per-file fixtures.

> **Delta-based assertions only.** The shared dev database already holds ~1,250 missions and ~6,400 organisation units. Assert "this count moved by exactly 1", never "this count equals 3".

---

## 1. Unit — user rules (`U`)

| ID | Purpose | Input | Expected |
|---|---|---|---|
| U-01 | Status precedence: deleted wins over everything | `{deletedAt: d, suspendedAt: d, isActive: false}` | `DELETED` |
| U-02 | Suspended beats inactive | `{deletedAt: null, suspendedAt: d, isActive: false}` | `SUSPENDED` |
| U-03 | Inactive when only `isActive` false | `{null, null, false}` | `INACTIVE` |
| U-04 | Active baseline | `{null, null, true}` | `ACTIVE` |
| U-05 | Totality | all 8 flag combinations | never throws; always a valid value |
| U-06 | Username accepts valid forms | `abc`, `a_b-c.d`, 32 chars | pass |
| U-07 | Username rejects leading digit | `1abc` | `USER_USERNAME_INVALID` |
| U-08 | Username length boundaries | 2 chars / 3 / 32 / 33 | reject / pass / pass / reject |
| U-09 | Username rejects Persian and spaces | `کاربر`, `a b` | reject |
| U-10 | Password length boundaries | 7 / 8 / 128 / 129 | reject / pass / pass / reject |
| U-11 | Password needs letter and digit | `12345678`, `abcdefgh` | both reject |
| U-12 | Password ≠ username, case-insensitive | user `Admin1`, pass `admin1` | reject |
| U-13 | Last-admin predicate: sole admin targeted | `["u1"]`, target `u1`, isAdmin | `true` |
| U-14 | Two admins, one targeted | `["u1","u2"]`, target `u1` | `false` |
| U-15 | Non-admin target never blocks | `["u1"]`, target `u2`, not admin | `false` |
| U-16 | Empty admin set (already broken) | `[]`, any target | `false` — predicate never masks an existing breach |

## 2. Unit — icon rules (`I`)

### 2.1 File validation

| ID | Purpose | Input | Expected |
|---|---|---|---|
| I-01 | PNG magic bytes accepted | valid 32×32 PNG | pass |
| I-02 | PNG dimensions parsed | 64×48 PNG | `{width:64,height:48}` |
| I-03 | Truncated PNG | 12 bytes | `null` → `ICON_CONTENT_MISMATCH` |
| I-04 | PNG renamed `.svg` (E10) | PNG bytes, `.svg` name | `ICON_CONTENT_MISMATCH` |
| I-05 | Dimension bounds | 15px / 16 / 512 / 513 | reject / pass / pass / reject |
| I-06 | Size bounds | 0 / 1 / 2MB / 2MB+1 | `ICON_EMPTY` / pass / pass / `ICON_TOO_LARGE` |
| I-07 | Extension/MIME disagreement | `.png` + `image/svg+xml` | `ICON_TYPE_MISMATCH` |
| I-08 | Non-image extension | `.exe` | `ICON_INVALID_EXTENSION` |

### 2.2 SVG analysis — **hostile fixtures, exhaustive**

Each returns ≥ 1 finding ⇒ `ICON_SVG_UNSAFE`.

| ID | Hostile construct | Fixture |
|---|---|---|
| I-09 | `<script>` at root | `<svg><script>alert(1)</script></svg>` |
| I-10 | `<script>` nested in `<defs>` (E9) | `<svg><defs><script>…</script></defs></svg>` |
| I-11 | `<script>` with whitespace/case tricks | `<svg>< SCRIPT >…` , `<sCrIpT>` |
| I-12 | `<foreignObject>` | embeds HTML |
| I-13 | `onload` attribute | `<svg onload="alert(1)">` |
| I-14 | `onclick` on a child | `<circle onclick="…">` |
| I-15 | `javascript:` href | `<a href="javascript:alert(1)">` |
| I-16 | External `xlink:href` | `<image xlink:href="https://evil/x.png">` |
| I-17 | Protocol-relative href | `//evil/x.svg` |
| I-18 | `<!ENTITY` XXE | internal DTD subset |
| I-19 | Billion laughs | nested entities |
| I-20 | CSS `@import` | `<style>@import url(https://evil)</style>` |
| I-21 | CSS `expression()` | legacy IE script vector |
| I-22 | `url()` to external host in `fill` | `fill="url(https://evil)"` |
| I-23 | Non-PNG `data:` URI | `data:text/html;base64,…` |
| I-24 | `<iframe>` / `<embed>` / `<object>` | each |
| I-25 | **Benign SVG passes** | plain paths, internal `#gradient` ref, `data:image/png;base64,` | **zero findings** |
| I-26 | Benign SVG with comments | comments present | passes (normalised, not rejected) |

> I-25 and I-26 matter as much as the rejections: an analyzer that rejects everything is useless. Both must be asserted.

### 2.3 Resolution

| ID | Purpose | Input | Expected |
|---|---|---|---|
| I-27 | Entity icon wins | entity=A(usable), type=B | `A` |
| I-28 | Falls to type | entity=null, type=B(usable) | `B` |
| I-29 | Falls to default | both null | `null` |
| I-30 | Deleted entity icon falls through (E7) | entity=A(not usable), type=B | `B` |
| I-31 | Both unusable → default | both not usable | `null` |
| I-32 | Never throws | any combination incl. unknown ids | no exception |

## 3. Unit — settings (`S`)

| ID | Purpose | Input | Expected |
|---|---|---|---|
| S-01 | Unknown key rejected | `nope.key` | `SETTING_UNKNOWN_KEY` |
| S-02 | Type mismatch | `map.defaultZoom = "abc"` | `SETTING_TYPE_MISMATCH` |
| S-03 | Number range | zoom −1 / 0 / 22 / 23 | reject / pass / pass / reject |
| S-04 | Enum membership | `locale.calendar = "gregorian"` | `SETTING_VALUE_INVALID` |
| S-05 | Precedence: env wins over DB | env + row present | env value, `isEnvLocked` |
| S-06 | Precedence: DB over default | row present, no env | DB value |
| S-07 | Precedence: default when absent | neither | registry default |
| S-08 | Corrupt row falls back (BR-S04) | unparseable JSON | default; error logged; **no throw** |
| S-09 | Every registry key has default + validator + Persian label | iterate registry | all present |
| S-10 | **No registry key is a secret** (I-13) | iterate registry | no key matches `/password|secret|token|key$|credential/i` |
| S-11 | Cache invalidated on write | set → read | new value |
| S-12 | Cache hit performs no query | read twice | one query total |

## 4. Integration — users (`IU`)

| ID | Purpose | Preconditions | Input | Expected |
|---|---|---|---|---|
| IU-01 | Create user | admin session | valid payload | 201; `mustChangePassword` true; roles assigned; audit `user.created` |
| IU-02 | **No hash in response or audit** | after IU-01 | — | `passwordHash` absent from DTO **and** from `afterJson` |
| IU-03 | Duplicate username | existing user | same username | 409 `USER_USERNAME_TAKEN` |
| IU-04 | Duplicate differing by case (BR-U01) | `Planner1` exists | `planner1` | 409 |
| IU-05 | Soft-deleted username still reserved (E5) | deleted user | same username | 409 |
| IU-06 | Deactivate revokes sessions (SEC-19) | user with 2 sessions | deactivate | both `revokedAt` set |
| IU-07 | Suspend requires reason | — | no reason | 422 |
| IU-08 | Suspend then unsuspend | — | — | status returns to prior |
| IU-09 | Soft delete retains history | user with audit rows | delete | `deletedAt` set; audit rows intact |
| IU-10 | Restore → **INACTIVE**, not ACTIVE | deleted user | restore | status `INACTIVE` |
| IU-11 | Last-admin: deactivate sole admin (E2) | one admin | deactivate | 409 `LAST_ADMIN_PROTECTED`; unchanged |
| IU-12 | Last-admin: suspend sole admin | one admin | suspend | 409 |
| IU-13 | Last-admin: delete sole admin | one admin | delete | 409 |
| IU-14 | Last-admin: remove ADMIN role | one admin | roles=[PLANNER] | 409 |
| IU-15 | Second admin makes it allowed (E1) | two admins | deactivate one | 200 |
| IU-16 | Removing last role rejected (E6) | — | roles=[] | 422 |
| IU-17 | Role replacement atomic | 2 roles | PUT 1 role | exactly 1 remains |
| IU-18 | Password reset revokes sessions | live session | reset | sessions revoked; `mustChangePassword` true |
| IU-19 | **Reset audit has no password** | after IU-18 | — | no password/hash in any audit field |
| IU-20 | Username immutable (BR-U03) | — | PATCH username | rejected |
| IU-21 | Soft-deleted excluded by default (R2) | deleted user | GET list | absent; present with `includeDeleted=true` |
| IU-22 | **Suspended user cannot log in** | suspended | login | rejected |
| IU-23 | **Deleted user cannot log in** | deleted | login | rejected |
| IU-24 | Pagination correct | 30 users | page 2, size 25 | 5 items, `total` 30 |

## 5. Integration — icons (`II`)

| ID | Purpose | Input | Expected |
|---|---|---|---|
| II-01 | Upload valid PNG | 64×64 PNG | 201; file on disk; `sha256` matches; audit |
| II-02 | Upload valid SVG | benign SVG | 201 |
| II-03 | **Hostile SVG writes nothing** | `<script>` SVG | 422; **`ICON_ROOT` file count unchanged**; no row |
| II-04 | Oversized writes nothing | 3 MB | 422; no file |
| II-05 | Replace keeps id + assignments | assigned icon | replace | same id; new `sha256`; assignment intact |
| II-06 | Delete then resolve falls back (E7) | assigned then deleted | resolve | default |
| II-07 | Restore reinstates | after II-06 | restore | assignment active again |
| II-08 | Duplicate name rejected | existing name | 409 |
| II-09 | Name unique case-insensitively (E20) | `Truck` vs `truck` | 409 |
| II-10 | Content served with all headers | GET content | `Content-Type`, `nosniff`, CSP, `Cache-Control`, `ETag` all present |
| II-11 | Deleted icon content → 404 | deleted | GET content | 404 |
| II-12 | Missing file → 404, no crash (E17) | row exists, file removed | GET content | 404; list still renders |
| II-13 | Assignment to org unit | — | PUT | `iconAssetId` set; audit |
| II-14 | Clearing assignment | — | `iconAssetId: null` | cleared |
| II-15 | `usageCount` accurate | 3 assignments | GET | 3 |
| II-16 | Orphan file cleaned when DB fails | simulated DB error | — | no orphan remains |

## 6. Integration — settings & audit (`IS`)

| ID | Purpose | Input | Expected |
|---|---|---|---|
| IS-01 | Change persists and takes effect | zoom 11→14 | GET returns 14 |
| IS-02 | Audit records before and after | — | `beforeJson` 11, `afterJson` 14 |
| IS-03 | Batch is all-or-nothing | 1 valid + 1 invalid | 422; **neither applied** |
| IS-04 | Reset removes the row | changed key | reset | default; `isDefault` true |
| IS-05 | Env-locked rejected (E15) | env set | PUT | 409 `SETTING_ENV_LOCKED` |
| IS-06 | Unknown key never stored | `nope.key` | PUT | 422; no row |
| IS-07 | Audit filters work | mixed entries | filter by actor/entity/action/date | only matching |
| IS-08 | Audit paginated newest-first | 100 entries | page 1 | 50, descending |
| IS-09 | **Audit is read-only** (I-14) | — | POST/PATCH/DELETE `/audit` | 404 or 405 — no mutating route exists |

## 7. Security suite (`SEC`) — every one is mandatory

| ID | Purpose | Input | Expected |
|---|---|---|---|
| SEC-01 | Unauthenticated blocked | no session, every admin endpoint | 401 each |
| SEC-02 | **Planner forbidden** | planner session, every admin endpoint | 403 each; no state change |
| SEC-03 | **Viewer forbidden** | viewer session, every admin endpoint | 403 each |
| SEC-04 | UI hiding is not the control | planner calls the API directly | 403 — proves server-side enforcement |
| SEC-05 | Privilege escalation blocked | planner grants self ADMIN | 403; roles unchanged |
| SEC-06 | IDOR: another user's record | planner GETs a user by id | 403 (not 404 — authorization precedes existence) |
| SEC-07 | Stored XSS via display name | `<img src=x onerror=alert(1)>` | stored escaped; rendered as text; **no execution** |
| SEC-08 | Stored XSS via icon name | script payload in name | rendered as text |
| SEC-09 | **SVG XSS end-to-end** | upload hostile SVG → forced past validation in a test double → render | `<img>` rendering + CSP prevent execution |
| SEC-10 | Path traversal in filename | `../../etc/passwd.png` | stored as `{uuid}.png`; nothing written outside `ICON_ROOT` |
| SEC-11 | Path traversal in content URL | `GET /icons/..%2F..%2Fetc%2Fpasswd/content` | 404; no file read |
| SEC-12 | MIME spoofing | PHP bytes, `image/png` MIME, `.png` name | 422 `ICON_CONTENT_MISMATCH` |
| SEC-13 | Zip bomb / huge declared size | 2 MB claiming 10 GB dimensions | rejected by dimension bounds |
| SEC-14 | Password never in audit | create + reset | grep all audit rows for the plaintext | absent |
| SEC-15 | Hash never in any API response | every user endpoint | `passwordHash` absent |
| SEC-16 | Rate limit on admin mutations | rapid repeats | limited |
| SEC-17 | Session revoked on deactivate | live session → deactivate | next request 401 |
| SEC-18 | No secret storable as a setting | attempt a secret-looking key | 422 unknown key |

## 8. Concurrency (`CX`) — real parallelism, not sequential

| ID | Purpose | Input | Expected |
|---|---|---|---|
| CX-01 | Two edits, same version | parallel PATCH | one 200, one 409 `USER_VERSION_CONFLICT` |
| CX-02 | **Last-admin race** (E3) | two admins, parallel deactivate of each other | **exactly one succeeds**; ≥ 1 active admin remains |
| CX-03 | Parallel role changes | same user | one wins; role set is one of the two intended, never a blend |
| CX-04 | Parallel setting writes | same key | one 200, one 409 |
| CX-05 | Icon replaced while being read (E8) | replace during GET | reader gets old or new bytes, never a partial file |
| CX-06 | Setting reset vs edit (E14) | parallel | one 409 |

> CX-02 is the single most important test in the phase. It must issue genuinely parallel requests (`Promise.all`), not sequential calls pretending to race.

## 9. E2E (`E`) — four viewports

| ID | Purpose | Steps | Expected |
|---|---|---|---|
| E-01 | Create user end-to-end | admin → create → new user logs in | forced password change, then dashboard |
| E-02 | Deactivate blocks login | deactivate → attempt login | rejected with a Persian message |
| E-03 | Suspend shows reason | suspend with reason | reason visible on detail |
| E-04 | Last-admin refusal is visible | sole admin self-deactivates | Persian error; state unchanged |
| E-05 | Role assignment reflected | grant PLANNER | `/missions` becomes reachable for that user |
| E-06 | **Admin pages hidden from non-admins** | planner/viewer | no `/system/users` nav; direct URL denied |
| E-07 | Icon upload + preview | upload PNG | thumbnail on light and dark |
| E-08 | Hostile SVG rejected with a clear reason | upload `<script>` SVG | Persian error naming the construct; not added |
| E-09 | Icon assigned appears on the map | assign to a vehicle type | marker uses the icon |
| E-10 | Unassigned entities keep the circle | — | fallback intact |
| E-11 | Setting change takes effect | change default zoom | map opens at the new zoom |
| E-12 | Env-locked field is read-only | env set | disabled with reason shown |
| E-13 | Audit viewer filters | perform actions → filter | matching entries with Jalali times |
| E-14 | Conflict surfaced recoverably | two tabs edit one user | second shows Persian conflict + reload |
| E-15 | Keyboard-only user creation | Tab/Enter/Escape | completes without a mouse |
| E-16 | Upload reachable by keyboard | — | file input focusable and activatable |

## 10. Responsive, RTL & accessibility (`AX`)

| ID | Purpose | Expected |
|---|---|---|
| AX-01 | Tables become cards below `md` | no horizontal page scroll at 360 |
| AX-02 | Permission matrix scrolls in its own container | page does not scroll sideways |
| AX-03 | Touch targets ≥ 44px | measured on every action at 360 |
| AX-04 | RTL layout correct | no hardcoded `left`/`right`; logical properties only |
| AX-05 | LTR technical values | username, IP, filename, hash render `dir="ltr"` |
| AX-06 | Persian digits and Jalali dates | all counts and timestamps |
| AX-07 | Long Persian text | 64-char display name, 500-char reason — no overflow |
| AX-08 | Status not colour-only | icon + label present |
| AX-09 | WCAG AA contrast | both themes |
| AX-10 | Focus visible; Escape closes dialogs; focus returns | all sheets/dialogs |
| AX-11 | Errors linked via `aria-describedby` | every form field |
| AX-12 | No hover-only affordance | every action tap-reachable |

## 11. Offline (`OF`)

| ID | Purpose | Steps | Expected |
|---|---|---|---|
| OF-01 | Full admin flow offline | disconnect Internet → create user, upload icon, change setting, read audit | all succeed |
| OF-02 | No external request | monitor network during every admin page | zero non-localhost requests |
| OF-03 | Icons served locally | load map with icons | all from own origin |
| OF-04 | External provider unreachable | provider down | map degrades (existing Phase 4 behaviour); **administration unaffected** |

## 12. Regression (`R`)

| ID | Purpose | Expected |
|---|---|---|
| R-01 | Existing auth suite passes unmodified | `auth.spec.ts` green |
| R-02 | Map still renders without any icon assigned | coloured circles unchanged |
| R-03 | Dashboard, timeline, mission suites unaffected | green |
| R-04 | `jalali.ts` change breaks nothing | all existing date tests pass unmodified |
| R-05 | Existing user queries exclude soft-deleted | no deleted user appears anywhere |
| R-06 | `npm run build` succeeds | catches client/server bundle violations that `tsc` misses |

## 13. Coverage requirement

- `user-rules.ts`, `icon-rules.ts`, `svg-analyzer.ts`, `png-dimensions.ts`, `settings-registry.ts`: **100% branch coverage.** They are pure, small, and security-critical.
- Every SEC test is mandatory — none may be skipped or marked pending.
- At least one genuinely parallel concurrency test (CX-02).
