# Phase 15 — 12 — Checklist

Work top to bottom. Every box needs evidence, not a recollection.

---

## وضعیت اجرا (۲۰۲۶-۰۸-۰۸)

باکس‌ها عمداً **تیک نخورده‌اند** — تیک‌زدن یک‌جای همه، ادعایی می‌شد که برای بخشی از بندها شواهد
واقعی ندارم، و این چک‌لیست صراحتاً «شواهد، نه حافظه» می‌خواهد. آنچه واقعاً اجرا و اثبات شد در
`docs/PHASE_STATUS.md` بخش «Phase 15» با عدد و نام تست ثبت است.

**پوشش داده‌شده با شواهد:** کل بند ۲ (پایگاه داده — از جمله بررسی صریح نسخه PostgreSQL این محیط
پیش از تصمیم درباره تقسیم migration)، کل بند ۳ (لایه محض — ۳۶ تست واحد شامل بررسی *جامع* هر جفت
وضعیت/عملیات)، کل بندهای سرویس و API، گذارها و گاردها روی DB واقعی با
`scripts/verify-lifecycle.ts`، همروندی واقعی با `Promise.all` (CX-01/CX-02)، و سازگاری با فازهای
۱۰ تا ۱۳ (R-01/R-02).

**پوشش داده‌نشده یا جزئی — به‌صراحت:**

- **انتخاب نوع مأموریت در ویزارد ساخت/ویرایش سیم‌کشی نشد.** ستون، سرویس، API و صفحه مدیریتی
  کامل‌اند و DTO مقدار را برمی‌گرداند، ولی امروز فقط از راه API قابل تنظیم است.
- `CX-03` (تغییر موازی نقش‌ها)، `CX-05` (جایگزینی حین خواندن) و `CX-06` (بازنشانی در برابر ویرایش)
  پوشش خودکار ندارند؛ مسیرشان همان قفل/نسخه‌ای را دارد که CX-01/CX-02 اثبات می‌کنند، ولی این
  استنتاج است نه شاهد.
- `E-14` (تعارض دو تب)، `E-15` و `E-16` (پیمایش کامل با کیبورد) خودکار نشدند.
- بند `AX` به‌جز اندازه ۴۴ پیکسلی دکمه‌های چرخه عمر و نبود اسکرول افقی صفحه: کنتراست WCAG AA و
  `aria-live` برای اعلام تغییر وضعیت **اندازه‌گیری نشدند**.
- بند «captured performance baselines» پیش از تغییر انجام نشد؛ هیچ اندازه‌گیری کمی از
  `P-01`…`P-05` در دست نیست.

---

## 1. Before writing code

- [ ] Read `PRE_IMPLEMENTATION_DEPENDENCY_REVIEW.md` — especially §2, what already ships
- [ ] Read `00-README.md` … `11-OUT_OF_SCOPE.md` in order
- [ ] Confirm every dependency in `01-SCOPE.md` §4 exists in the working tree
- [ ] Read `src/server/services/mission-service.ts` — `cancelMission` is the shape to copy
- [ ] Read `src/lib/domain/mission-rules.ts` — the function about to be extended
- [ ] Read the shipped `missions.spec.ts` to learn the fixture conventions
- [ ] **Capture performance baselines** (dashboard summary, map scene) before changing anything
- [ ] Confirm you are on a branch off current `main`

## 2. Database

- [ ] `COMPLETED`, `FAILED` appended to `MissionPersistedStatus` (**appended**, not reordered)
- [ ] `MissionFailureClassification` created
- [ ] Mission columns added, all nullable or defaulted
- [ ] `MissionType` model created, matching the `VehicleType` shape
- [ ] `MissionNote` model created
- [ ] Indexes per `07-DATABASE.md` §4
- [ ] Migration runs clean on a copy of the real database
- [ ] Verified: no backfill needed; every existing row still satisfies §5 invariants
- [ ] Verified: PostgreSQL allows using the new enum values in the same migration — if not, split into two
- [ ] `prisma generate` run and committed

## 3. Pure domain

- [ ] `mission-lifecycle.ts` created: `MISSION_TRANSITIONS`, `canTransition`, `assertTransitionAllowed`, `resolveTargetStatus`, guards
- [ ] Transition table is a frozen module-level constant
- [ ] No import of Prisma, React or anything from `src/features/**`
- [ ] `mission-labels.ts` extended with the two new labels
- [ ] `ARRIVED` relabelled «رسیده (تخمینی)»
- [ ] `deriveMissionDisplayStatus` extended — new branches placed **before** all clock comparisons
- [ ] `simulateMissionPosition` freeze extended to `COMPLETED`/`FAILED`
- [ ] **No position/geometry maths altered**
- [ ] All `L`, `G`, `D`, `S` tests written and green
- [ ] **All pre-existing `mission-rules` and `mission-simulation` tests still pass unmodified**
- [ ] 100% branch coverage on the two extended functions

## 4. Services

