# Phase 14 — FAQ

Definitive answers. If your question is here, the answer is binding — do not re-decide it.

---

## Authorization & roles

**Q: Does this project use RBAC with permissions?**
No. Authorization is one function — `assertRole(actor, allowedRoles)` — over a three-value `RoleCode` enum, called by all 40 API routes. There is no `Permission` table, no claims, no policies. Do not create one (ADR-P14-01).

**Q: Then how do I express "this admin can manage icons but not users"?**
You do not. That granularity does not exist and is not required. If it becomes required, ADR-P14-01 documents the migration path.

**Q: Can an Admin create a new role?**
No. `RoleCode` is a PostgreSQL enum; a new role needs a migration. Phase 14 assigns roles; it does not create them (ADR-P14-02). Do not build a button that cannot work.

**Q: What exactly does the permission matrix show?**
A read-only table of role → capability, **derived from code**, so it can never drift from the real gates. It is documentation rendered in the UI, not configuration.

**Q: Is `proxy.ts` an authorization control?**
No. It matches `/dashboard/:path*` only, does not cover `/api/*`, and merely redirects session-less browsers to `/login`. It is a UX convenience. Every real control is `requireActor` in the route handler.

**Q: 403 or 404 when a Planner requests a user by id?**
**403.** Authorization is evaluated before existence. Returning 404 would leak whether the id exists.

---

## Users

**Q: Why can't usernames be changed?**
It is the audit correlation key across ten back-relations to historical business records. Renaming would silently reattribute history (BR-U03).

**Q: Deactivate or suspend — which do I use?**
Different states, deliberately (`03-DOMAIN.md` §2.2). *Deactivate* = administrative off-boarding, reason optional, indefinite. *Suspend* = temporary hold, **reason mandatory**. Both block login and revoke sessions. They are separate so the audit records *why*, which one boolean cannot.

**Q: Can I hard-delete a user?**
No. Ten back-relations would be orphaned, violating ADR-015. Soft delete only.

**Q: Why does restore return to `INACTIVE` rather than `ACTIVE`?**
Reinstating a deleted account should be deliberate. One click silently re-granting login is the wrong default.

**Q: Can a soft-deleted user's username be reused?**
No. It stays reserved (BR-U06); reissuing it would silently reattribute historical audit entries. Restore the user instead.

**Q: What if a query forgets `deletedAt: null`?**
Deleted users reappear across the app. This is the classic soft-delete trap and risk R2; test R-05 exists specifically to catch it.

**Q: Does the login flow need changing?**
**Yes** — and it is easy to miss. Login currently checks only `isActive`. It must also reject `suspendedAt != null` and `deletedAt != null`, or a suspended user can still log in (IU-22, IU-23).

**Q: Where does `lastLoginAt` get set?**
In the existing login flow, on success. It is the only write this phase adds to that flow beyond the status checks.

---

## Last-admin protection

**Q: Why inside the transaction and not before?**
Because two admins deactivating each other simultaneously would both read a "safe" count before either wrote, and both would succeed — leaving zero admins and an unadministrable system. The guard runs after the mutation is staged, inside the transaction, with `FOR UPDATE` (ADR-P14-05).

**Q: Which operations are guarded?**
Deactivate, suspend, soft-delete, and removing the `ADMIN` role. Not activate, unsuspend or restore — those can only increase the admin count.

**Q: Can an Admin deactivate themselves?**
Yes, if another active Admin exists. No, if they are the last (E1, E2).

**Q: What if the system somehow reaches zero admins?**
Break-glass: re-run the Phase 1 seed script, which provisions the initial Admin from environment variables. Documented in `10-NON_FUNCTIONAL.md` §12.

---

## Icons

**Q: Why not store icons in `public/`?**
Next.js serves `public/` statically **before** middleware. Files there are world-readable, unauthenticated and un-auditable, and no CSP can be attached (ADR-P14-03).

**Q: Do I need a sanitisation library?**
No, and do not add one. The design does not rely on sanitisation being perfect — it relies on `<img>`-only rendering plus CSP, with an allowlist analyser as defence in depth (ADR-P14-04).

**Q: Why reject unsafe SVG instead of stripping the bad parts?**
Silently altering an admin's file produces a different image than they intended without telling them. The error names the offending construct so they can fix the source.

**Q: Can I inline SVG for a sharper preview?**
**No.** Not for previews, not anywhere. Inlining is the XSS vector the whole design eliminates. Previews use `<img>` like everything else.

**Q: How do I get PNG dimensions without a library?**
Parse the IHDR chunk — bytes 16–23 of the header, big-endian. `05-IMPLEMENTATION.md` §2.3 has the complete function. It is 10 lines and needs no dependency.

**Q: What happens when an assigned icon is deleted?**
Resolution falls through to the type icon, then to the built-in default. **Never an error, never a broken image** (BR-I02). Assignments are retained so restoring the icon reinstates them.

**Q: What if the row exists but the file is gone?**
Same silent fallback; the gallery marks the entry damaged; it is logged. The map keeps working — that is the entire point of the fallback being silent.

**Q: How does caching work when an icon is replaced?**
The content hash changes, so the `ETag` and effective cache key change. Clients holding the old bytes keep them until expiry — acceptable and documented (E8, CX-05).

**Q: Can a `VEHICLE`-category icon be assigned to a warehouse?**
The picker filters by category and the API returns `ICON_CATEGORY_MISMATCH`, but category is an organisational aid, not a correctness boundary (`03-DOMAIN.md` §2.5).

