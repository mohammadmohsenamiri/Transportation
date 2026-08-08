# Phase 14 — 09 — Acceptance

Done only when every box is checked **with evidence**.

---

## 1. Definition of Done

Inherits `CLAUDE.md` §4 in full, plus this phase's specifics.

| # | Criterion | Evidence |
|---|---|---|
| 1 | Migration + seed run without error | `prisma migrate dev` + `generate` clean |
| 2 | `npm run lint` — **zero errors** | only the 2 known pre-existing warnings |
| 3 | `npm run typecheck` clean | — |
| 4 | `npm run test` — all unit tests pass | every U/I/S test |
| 5 | **`npm run build` succeeds** | mandatory — see §6 |
| 6 | Permissions enforced server-side, not only hidden | SEC-01…SEC-06 |
| 7 | loading / empty / error / success / destructive-confirm states present | E-tests |
| 8 | Usable at 360/768/1024/1440 with touch | AX-01…AX-03 |
| 9 | Dark + light, RTL, long Persian text, keyboard navigation verified | AX-04…AX-12 |
| 10 | **No unintended runtime internet request** | OF-02 |
| 11 | `PHASE_STATUS.md`, `README.md`, ADR-030…039 updated | — |
| 12 | The four documentation defects in `PRE_IMPLEMENTATION_REVIEW.md` §6 corrected | — |
| 13 | Summary lists changed files, migrations, tests, remaining limits | — |

## 2. Acceptance criteria

### 2.1 Users

| # | Criterion | Test |
|---|---|---|
| AC-01 | Admin creates a user with roles; the user logs in and is forced to change password | IU-01, E-01 |
| AC-02 | Admin edits display name; username is immutable | IU-20 |
| AC-03 | Deactivate, suspend (with reason), unsuspend, activate all work and are audited | IU-06…IU-08 |
| AC-04 | Soft delete retains all history; restore returns to **INACTIVE** | IU-09, IU-10 |
| AC-05 | Deactivation, suspension and deletion revoke sessions and block login | IU-06, IU-22, IU-23, SEC-17 |
| AC-06 | Password reset revokes sessions and forces a change | IU-18 |
| AC-07 | Username uniqueness holds case-insensitively, including soft-deleted | IU-04, IU-05 |
| AC-08 | Every user always holds ≥ 1 role | IU-16 |
| AC-09 | User list is paginated and excludes soft-deleted by default | IU-21, IU-24 |

### 2.2 Last-admin protection

| # | Criterion | Test |
|---|---|---|
| AC-10 | Deactivate / suspend / delete / role-removal of the sole active Admin all refused | IU-11…IU-14 |
| AC-11 | Allowed once a second active Admin exists | IU-15 |
| AC-12 | **Two admins racing cannot reach zero admins** | CX-02 |
| AC-13 | The rule applies when an Admin targets themselves | E-04 |

### 2.3 Icons

| # | Criterion | Test |
|---|---|---|
| AC-14 | Valid PNG and SVG upload, preview on both themes | II-01, II-02, E-07 |
| AC-15 | **Every hostile SVG construct is rejected and nothing is written** | I-09…I-24, II-03 |
| AC-16 | A benign SVG is accepted | I-25, I-26 |
| AC-17 | MIME spoofing and renamed files rejected by content inspection | I-04, SEC-12 |
| AC-18 | Path traversal impossible via filename or URL | SEC-10, SEC-11 |
| AC-19 | Icons served with `nosniff`, CSP and immutable caching | II-10 |
| AC-20 | **Uploaded SVG is never inlined into the DOM** | code review + SEC-09 |
| AC-21 | Resolution: entity → type → default; deleted icons fall through silently | I-27…I-32, II-06 |
| AC-22 | Assigned icons appear on the map; unassigned keep the circle | E-09, E-10, R-02 |
| AC-23 | Replace keeps identity and assignments; hash changes | II-05 |

### 2.4 Settings

| # | Criterion | Test |
|---|---|---|
| AC-24 | Every registry key has type, default, validator and Persian label | S-09 |
| AC-25 | Precedence env > DB > default | S-05…S-07 |
| AC-26 | Invalid stored value falls back to default without throwing | S-08 |
| AC-27 | Batch save is all-or-nothing | IS-03 |
| AC-28 | Env-locked settings are read-only in UI and rejected by API | IS-05, E-12 |
| AC-29 | **No setting can hold a secret** | S-10, SEC-18 |
| AC-30 | Timezone is configurable; changing it alters presentation only | IS-01, R-04 |
| AC-31 | A system default never overwrites a user's stored theme | manual §6 |

### 2.5 Audit & security

| # | Criterion | Test |
|---|---|---|
| AC-32 | Every administrative mutation writes an audit entry with actor, before, after | IU-01, IS-02 |
| AC-33 | **No password, hash or secret appears in any audit entry or log** | IU-02, IU-19, SEC-14 |
| AC-34 | Audit viewer filters and paginates; is read-only | IS-07…IS-09 |
| AC-35 | Non-admins receive 403 on every administrative endpoint | SEC-02, SEC-03 |
| AC-36 | Privilege escalation and IDOR blocked | SEC-05, SEC-06 |
| AC-37 | Stored XSS impossible via display name or icon name | SEC-07, SEC-08 |
| AC-38 | `passwordHash` never returned by any endpoint | SEC-15 |

