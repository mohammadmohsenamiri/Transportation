# Phase 15 — FAQ

Definitive answers. If your question is here, the answer is binding — do not re-decide it.

---

## Scope

**Q: Am I building Mission Management from scratch?**
No. It shipped in Phases 7–8: 11 service operations, 9 API routes, 11 UI modules, 9 test files, all in `main` and consumed by Phases 9–13. You are adding terminal states, actual timestamps, concurrency control, mission types and note threads. If you are writing mission creation, stop and re-read `PRE_IMPLEMENTATION_DEPENDENCY_REVIEW.md` §2.

**Q: Why is this Phase 15 when the brief said 14?**
Phase 14 in `IMPLEMENTATION_PLAN.md` is users/icons/settings and was already allocated. The review surfaced the collision; the product owner chose to retitle this work "Mission Lifecycle Completion" and insert it as Phase 15, shifting the former 15–17 to 16–18.

**Q: Can I fix the org-tree / fleet-list pagination problem while I'm here?**
No. Real defect, different module, tracked separately. `CLAUDE.md` §1 — one phase per change.

**Q: The brief mentions attachments. Build them?**
No. They need the upload + sanitisation pipeline Phase 14 builds for `IconAsset`. Building a second one creates a second security surface to audit.

---

## Status model

**Q: What is the difference between persisted and display status?**
`persistedStatus` is a DB column with 6 values. Display status is what `deriveMissionDisplayStatus()` returns — 8 values — computed from the persisted status plus `viewTime`. Only `SCHEDULED` fans out (into `WAITING`/`IN_PROGRESS`/`ARRIVED`); every other value maps 1:1. **State which one you mean in every rule you write.**

**Q: Why must `COMPLETED` and `FAILED` go before the clock comparisons?**
Because a completed mission must read `COMPLETED` at *every* `viewTime`, including a timeline scrub to before its completion. Placing them after the clock logic would make a completed mission display as `WAITING` when scrubbed into the past.

**Q: Isn't `ARRIVED` the same as `COMPLETED`?**
No, and conflating them defeats the phase. `ARRIVED` = the clock passed the ETA (a belief). `COMPLETED` = a human confirmed it (a fact). A mission can display `ARRIVED` and then be marked `FAILED` — edge case E8, which is exactly why this phase exists.

**Q: Should I auto-complete missions when the ETA passes?**
Absolutely not. That would re-create the bug being fixed: asserting a fact the system does not know.

**Q: Why relabel `ARRIVED` to «رسیده (تخمینی)»?**
So an operator can distinguish an estimate from a confirmation at a glance. It is a user-visible change to shipped copy — announce it, and check no existing test asserts the bare «رسیده».

---

## Lifecycle

**Q: Can I complete a mission that hasn't started yet?**
Yes, if `actualArrivalAt ≥ startAt` (edge case E4). An operator may confirm an early arrival. LR-02 is the only time constraint.

**Q: Can `actualArrivalAt` be earlier than `estimatedArrivalAt`?**
Yes. Early and late are both data, not errors (LR-03). Never compare them for validation — only to compute `arrivalVarianceMinutes`.

**Q: Why can't I reopen a cancelled mission?**
Cancellation released its shipments and is a *decision*, not an *outcome*. ADR-018's sanctioned path is cancel-then-duplicate. Reopening would try to resurrect shipments that may now belong elsewhere.

**Q: Why can't I reopen an archived mission directly?**
Unarchive first. Two steps by design, so archiving is a real barrier rather than a speed bump.

**Q: Is completing an already-completed mission idempotent?**
No, deliberately. It returns `MISSION_INVALID_TRANSITION`. Silent idempotency would let a repeat submission quietly overwrite a recorded arrival time.

**Q: What happens to shipments on each transition?**
complete → `DELIVERED`; fail → `WAITING_FOR_DISPATCH` (re-plannable); cancel → `DRAFT` (existing); archive/unarchive → unchanged; reopen → re-acquired as `IN_TRANSIT`. ADR-P15-07.

**Q: Reopen failed with `SHIPMENT_ALREADY_ASSIGNED`. Bug?**
No — LR-13 working. While the mission sat terminal, a shipment was assigned to another mission. ADR-019's unique index prevents stealing it. Surface it in plain Persian.