**Q: Why is `GET /icons/[id]/content` open to non-admins?**
The operational map renders icons for all three roles. It exposes an image an Admin deliberately published — no privilege leak. It is the only non-Admin route in the phase.

---

## Settings

**Q: Why a key–value table instead of columns?**
A wide table needs a migration per setting. The registry defines type, default, validator and labels in code (ADR-P14-06).

**Q: What happens to a key that is not in the registry?**
Rejected on write (422), ignored on read. Unknown keys never reach storage (BR-S03).

**Q: What if a stored value is invalid?**
The default is used and the discrepancy is logged. A bad row must never break the application (BR-S04).

**Q: Can I store an API key or password as a setting?**
**No.** The registry contains no secret key and the API rejects unknown keys. Credentials use the `MapProvider.secretReference` pattern (BR-S05, I-13).

**Q: How does the timezone setting reach `jalali.ts` without breaking purity?**
It does not reach it directly. The pure functions gain an **optional** offset parameter defaulting to the current constant; the configured value is passed in at the service/UI boundary. Every existing caller and test is unchanged (ADR-P14-07).

**Q: Does changing the timezone alter stored data?**
No. Storage is UTC (ADR-008); only presentation changes (E13).

**Q: Does the default theme setting override a user's chosen theme?**
No, never. It seeds users who have made no choice (ADR-P14-08). `localStorage` wins.

**Q: Why is the settings cache per-process?**
Deployment is single-instance (A1), and the shipped `rate-limit.ts` has the identical limitation. Multi-instance is Phase 17.

**Q: Are roles cached too?**
**No, deliberately.** A role cache would let a revoked role keep working — stale security configuration (risk R4). Roles are read from the session's user on every request.

---

## Database & migration

**Q: Do I need a backfill?**
No. Every new column is nullable or defaulted. Existing users remain valid and `deriveUserStatus` returns exactly what `isActive` implied before.

**Q: `PHASE_STATUS.md` says `iconAssetId` is already in the schema. Is it?**
**No.** `grep -i icon prisma/schema.prisma` returns nothing. The documentation is wrong; correcting it is part of this phase (`PRE_IMPLEMENTATION_REVIEW.md` §6, D1).

**Q: Why isn't `IconAsset.name` unique at the database level?**
Uniqueness applies only among non-deleted rows. A plain unique index would wrongly block reusing a deleted icon's name. Enforced in the service.

**Q: Why isn't `username` case-insensitively unique in the database?**
Adding `citext` or a functional index would change an applied migration's semantics. It is enforced in the service, with the exact `@unique` as a backstop. The residual race is documented in `07-DATABASE.md` §2 and is Phase 17 hardening.

**Q: Can we roll back?**
Only before administrative data exists. After that, dropping the tables destroys user, icon and settings data, and `IconCategory` cannot be removed from PostgreSQL. Plan forward-only.

---

## Implementation

**Q: What shape should a new service follow?**
The shipped one: find → guard → transaction (conditional update + side effects) → `logAudit` after commit → return DTO. Read `vehicle-service.ts` and `mission-service.ts`.

**Q: What do I put in the audit payload?**
An explicit, field-allowlisted projection. **Never spread the entity** — the password hash ends up in the log (SEC-15).

**Q: File first or database row first for uploads?**
File first, row second, with a compensating delete if the row fails. The reverse would create a row pointing at a file that may never arrive.

**Q: Can a server service import from `src/features/**`?**
Never. It drags UI types and transitively the Prisma client into the wrong bundle. Phase 13 hit exactly this: `tsc` passed, the Turbopack build failed.

**Q: `npm run typecheck` passes. Is that enough?**
No. It cannot catch client/server bundle violations. **`npm run build` is mandatory.**

**Q: Why must step 4 (validators) finish before step 7 (storage)?**
So that no code capable of writing a file to disk exists before the validator that guards it has been proven against every hostile fixture.

---

## Testing

**Q: Why delta-based assertions?**
The shared dev database holds ~1,250 missions and ~6,400 organisation units. "Count equals 3" is meaningless; "count moved by exactly 1" is robust.

**Q: A regression test fails. Mine or pre-existing?**
Prove it. Create a worktree at the pre-Phase-14 commit and run the same spec. Identical failure ⇒ pre-existing, cite it. Different ⇒ yours, fix it. Never claim "environmental" without evidence.

**Q: Can I skip a security test that is hard to set up?**
**No.** The security suite is the one thing this phase cannot ship without. If a test is hard to write, that difficulty is information about the design.

**Q: How do I test the last-admin race for real?**
Issue genuinely parallel requests (`Promise.all`) from two admin sessions. Sequential calls pretending to race prove nothing (CX-02).

**Q: How do I test that SVG XSS is actually prevented?**
End-to-end: force a hostile SVG past validation using a test double, serve it, render it through the real `<img>` path, and assert no script executed. This proves the *primary* control works even if the sanitiser were bypassed.

**Q: Must a benign SVG be tested too?**
Yes — I-25 and I-26. An analyser that rejects everything is useless, and only the positive tests catch that.

---

## Process

**Q: Do I open a pull request?**
No. Commit and push directly to `main` at the end of the phase.

**Q: What if a specification here is wrong?**
Say so and stop. Explain the problem. Do not silently substitute your own design — the point of this pack is that the decisions are already made.

**Q: Phase 15's pack mentions attachments reusing this pipeline. Do I build attachments?**
No. Leave the pipeline generic over a category so Phase 15 can reuse it, and build nothing beyond icons.