### 2.6 Concurrency & offline

| # | Criterion | Test |
|---|---|---|
| AC-39 | Concurrent edits: one succeeds, one gets a recoverable 409 | CX-01, E-14 |
| AC-40 | Concurrent setting writes serialise correctly | CX-04 |
| AC-41 | Every administrative flow works with the Internet disconnected | OF-01 |
| AC-42 | Zero external network requests from any admin page | OF-02 |
| AC-43 | An unreachable external map provider does not impair administration | OF-04 |

## 3. Quality gates

| Gate | Threshold |
|---|---|
| Branch coverage: `user-rules`, `icon-rules`, `svg-analyzer`, `png-dimensions`, `settings-registry` | **100%** |
| Lint errors | 0 |
| Type errors | 0 |
| Security tests (SEC-01…SEC-18) | **100% passing, none skipped** |
| Hostile SVG fixtures (I-09…I-24) | **100% rejected** |
| Benign SVG fixtures (I-25, I-26) | **100% accepted** |
| E2E on four viewports | 100% |
| Pre-existing suites | unchanged and passing |
| Real parallel concurrency test | ≥ 1 (CX-02) |

## 4. Performance targets

| Metric | Target | Test |
|---|---|---|
| Admin operation (excl. hashing) | < 300 ms | P-07 |
| argon2 hashing | 0.5–1 s — **deliberately slow, not a defect** | — |
| User list (25/page) | < 200 ms | P-01 |
| Audit list (50/page) | < 300 ms | P-02 |
| Setting read (cached) | **0 queries** | S-12 |
| Icon serve | streamed; immutable cache | P-04 |
| Map scene build | **no additional query** vs. baseline | P-05 |

Baselines captured before starting.

## 5. Demo scenarios

### D1 — User lifecycle
Admin creates «برنامه‌ریز آزمایشی» with the Planner role. The new user logs in, is forced to change password, reaches `/missions`, cannot reach `/system/users`. Admin suspends them with a reason; their session dies and login is refused with a Persian message. Admin unsuspends; access returns. Every step appears in the audit viewer with actor and Jalali time.

### D2 — Last-admin protection
With one Admin, attempt deactivate, suspend, delete and ADMIN-role removal — all four refused with `LAST_ADMIN_PROTECTED`. Create a second Admin; the first can now be deactivated. **The system can never be left unadministrable.**

### D3 — Hostile icon rejected
Upload an SVG containing `<script>`, an `onload` handler and an external `xlink:href`. The upload is refused with a Persian message naming the constructs. `ICON_ROOT` file count is unchanged and no row exists. Then upload a benign SVG — accepted, previewed on light and dark.

### D4 — Icon on the map
Assign an icon to a vehicle type. Open the operational map: vehicles of that type render the icon; every other entity keeps its coloured circle. Soft-delete the icon: markers silently return to circles with **no error and no broken image**. Restore it: the icon returns.

### D5 — Settings
Change the default map zoom and the timezone. The map opens at the new zoom; Jalali timestamps shift while the underlying UTC data does not. Reset both to default. Attempt to change an env-locked setting — the field is read-only with the reason shown, and a direct API call returns `SETTING_ENV_LOCKED`.

### D6 — Concurrency
Two admin tabs open the same user. Tab A saves. Tab B saves with a stale version → Persian conflict message with reload. Reloading shows A's change. **Nothing was overwritten.**

### D7 — Offline
Disconnect the Internet entirely. Perform D1, D3, D4 and D5 end to end. Every flow succeeds; the network panel shows zero non-localhost requests.

## 6. Manual verification

1. **Run `npm run build`.** Phase 13 shipped a defect that `tsc` accepted and Turbopack rejected — a client component importing a server-only module. Typecheck alone is not sufficient evidence.
2. **Disconnect the Internet.** Perform every administrative flow (OF-01).
3. **Inspect the network panel** on each admin page — zero external requests.
4. **Verify theme precedence:** set a system default theme, then confirm a user with an existing `localStorage` choice is unaffected (AC-31).
5. **Long Persian text:** 64-char display name, 500-char suspension reason — no overflow, no clipping.
6. **Both themes, all four widths**, every new page and dialog.
7. **Keyboard only:** create a user and upload an icon without a mouse.
8. **Read the audit rows directly in the database** after a create and a password reset, and confirm no password material is present (AC-33).
9. **Confirm no code path inlines uploaded SVG** — grep for `dangerouslySetInnerHTML` and verify no result touches icon content (AC-20).

## 7. Rollout notes

- **Forward-only once administrative data exists.** `IconCategory` cannot be removed from PostgreSQL, and dropping the new tables would destroy user, icon and settings data.
- **Auth flow change:** login must now also reject `suspendedAt`/`deletedAt`, not just `isActive`. Without this, a suspended user could still log in — verify explicitly (IU-22, IU-23).
- **Soft-delete trap:** every existing user query gains `deletedAt: null`. R-05 exists specifically to catch a missed one.
- **Storage directory** must exist and be writable, be gitignored, and be included in the backup routine already noted in `API_SECURITY_OFFLINE_OPERATIONS.md`.
- **Documentation corrections** (`PRE_IMPLEMENTATION_REVIEW.md` §6) ship with the phase, not after.
