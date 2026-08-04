# برنامه فازبندی پیاده‌سازی برای Claude

## روش اجرا

- فقط یک فاز در هر branch/PR یا تغییر مستقل.
- قبل از شروع، `PHASE_STATUS.md` و تصمیمات را بخوان.
- معیارهای خروج همان فاز را کامل کن؛ سپس status، تصمیمات جدید و دستورهای تست را ثبت کن.
- feature ناقص را پشت UI ظاهراً فعال قرار نده؛ در صورت نیاز feature flag داخلی و label واضح استفاده شود.

## Phase 0 — Bootstrap و قراردادهای پایه

### خروجی

- Next.js App Router + TypeScript strict + React + Tailwind
- ESLint/Prettier، aliasها، ساختار پوشه
- Vazirmatn local، `lang=fa`, `dir=rtl`
- theme روشن/تیره با tokenها و persistence
- Vitest و Playwright skeleton
- `.env.example`, `.gitignore`, health endpoint و README commands
- CI محلی/گیت‌هاب برای lint، typecheck، test و build در صورت دسترسی

### پذیرش

صفحه پایه در 360/768/1440، RTL و هر دو theme کار کند و runtime request خارجی نداشته باشد.

## Phase 1 — PostgreSQL، Prisma، Auth، RBAC و Audit

- Prisma و migration اولیه
- User/Role/UserRole/Session/AuditLog
- seed فقط roleهای سیستمی و Admin اولیه از env؛ بدون داده business خودرو/دفتر
- login/logout/change password/first login
- protected routes و permission service
- audit service و testهای bypass API

## Phase 2 — Design System و Shell

- Button/Input/Select/Combobox/DateTime/Modal/Sheet/Toast/Badge/Table/Empty/Error/Skeleton
- dashboard shell، sidebar role-based، header و responsive navigation
- Jalali date-time picker با storage UTC
- touch target و accessibility baseline
- صفحات placeholder فقط برای فازهای نزدیک و با label «در دست توسعه»، نه feature جعلی

## Phase 3 — ساختار سازمانی چهارسطحی

- مدل و CRUD OrganizationUnit
- tree view، search، create/edit sheet و map coordinate picker
- validation parent level/cycle/soft delete
- marker preview و icon assignment
- permission و audit test

## Phase 4 — Catalogها، خودرو و آیکن

- VehicleType و CargoType بدون seed business
- Vehicle CRUD، readiness، validation عددی و overlap-ready query
- IconAsset upload/sanitize/library
- filter و pagination server-side
- صفحات touch و responsive

## Phase 5 — Provider نقشه و Map Foundation

- MapLibre GL JS lazy client component
- Provider abstraction و Admin settings
- internal TMS/XYZ و external XYZ optional
- local asset bundling، CSP، health test و fallback provider
- نمایش دفاتر/انبارها، layer toggle، clustering و fit bounds
- تست قطع اینترنت با Provider داخلی

## Phase 6 — Route Management

- Route/RoutePoint models و versioning
- CSV preview/validation/confirm/export
- route drawing با click/tap، undo/redo/finish
- محاسبه distance و cumulative distance
- list/detail/duplicate/deactivate
- unit test برای Haversine، sequence، duplicate و boundary coordinates

## Phase 7 — Shipment Management

- Shipment model و CargoType integration
- tracking code generation
- فرم مقصد سازمانی یا مختصات آزاد
- lifecycle ابتدایی، list/filter/detail/history
- جلوگیری از تغییر ناسازگار مبدأ/مقصد پس از مأموریت فعال

## Phase 8 — Mission Planning

- Mission/MissionShipment schema
- create form مستقل و wizard داخل map
- vehicle availability و overlap detection
- route موجود/import/drawing/direct fallback
- estimate endpoint برای distance/ETA/fuel
- draft، publish، cancel، duplicate
- snapshot speed/origin/destination/route version و transaction کامل

## Phase 9 — Position Engine و Time Reconstruction

- تابع pure مشترک domain برای position/progress/ETA/status
- route interpolation و direct dashed fallback
- تست‌های مرزی قبل شروع، لحظه شروع، وسط segment، ETA، بعد ETA، cancel، مسیر صفر/نامعتبر
- server/client parity test
- `/map/scene` و lazy geometry endpoint
- جلوگیری از persist موقعیت در tick

## Phase 10 — Map Operations Workspace

- vehicle markers و direction bearing
- sync انتخاب map/table با `selectedMissionId`
- detail card، route highlight، origin/destination highlight
- فیلترهای مبدأ، مقصد، نوع خودرو، status، start/ETA و search
- context action روی مبدأ/مقصد
- virtualized mission table
- mobile bottom sheets و tablet drawer

## Phase 11 — Time Scrubber

- Live/Historical state machine
- Jalali day selection، slider، play/pause، step، return to live
- client position animation و reduced motion
- query window management و timezone tests
- badge واضح حالت تاریخی و label تقریبی

## Phase 12 — فرانمای وضعیت

- KPI query service با تعریف واحد
- کارت‌های خودرو، مرسوله و مأموریت
- chartهای وضعیت، نوع خودرو، روند و هشدار
- filter بازه، drill-down و timestamp
- cache داخلی کوتاه‌عمر اختیاری بدون stale مبهم

## Phase 13 — Hardening، عملیات و ظرفیت

- تست کامل RBAC، CSRF، XSS، upload، URL provider و audit
- offline acceptance test و production Docker/operations guide
- backup/restore scripts و health/readiness
- database indexes، map payload budget، load test
- Playwright matrix در desktop/tablet/mobile و touch
- accessibility، RTL visual regression و reduced motion

## Phase 14 — UAT و Release Candidate

- اجرای سناریوهای end-to-end سند تست
- اصلاح blockerها بدون افزودن feature جدید
- seed demo فقط در profile توسعه و جدا از production seed
- راهنمای کاربر/Admin داخل repo
- release checklist، migration/rollback و sign-off مالک محصول

## فرمان‌های استاندارد مورد انتظار

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run db:format
npm run db:generate
npm run db:migrate -- --name <name>
npm run db:seed
```

اگر script هنوز در فاز جاری ایجاد نشده، Claude باید آن را در همان فاز مرتبط اضافه کند و `package.json` را منظم نگه دارد.

## بودجه‌های فنی اولیه

- initial JS صفحه login و dashboard تا حد ممکن کوچک؛ MapLibre فقط در صفحه map lazy-load شود.
- `/map/scene` برای 2,000 مأموریت فعال، geometry کامل همه مسیرها را ارسال نکند.
- p95 queryهای list/dashboard روی شبکه داخلی و dataset تست هدف زیر 500ms؛ map scene زیر 1s. اعداد در Phase 13 اندازه‌گیری و در صورت عدم تحقق مستند شوند.
- interaction اصلی UI زیر 100ms و animation بدون jank روی تبلت میان‌رده.
