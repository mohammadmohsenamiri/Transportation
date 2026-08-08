# Phase 14 — 12 — Checklist

Work top to bottom. Every box needs evidence, not recollection.

---

## وضعیت اجرا (۲۰۲۶-۰۸-۰۸)

باکس‌ها عمداً **تیک نخورده‌اند**. تیک‌زدن یک‌جای همه، ادعایی می‌شد که برای بخشی از بندها شواهد
واقعی ندارم — و این چک‌لیست صراحتاً «شواهد، نه حافظه» می‌خواهد. آنچه واقعاً اجرا و اثبات شد در
`docs/PHASE_STATUS.md` بخش «Phase 14» با عدد و نام تست ثبت شده است:

**پوشش داده‌شده با آزمون خودکار:** کل بند ۲ (لایه محض — ۹۶ تست واحد شامل ۱۸ فیکسچر SVG خصمانه)،
کل بند ۳ (سرویس‌ها)، کل بند ۴ (API — ۱۹ endpoint، هر سه حالت نقش روی تک‌تکشان)، مجموعه امنیتی
SEC-01…SEC-12 و SEC-14…SEC-18، همروندی CX-01/CX-02/CX-04، و بندهای E-01…E-13 و OF-02 روی هر چهار
عرض (۱۴۴ تست e2e).

**پوشش داده‌نشده یا جزئی — به‌صراحت:**

- `SEC-13` (zip bomb / ابعاد اغراق‌شده): کران ابعاد PNG در تست واحد اثبات شده، ولی فایل zip bomb
  واقعی ساخته و آزموده نشد.
- `CX-03`, `CX-05`, `CX-06`: پوشش خودکار ندارند؛ مسیرهایشان همان قفل/نسخه‌ای را دارند که
  CX-01/CX-02/CX-04 اثبات می‌کنند، ولی این استنتاج است نه شاهد.
- `E-14`, `E-15`, `E-16` (تعارض دو تب، ساخت کاربر فقط با کیبورد، دسترسی کیبوردی به بارگذاری):
  فقط `AX-10` (بستن پنجره با Escape) خودکار شد.
- بند `AX` به‌جز `AX-01`, `AX-05`, `AX-10`: کنتراست WCAG AA، اندازه ۴۴ پیکسلی هر target لمسی و
  `aria-describedby` تک‌تک فیلدها **اندازه‌گیری نشدند**.
- `OF-01`, `OF-03`, `OF-04`: فقط `OF-02` (صفر درخواست بیرونی) خودکار شد.
- صفحه جزئیات/پروفایل کاربر اصلاً ساخته نشد (در `PHASE_STATUS.md` به‌عنوان محدودیت ثبت شده است).

---

## 1. Before writing code

- [ ] Read `PRE_IMPLEMENTATION_REVIEW.md` in full — especially §1 (four brief-vs-repo conflicts) and §7 (ten rulings)
- [ ] Read `00-README.md` … `11-OUT_OF_SCOPE.md` in order
- [ ] Confirm every dependency in `01-SCOPE.md` §4 exists in the working tree
- [ ] Read `src/server/services/permission-service.ts` — confirm authorization is role-based only
- [ ] Read `src/app/api/v1/routes/import-csv/route.ts` — the upload pattern to copy
- [ ] Read `src/server/services/vehicle-service.ts` — the service shape to mirror
- [ ] Confirm `grep -i icon prisma/schema.prisma` returns nothing (the doc claims otherwise; the code is truth)
- [ ] Capture performance baselines (map scene, dashboard) before changing anything
- [ ] Branch off current `main`

## 2. Database

- [ ] `IconCategory` enum created
- [ ] `User` gains `displayName`, `deletedAt`, `lastLoginAt`, `suspendedAt`, `suspensionReason`, `version` — all nullable or defaulted
- [ ] `IconAsset` created with relative `storagePath` and indexed `sha256`
- [ ] `SystemSetting` created with `key` as primary key
- [ ] `iconAssetId` + index added to `OrganizationUnit`, `VehicleType`, `Vehicle`, each `onDelete: SetNull`
- [ ] `@@index([isActive, deletedAt])` on `User` — the last-admin guard depends on it
- [ ] Migration runs clean against a copy of the real database
- [ ] Verified: **no backfill needed**; every existing user still valid
- [ ] `ICON_ROOT` created at startup, **gitignored**, outside `public/`
- [ ] `prisma generate` run and committed