- [ ] `updateMissionGuarded` helper — version check in the `WHERE`, never a prior `SELECT`
- [ ] `completeMission` — guards, transaction, shipments → `DELIVERED`, audit after commit
- [ ] `failMission` — shipments → `WAITING_FOR_DISPATCH`
- [ ] `archiveMission` — stores `statusBeforeArchive`
- [ ] `unarchiveMission` — restores it exactly
- [ ] `reopenMission` — clears terminal facts, re-acquires shipments, maps unique-violation to `SHIPMENT_ALREADY_ASSIGNED`
- [ ] Existing `updateMission` and `cancelMission` now require `version`
- [ ] Every transition writes audit with a `mission.*` action name
- [ ] Shipment side effects are set-based `updateMany`, never a loop
- [ ] Guards re-evaluated inside the transaction
- [ ] `logAudit` after commit, never inside
- [ ] Note service: create, list, soft-delete with author-or-admin authorisation **in the service**
- [ ] Mission-type service with in-use deletion guard
- [ ] All `I` and `X` tests green — including a genuinely parallel X-01

## 5. API

- [ ] Zod schema per endpoint in `src/lib/validation/mission-lifecycle.ts`
- [ ] Routes: `complete`, `fail`, `archive`, `unarchive`, `reopen`, `notes`, `mission-types`
- [ ] Every route calls `requireActor([ADMIN, MISSION_PLANNER])` (mission-types write: Admin only)
- [ ] Domain error codes mapped to HTTP per `04-ARCHITECTURE.md` §6
- [ ] Every error message is Persian; field errors populated where applicable
- [ ] `MissionDTO` extended; `arrivalVarianceMinutes` **derived on read**, not stored
- [ ] `GET /missions` accepts the new status filter values
- [ ] `/missions/summary` gains `completed` and `failed`
- [ ] All `A` tests green

## 6. Client & UI

- [ ] Query hooks for each transition, with cache invalidation
- [ ] Client stores and echoes `version` on every mutation
- [ ] Complete dialog: Jalali date-time picker, optional departure
- [ ] Fail dialog: reason textarea + classification select
- [ ] Reopen dialog: reason, with a clear warning about shipment re-acquisition
- [ ] Archive/unarchive confirmations
- [ ] Note thread: add, list newest-first, delete
- [ ] Planned vs actual times shown side by side with a labelled variance
- [ ] New badges everywhere status appears: list, detail, operational table, map panel, dashboard
- [ ] **Conflict (409) rendered as a recoverable state with a reload action** — never a raw error, never a silent overwrite
- [ ] No lifecycle control rendered for Status Viewer
- [ ] Mission-type admin page under `/system/`
- [ ] All `E` tests green on four viewports

## 7. Accessibility

- [ ] Every action keyboard-reachable; visible focus ring
- [ ] `Escape` closes every dialog; focus returns to the trigger
- [ ] Touch targets ≥ 44×44
- [ ] Status conveyed by icon + label, never colour alone
- [ ] WCAG AA contrast for new badges in **both** themes
- [ ] Confirmations name the mission
- [ ] Errors linked via `aria-describedby`
- [ ] Status changes announced through a bounded `aria-live`
- [ ] Logical CSS properties only
- [ ] Timestamps/codes `dir="ltr"` inside RTL
- [ ] Long Persian text (500-char reason, 2000-char note) does not break layout

## 8. Cross-phase regression

- [ ] R-01 — map and dashboard agree on the same mission at the same instant
- [ ] R-02 — completed missions leave the live scene query
- [ ] R-03 — dashboard distribution still sums to the mission total
- [ ] R-04 — `ARRIVED` and `COMPLETED` visibly and numerically distinct
- [ ] R-05 — timeline scrub does not resurrect a terminal mission
- [ ] R-06 — Phase 11 filters handle the new statuses
- [ ] R-07 — **every pre-Phase-15 test passes unmodified**
- [ ] R-08 — Phase 13 drill-down still works
- [ ] Any pre-existing failure re-verified against a baseline worktree before being called pre-existing

## 9. Performance

- [ ] P-01 … P-05 measured against the baselines captured in §1
- [ ] `EXPLAIN` confirms index scans for list-by-status
- [ ] No N+1 introduced

## 10. Verification

- [ ] `npm run typecheck` clean
- [ ] `npm run lint` — **zero errors**
- [ ] `npm run test` — all unit tests pass
- [ ] **`npm run build` succeeds** — mandatory; typecheck alone missed a client/server bundle violation in Phase 13
- [ ] New e2e suite green on all four viewports
- [ ] Full regression suite run; every failure triaged as real or pre-existing **with evidence**
- [ ] Manual checks in `09-ACCEPTANCE.md` §6, including the internet-disconnected run

## 11. Documentation

- [ ] `PHASE_STATUS.md` Phase 15 entry following the established template
- [ ] `README.md` status line and feature list updated
- [ ] ADR-P15-01 … ADR-P15-09 recorded in `docs/DECISIONS.md`
- [ ] This pack's `00-README.md` marked superseded if implementation diverged
- [ ] Known limitations recorded honestly
- [ ] The «رسیده (تخمینی)» copy change called out explicitly

## 12. Release

- [ ] Migration rehearsed on a database copy
- [ ] **Team informed this is forward-only** once any mission is completed
- [ ] Breaking client change (`version` now required) confirmed to affect no other consumer
- [ ] Demo scenarios D1–D6 rehearsed
- [ ] Commit and push directly to `main` — no pull request
- [ ] Summary: changed files, migrations, tests, remaining limits
