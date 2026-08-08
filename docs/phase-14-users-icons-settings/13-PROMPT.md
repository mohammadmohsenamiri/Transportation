# Phase 14 — 13 — Implementation Prompt

Hand this file to the implementing Claude instance verbatim.

---

## ROLE

You are the implementation engineer for **Phase 14 — Users, Map Icons & System Settings** of the Transportation Management System, a Persian RTL enterprise transport platform.

You are writing production code. Every architectural decision is already made and recorded in `ADR.md`. **You build; you do not design.** If you believe a specification is wrong, say so and stop — do not silently substitute your own design.

This is the most **security-sensitive** phase in the project. It creates users, grants roles, and accepts file uploads. Treat every shortcut as a vulnerability.

## CONTEXT YOU MUST INTERNALISE BEFORE TYPING

Four things the repository will contradict if you assume otherwise:

1. **There is no permission model.** Authorization is `assertRole(actor, allowedRoles)` over a three-value `RoleCode` enum, used by all 40 API routes. Do **not** create `Permission` or `RolePermission`. Do **not** write `hasPermission` or `checkPermission`.
2. **`iconAssetId` does not exist**, despite `PHASE_STATUS.md` claiming it does. `grep -i icon prisma/schema.prisma` returns nothing. You create it.
3. **Map provider management already ships** (Phase 4, full CRUD + connection test). Do not rebuild it. You add only global map *defaults* as settings.
4. **No settings mechanism exists.** The system timezone is a hardcoded constant, which contradicts `CLAUDE.md` §2. You make it configurable.

## READING ORDER — non-negotiable

1. `PRE_IMPLEMENTATION_REVIEW.md` — what exists, what does not, the ten rulings
2. `00-README.md` — purpose and goals
3. `01-SCOPE.md` — the exact boundary
4. `02-REQUIREMENTS.md` — every rule, numbered
5. `03-DOMAIN.md` — entities, invariants, **the six naming hazards**
6. `04-ARCHITECTURE.md` — layering, icon safety, concurrency
7. `05-IMPLEMENTATION.md` — build order and pseudocode
8. `06-API.md` — contracts and the full settings registry
9. `07-DATABASE.md` — schema and migration
10. `08-TESTS.md` — every test
11. `09-ACCEPTANCE.md` — Definition of Done
12. `10-NON_FUNCTIONAL.md`, `11-OUT_OF_SCOPE.md`, `12-CHECKLIST.md`
13. `ADR.md`, `FAQ.md`

Then, in the repository: `CLAUDE.md`, `docs/IMPLEMENTATION_PLAN.md` (Phase 14), `docs/API_SECURITY_OFFLINE_OPERATIONS.md` §6, `docs/DECISIONS.md` (ADR-004, ADR-008, ADR-013, ADR-014, ADR-015), `src/server/services/permission-service.ts`, `src/app/api/v1/routes/import-csv/route.ts`, `src/server/services/vehicle-service.ts`.

## IMPLEMENTATION ORDER — strictly sequential

Per `05-IMPLEMENTATION.md` §1. Each step green before the next:

1. Migration
2. `user-rules.ts` + tests
3. `settings-registry.ts` + tests
4. `icon-rules.ts` + `svg-analyzer.ts` + `png-dimensions.ts` + tests
5. `settings-service` + cache
6. `user-service` (lifecycle, roles, last-admin guard, concurrency)
7. `icon-storage` + `icon-service`
8. `audit-query-service`
9. API routes + Zod + **the full security suite**
10. UI pages
11. Icon rendering in the map marker layer
12. Docs, ADRs, doc-defect corrections, ship

**Step 4 must be complete and green before step 7.** The validator must exist and be proven against every hostile fixture before any code can write a file to disk.

## THE THREE RULES THAT MATTER MOST

**1. Uploaded SVG is rendered only via `<img src>`. Never inlined.**
No `dangerouslySetInnerHTML`. No `<svg>{content}</svg>`. Not even "just for the preview". An SVG loaded through `<img>` cannot execute script; an inlined one can. This is the primary XSS control — the sanitiser is only defence in depth, because hand-written SVG sanitisers get bypassed.

**2. The last-admin guard runs inside the transaction, after the mutation, with `FOR UPDATE`.**
Checking before the transaction is racy and allows exactly the failure the rule exists to prevent: two admins deactivating each other simultaneously, leaving the system unadministrable. See `05-IMPLEMENTATION.md` §4.2.

**3. Audit payloads are field-allowlisted.**
Never spread an entity into `beforeJson`/`afterJson` — the password hash ends up in the log. Build the payload explicitly from the fields you intend to record.

## RESTRICTIONS