## 3. Pure domain

- [ ] `user-rules.ts`: `deriveUserStatus`, `validateUsername`, `validatePassword`, `wouldLeaveNoActiveAdmin`
- [ ] `settings-registry.ts`: every key from `06-API.md` §7 with type, default, env var, validator, runtime effect, Persian label
- [ ] `svg-analyzer.ts`: rejects every construct in `02-REQUIREMENTS.md` §4.3
- [ ] `png-dimensions.ts`: IHDR parse, **no dependency**
- [ ] `icon-rules.ts`: `validateIconFile`, `resolveIcon`
- [ ] `jalali.ts` gains an **optional** offset parameter defaulting to the existing Tehran constant
- [ ] No import of Prisma, React, or anything from `src/features/**` in any of the above
- [ ] All U / I / S tests green
- [ ] **Every hostile SVG fixture (I-09…I-24) rejected**
- [ ] **Both benign SVG fixtures (I-25, I-26) accepted**
- [ ] 100% branch coverage on all five pure modules
- [ ] **All pre-existing `jalali` tests pass unmodified**

## 4. Services

- [ ] `settings-service` with per-process cache and write invalidation
- [ ] Registry validated at startup: every key has default + validator + label; **no key looks like a secret**
- [ ] `user-service`: create, update, activate, deactivate, suspend, unsuspend, soft-delete, restore, reset password, replace roles, list, get
- [ ] `assertActiveAdminRemains` runs **inside** the transaction, after the mutation, with `FOR UPDATE`
- [ ] Session revocation inside the same transaction as deactivate / suspend / delete / password reset
- [ ] Optimistic concurrency: version in the `UPDATE … WHERE`, never a prior `SELECT`
- [ ] Audit payloads are **field-allowlisted** — never a whole-entity spread
- [ ] **No password, hash or secret in any audit field**
- [ ] `icon-service`: validate fully → write file → create row → compensating delete on failure
- [ ] `resolveIconPath` guards with both a UUID regex and a `realpath` containment assertion
- [ ] `audit-query-service`: filtered, paginated, read-only
- [ ] All IU / II / IS / CX tests green, including a genuinely parallel CX-02

## 5. API

- [ ] Zod schema per endpoint
- [ ] **Every administrative route calls `requireActor([ADMIN])` before reading the body**
- [ ] `GET /icons/[id]/content` allows all three authenticated roles — the only exception
- [ ] Icon content response sets `Content-Type`, `nosniff`, CSP `default-src 'none'; sandbox`, `Content-Disposition: inline`, immutable `Cache-Control`, `ETag`
- [ ] Every list endpoint paginated
- [ ] Domain error codes mapped to HTTP per `04-ARCHITECTURE.md` §7
- [ ] All messages Persian; `fieldErrors` populated
- [ ] **`passwordHash` absent from every response**
- [ ] Batch settings write is all-or-nothing
- [ ] One audit entry per changed setting key, not one per batch
- [ ] **No mutating route exists at any `/audit` path**
- [ ] All SEC tests green — none skipped

## 6. UI

- [ ] `/system/users`: paginated list, filters, create/edit sheet, lifecycle actions, role assignment, confirmations
- [ ] Read-only role→capability matrix derived from code
- [ ] `/system/icons`: gallery, upload with preview on light **and** dark, replace, delete/restore, assignment
- [ ] `/system/settings`: grouped, typed controls, per-field validation, reset, env-locked fields read-only with reason
- [ ] `/system/audit`: filters, pagination, Jalali timestamps
- [ ] Icon rendering wired into the existing map marker layer with the circle as fallback
- [ ] **`dangerouslySetInnerHTML` appears nowhere in this phase** — grep to confirm
- [ ] **Uploaded SVG rendered only via `<img src>`**, including previews
- [ ] Conflict (409) rendered as a recoverable state with a reload action
- [ ] Client components receive pre-resolved plain data — **no server module imported into `"use client"`**
- [ ] All E tests green on four viewports