---

## Concurrency

**Q: Why optimistic instead of a lock?**
Mission editing is user-paced and can span a multi-step wizard. A pessimistic lock held across that would let one abandoned browser tab block a mission indefinitely.

**Q: Then why is the shipment lock pessimistic?**
Different problem. ADR-019 protects a cross-aggregate invariant inside a short server-side transaction with no human in the loop — exactly where pessimistic locking is right. The two coexist.

**Q: Can I use `updatedAt` instead of a `version` column?**
No. Timestamp granularity can collide and clock adjustments make it unreliable. An integer is unambiguous.

**Q: Why `updateMany` instead of `update`?**
Prisma's `update` targets a unique field and cannot express the compound `id + version` predicate. `updateMany` can, and `count === 0` is the conflict signal.

**Q: Can I check the version with a `SELECT` first?**
No. That reintroduces the exact race the mechanism prevents. The check must be in the `UPDATE … WHERE`.

**Q: Do notes need a version?**
No (CC-04). They are append-only — two simultaneous notes are not a lost update. They also do not bump the mission's version.

**Q: What does the user see on a conflict?**
A Persian message explaining someone else changed the mission, plus a reload action. Never a raw 409, never a silent overwrite (CC-06).

---

## Data

**Q: Do I need a backfill?**
No. Every new column is nullable or defaulted. Existing rows stay valid — invariants I-02/I-03/I-05 are implications whose antecedents are false for them.

**Q: Why does `version` default to 0, not 1?**
So existing rows need no backfill. The first mutation moves it to 1.

**Q: Can I remove `ARCHIVED` and re-add it in a better position?**
No. PostgreSQL cannot remove enum values, and `CLAUDE.md` §5 forbids modifying applied migrations. Append only.

**Q: `version` vs `routeVersion` — which do I send from the client?**
`version`. `routeVersion` snapshots which route revision the mission was planned against (ADR-007) and is unrelated to concurrency. This is the single most likely mix-up in the phase.

**Q: Should I migrate `Mission.notes` into `MissionNote`?**
No. It has no author and no timestamp; synthesising them would fabricate audit data. ADR-P15-09.

**Q: Can we roll back after deploy?**
Only before the first mission is completed or failed. After that, rollback would destroy business facts, and PostgreSQL cannot remove enum values. Plan forward-only fixes.

---

## Implementation

**Q: What shape should a new transition follow?**
Exactly `cancelMission`'s: find → not-found check → transition guard → domain guards → `$transaction` (conditional update + set-based side effects) → `logAudit` after commit → return DTO.

**Q: Inside or outside the transaction — where do guards run?**
Guards run before, on the freshly-read snapshot. The conditional version check inside the transaction makes it safe: if anything changed in between, the version no longer matches and the transaction aborts.

**Q: Why is `logAudit` after commit?**
It matches the shipped pattern, and a failed audit write must never roll back a committed business fact (TX-03). Log the audit failure as an operational error instead.

**Q: Can I loop `update` over shipments?**
No. Set-based `updateMany` (P-02). A loop is an N+1.

**Q: Where do Persian labels live?**
`src/lib/domain/mission-labels.ts` — the domain layer, established in Phase 13 precisely so the server can use them without importing UI code.

**Q: Can a server service import from `src/features/**`?**
Never. It drags UI types and transitively the Prisma client into the wrong bundle. Phase 13 hit this: `tsc` passed, the Turbopack build failed. **Run `npm run build`, not just typecheck.**

**Q: `npm run typecheck` passes. Is that enough?**
No. Typecheck cannot catch client/server bundle violations. `npm run build` is mandatory.

---

## Testing

**Q: Why delta-based assertions?**
The shared dev database holds ~1,000 missions. "Counter equals 3" is meaningless; "counter moved by exactly 1" is robust. Proven in Phase 13's suite.

**Q: A regression test fails. Mine or pre-existing?**
Prove it. Create a git worktree at the pre-Phase-15 commit and run the same spec. Identical failure ⇒ pre-existing; cite it. Different ⇒ yours; fix it. Never assert "environmental" without evidence.