**Never:**
- Create `Permission` / `RolePermission`, or write permission-checking code
- Build a role creation/deletion UI (`RoleCode` is a PG enum)
- Rebuild map provider management
- Re-implement, wrap or "improve" password hashing
- Store icons in `public/`
- Inline uploaded SVG anywhere
- Trust MIME type alone — always inspect content
- Build a filesystem path from a client-supplied name
- Hard-delete a user
- Return `passwordHash` from any endpoint
- Put a password, hash or secret in an audit entry or log
- Cache roles or permissions
- Add a runtime dependency (PNG dimensions come from a 24-byte header parse)
- Load anything from a CDN
- Add an unpaginated list endpoint
- Import a server module into a `"use client"` component
- Use `any` without written justification
- Modify an applied migration
- Implement anything in `11-OUT_OF_SCOPE.md`
- Work on more than this one phase

**Always:**
- Call `requireActor([RoleCode.ADMIN])` before reading the request body
- Validate every input with Zod at the boundary
- Validate uploads completely **before** writing any byte
- Wrap each mutation in one transaction, version check in the `UPDATE … WHERE`
- Revoke sessions in the same transaction as a status change
- Write an audit entry after commit
- Paginate every list
- Write Persian UI text and Persian error messages
- Use logical CSS properties
- Follow the shipped service shape

## CODING STANDARDS

- TypeScript strict; no `any` without justification.
- Persian comments explaining **why**, matching the existing style.
- Domain layer pure: no I/O, no framework imports.
- One rule in one place.
- Errors are `DomainError` with a code, a Persian message, and `fieldErrors` where applicable.
- New code should look like whoever wrote Phase 3 and Phase 7 wrote it.

## VERIFICATION — all mandatory

```bash
npm run typecheck
npm run lint          # zero errors
npm run test          # all unit tests
npm run build         # MANDATORY — see below
npx playwright test tests/e2e/admin-users.spec.ts
npx playwright test tests/e2e/admin-icons.spec.ts
npx playwright test tests/e2e/admin-settings.spec.ts
npx playwright test   # full regression
```

**`npm run build` is not optional and not redundant with typecheck.** Phase 13 shipped a defect where a client component imported a server-only module: `tsc` accepted it and the Turbopack build failed. Typecheck cannot catch client/server bundle violations.

**Triaging regression failures:** the shared dev database is large and some failures are pre-existing (`11-OUT_OF_SCOPE.md` §4). Do **not** claim "environmental" without proof. Create a git worktree at the pre-Phase-14 commit, run the same spec there, and report the comparison. Identical failure ⇒ pre-existing, cite it. Different ⇒ yours, fix it.

## SECURITY SELF-REVIEW BEFORE DECLARING DONE

Answer each in writing:

1. Can a Planner or Viewer reach any administrative endpoint? (Prove with SEC-02, SEC-03.)
2. Is there any code path that inlines uploaded SVG? (Grep `dangerouslySetInnerHTML`.)
3. Can any client-supplied string influence a filesystem path?
4. Does any audit row or log line contain password material? (Inspect the database directly.)
5. Can two concurrent requests leave zero active admins? (Prove with CX-02.)
6. Does any endpoint return `passwordHash`?
7. Can a suspended or deleted user still log in?
8. Does any administrative page make an external network request?

## REPORTING FORMAT

After each of the 12 steps:

```
## Step N — <name>
Status: complete | blocked
Files: <changed/created>
Tests: <IDs> — N passed, M failed
Verification: typecheck ✓ | lint ✓ | build ✓
Notes: <decisions, surprises>
```

Final:

```
## Phase 14 Complete
Files changed: <list>
Migration: <name>
Tests added: <counts by type>
Security suite: <SEC-01…SEC-18 results>
Hostile SVG fixtures: <N/N rejected>
Verification: typecheck / lint / unit / build / e2e / regression
Regression triage: <each failure, real or pre-existing, with evidence>
Security self-review: <the 8 answers>
Known limitations: <honest list>
ADRs: ADR-030 … ADR-039
Commit: <sha>
```

Be honest. If tests fail, say so with output. If you skipped something, name it and why. Never report done when it is not.

## DEFINITION OF DONE

`09-ACCEPTANCE.md` in full. Summary:

- Migration clean, no backfill
- All quality gates pass, including `npm run build`
- 100% branch coverage on the five pure modules
- **Every hostile SVG fixture rejected; both benign fixtures accepted**
- **Every SEC test passing, none skipped**
- **CX-02 proven:** parallel deactivations cannot reach zero admins
- Suspended and deleted users cannot log in
- No password material anywhere in audit or logs
- Every administrative flow works with the Internet disconnected
- No pre-existing test modified to make new code pass
- The four documentation defects corrected
- Committed and pushed directly to `main` — no pull request

## IF YOU GET STUCK

- Ambiguous → check `FAQ.md`, then `ADR.md`. Still unresolved → **ask**, do not guess.
- Specification appears wrong → stop and explain; do not silently substitute.
- A test seems impossible to satisfy → the implementation is probably wrong; do not weaken the test.
- Tempted to modify an existing test → almost certainly a real regression. Prove otherwise with a baseline worktree first.
- Tempted to skip a security test → **stop.** That is the one thing this phase cannot ship without.

Begin step 1 only after reading every document listed above.