## 7. Accessibility, RTL, touch

- [ ] Every action keyboard-reachable; focus visible; `Escape` closes dialogs; focus returns to trigger
- [ ] Touch targets ≥ 44×44
- [ ] **No hover-only affordance**
- [ ] File upload focusable and activatable by keyboard
- [ ] Tables become cards below `md`; permission matrix scrolls in its own container
- [ ] LTR technical values (`username`, IP, filename, hash, UUID) wrapped `dir="ltr"`
- [ ] Persian digits and Jalali dates throughout
- [ ] Mixed Persian display name + LTR username in one row renders correctly
- [ ] Long text (64-char name, 500-char reason) does not break layout
- [ ] Status by icon + label, never colour alone
- [ ] WCAG AA contrast in both themes
- [ ] Errors linked via `aria-describedby`
- [ ] Logical CSS properties only
- [ ] All AX tests green

## 8. Security verification

- [ ] SEC-01…SEC-18 all green, none skipped
- [ ] Every admin endpoint returns 403 for Planner **and** Viewer
- [ ] Privilege escalation attempt fails
- [ ] IDOR attempt returns 403, not 404
- [ ] Path traversal via filename writes nothing outside `ICON_ROOT`
- [ ] Path traversal via content URL returns 404
- [ ] MIME-spoofed upload rejected by content inspection
- [ ] **Audit rows inspected directly in the database contain no password material**
- [ ] Rate limiting active on admin mutations

## 9. Cross-phase regression

- [ ] R-01 — existing auth suite passes unmodified
- [ ] R-02 — map renders unchanged with no icons assigned
- [ ] R-03 — dashboard, timeline, mission suites unaffected
- [ ] R-04 — all existing date tests pass unmodified after the `jalali.ts` change
- [ ] R-05 — **no soft-deleted user appears anywhere** in any existing query
- [ ] Login now rejects suspended and deleted users (a required change to the shipped flow)
- [ ] Any failure re-verified against a baseline worktree before being called pre-existing

## 10. Performance

- [ ] Measured against the baselines captured in §1
- [ ] Map scene build performs **no additional query**
- [ ] Settings cache hit performs zero queries
- [ ] `EXPLAIN` confirms index use for the user list and last-admin guard
- [ ] No N+1 introduced

## 11. Verification

- [ ] `npm run typecheck` clean
- [ ] `npm run lint` — **zero errors**
- [ ] `npm run test` — all unit tests pass
- [ ] **`npm run build` succeeds** — mandatory; typecheck alone missed a client/server bundle violation in Phase 13
- [ ] New e2e suites green on all four viewports
- [ ] Full regression suite run; every failure triaged as real or pre-existing **with evidence**
- [ ] Manual checks in `09-ACCEPTANCE.md` §6, including the Internet-disconnected run

## 12. Documentation

- [ ] `PHASE_STATUS.md` Phase 14 entry following the established template
- [ ] `README.md` status line and route list updated
- [ ] ADR-030 … ADR-039 recorded in `docs/DECISIONS.md`
- [ ] **The four documentation defects corrected** (`PRE_IMPLEMENTATION_REVIEW.md` §6): the two `iconAssetId` claims in `PHASE_STATUS.md`, the `IconCategory` mapping note, and the `SystemSetting` addition to `ARCHITECTURE_AND_DATA_MODEL.md`
- [ ] Known limitations recorded honestly

## 13. Release

- [ ] Migration rehearsed on a database copy
- [ ] `ICON_ROOT` exists, is writable, is gitignored, and is added to the backup routine
- [ ] **Team informed this is forward-only** once administrative data exists
- [ ] Demo scenarios D1–D7 rehearsed
- [ ] Commit and push directly to `main` — no pull request
- [ ] Summary: changed files, migrations, tests, remaining limits