**Q: Can I modify an existing test to make my code pass?**
Almost certainly not — that is a regression wearing a disguise. The one legitimate case here is the «رسیده» → «رسیده (تخمینی)» label change, which is a deliberate, documented copy change.

**Q: How do I test concurrency for real?**
Fire two genuinely parallel requests (e.g. `Promise.all` over two API calls) with the same version. Sequential calls pretending to race prove nothing.

**Q: What coverage is required?**
100% branch on `mission-lifecycle.ts` and the extended `deriveMissionDisplayStatus`. They are small, pure, and load-bearing for four phases.

---

## Cross-phase

**Q: Will I break the dashboard?**
Not if you extend `deriveMissionDisplayStatus` correctly. ADR-029 bound the dashboard to that function so its numbers cannot diverge from the map's. Prove it with R-01.

**Q: Do I need to edit map code for new statuses to appear?**
No. If you find yourself editing `maplibre-map-inner.tsx`, you have taken a wrong turn — the status flows through the shared function.

**Q: Do completed missions still show on the live map?**
No. `getMapScene` filters to `persistedStatus: "SCHEDULED"`, so they drop off naturally. Verify this rather than assume it.

**Q: What about a timeline scrub to before completion?**
Still `COMPLETED`. Persisted state is not time-dependent (E12). Documented so it is not mistaken for a bug.

---

## Process

**Q: Do I open a pull request?**
No. Commit and push directly to `main` at the end of the phase.

**Q: What if a specification here is wrong?**
Say so and stop. Explain the problem. Do not silently substitute your own design — the whole point of this pack is that architectural decisions are already made.

**Q: What if something is genuinely ambiguous?**
Check `ADR.md` first. If still unresolved, ask. Do not guess and do not invent a new pattern.

---

## افزوده‌های پس از پیاده‌سازی (۲۰۲۶-۰۸-۰۸)

**پ: چرا نمی‌توانم مأموریتی را که همین الان ساختم تکمیل کنم؟**
چون هنوز شروع نشده است. فاز ۷ زمان شروع را الزاماً در آینده می‌خواهد و LR-01/LR-02 این فاز زمان
رسیدن واقعی را الزاماً در گذشته و پس از زمان شروع. نتیجه ترکیب این دو: **مأموریت تنها پس از
فرارسیدن زمان شروع برنامه‌ریزی‌شده‌اش قابل تکمیل است.** این باگ نیست — نمی‌توان برای مأموریتی که
هنوز حرکت نکرده رسیدن ثبت کرد — ولی چون در هیچ سند این پک صریح نبود، در ADR-031 §۵ ثبت شد.

**پ: چرا `COMPLETED` و `FAILED` در پالایه وضعیت نقشه عملیاتی نیستند؟**
چون `getMapScene` فقط مأموریت‌های `SCHEDULED` را می‌خواند، پس این دو مقدار هرگز در آن فهرست ظاهر
نمی‌شوند و گزینه‌ای که همیشه صفر نتیجه می‌دهد گمراه‌کننده است. تفکیک آن‌ها در فهرست مأموریت‌ها،
جزئیات و فرانما دیده می‌شود (ADR-031 §۴).

**پ: آیا واقعاً باید توکن نسخه را در هر درخواست بفرستم؟**
بله، برای هر عملیات *تغییردهنده* مأموریت — شامل `PATCH` و `cancel` که پیش از این نمی‌خواستند.
حذف آن ۴۲۲ می‌دهد نه موفقیت بی‌صدا (V-03). یادداشت‌ها استثنا هستند (CC-04) و `Mission.version` را
هم جابه‌جا نمی‌کنند.

**پ: تعیین نوع مأموریت روی خود مأموریت کجاست؟**
ستون، سرویس، API و صفحه مدیریتی `/system/mission-types` کامل‌اند و DTO مقدار را برمی‌گرداند، ولی
انتخاب نوع در ویزارد ساخت/ویرایش سیم‌کشی نشد؛ امروز فقط از راه API قابل تنظیم است. در
`PHASE_STATUS.md` به‌عنوان محدودیت شناخته‌شده ثبت است.
