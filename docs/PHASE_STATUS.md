# وضعیت فازهای پیاده‌سازی

آخرین به‌روزرسانی: 2026-08-06 (Phase 8)

## خلاصه وضعیت

برآورد حجم نسبی هر فاز (نه زمان تقویمی) برای کمک به برنامه‌ریزی مالک محصول: `S` کوچک، `M` متوسط، `L` بزرگ/پرریسک.

| فاز | عنوان | خروجی قابل مشاهده | وضعیت | برآورد حجم | یادداشت |
|---:|---|---|---|:---:|---|
| 0 | پیش‌نمایش قابل کلیک و هویت بصری | فرانمای وضعیت و نقشه prototype در موبایل/تبلت/دسکتاپ | DONE | M | اولین فاز اجرایی؛ بدون DB |
| 1 | اجرای واقعی برنامه، ورود و پوسته محافظت‌شده | ورود واقعی، تغییر رمز و navigation نقش‌محور | DONE | M | — |
| 2 | ساختار سازمانی چهارسطحی | CRUD واقعی دفاتر و انبارها در نمای درختی | DONE | S | — |
| 3 | انواع خودرو، نوع بار و ناوگان | صفحه واقعی مدیریت خودرو و آمار آمادگی | DONE | S | — |
| 4 | نقشه داخلی و نمایش دفاتر و انبارها | نقاط سازمانی روی Map Provider داخلی | DONE | L | Demo 1؛ بالاترین ریسک فنی (اتصال Provider داخلی) |
| 5 | مدیریت مسیر، CSV و ترسیم روی نقشه | import/export CSV و ترسیم مسیر با Click/Tap | DONE | M | ADR-020 |
| 6 | تعریف مرسوله و مقصد | ثبت مرسوله و preview مبدأ/مقصد روی نقشه | DONE | S | — |
| 7 | برنامه‌ریزی مأموریت از فرم | ساخت Draft، تخمین و انتشار مأموریت | DONE | M | ADR-018/019/021 |
| 8 | تعریف مأموریت از داخل نقشه | ساخت و انتشار مأموریت بدون ترک نقشه | DONE | M | Demo 2 |
| 9 | موتور موقعیت تقریبی | لایه محاسباتی pure (بدون UI) — Development Pack کامل در `docs/phase-09-simulation-engine/` | NOT_STARTED | M | بدون UI، طبق ADR-024 |
| 10 | نقشه عملیاتی پایه و حرکت خودروها | خودروهای مأموریت‌دار در موقعیت تقریبی روی نقشه | NOT_STARTED | L | Demo 3 |
| 11 | جدول مأموریت، انتخاب متقابل و فیلترها | همگام‌سازی نقشه/جدول و فیلترهای عملیاتی | NOT_STARTED | M | — |
| 12 | سیکر زمان زنده و تاریخی | بازسازی وضعیت ناوگان در زمان دلخواه | NOT_STARTED | M | — |
| 13 | فرانمای وضعیت مدیریتی | KPIهای واقعی و drill-down | NOT_STARTED | S | Demo 4 |
| 14 | مدیریت کاربران، آیکن‌ها و تنظیمات تکمیلی | کاربران، نقش‌ها، آیکن سفارشی و audit viewer | NOT_STARTED | M | — |
| 15 | ریسپانسیو، Touch و دسترس‌پذیری نهایی | اجرای کامل جریان‌ها روی موبایل و تبلت | NOT_STARTED | L | — |
| 16 | اجرای بدون اینترنت، امنیت، عملیات و ظرفیت | نسخه production قابل اجرا فقط در LAN | NOT_STARTED | L | — |
| 17 | UAT و Release Candidate | نسخه قابل نصب، راهنما، گزارش UAT و rollback | NOT_STARTED | M | Release Candidate |

## نقاط تحویل

- **Demo 0 — Phase 0:** ظاهر و ساختار کامل محصول قابل مشاهده است.
- **Demo 1 — Phase 4:** کاربر وارد می‌شود، دفاتر و خودروها را مدیریت می‌کند و نقاط را روی نقشه داخلی می‌بیند.
- **Demo 2 — Phase 8:** مسیر، مرسوله و مأموریت از فرم و نقشه ساخته می‌شوند.
- **Demo 3 — Phase 10:** حرکت تقریبی خودروهای واقعی مأموریت روی نقشه نمایش داده می‌شود.
- **Demo 4 — Phase 13:** نقشه عملیاتی، timeline و داشبورد مدیریتی قابل ارائه‌اند.
- **Release Candidate — Phase 17:** نسخه برای UAT و استقرار شبکه داخلی آماده است.

## مقادیر مجاز وضعیت

- `NOT_STARTED`
- `IN_PROGRESS`
- `BLOCKED`
- `DONE`

فقط یک فاز می‌تواند در یک زمان `IN_PROGRESS` باشد. شروع فاز بعد پیش از `DONE` شدن فاز جاری، جز در branch آزمایشی بدون merge، مجاز نیست.

## قالب به‌روزرسانی هر فاز

برای هر فاز، زیر این بخش یک رکورد با قالب زیر اضافه شود:

```text
### Phase N — <title>
Status:
Started:
Completed:
Visible output URL:
Demo account/data:
Branch/PR/Commit:
Migrations:
Key files:
Tests executed:
Manual demo steps:
Offline/network verification:
Known limitations:
Deferred items:
Decisions added/changed:
```

### Phase 0 — پیش‌نمایش قابل کلیک و هویت بصری

Status: DONE
Started: 2026-08-04
Completed: 2026-08-04
Visible output URL: `/prototype/overview`، `/prototype/map` (پس از `npm run dev`، آدرس محلی `http://localhost:3000`؛ `/` در این فاز به‌صورت خودکار به `/prototype/overview` هدایت می‌شد — از Phase 1 که ورود واقعی اضافه شد این ریدایرکت باید به `/dashboard` تغییر می‌کرد اما فراموش شده بود؛ در جریان کار روی Phase 8 اصلاح شد و اکنون `/` کاربر واردنشده را نهایتاً به `/login` می‌رساند)
Demo account/data: بدون حساب کاربری؛ داده‌ها fixture ثابت در `src/demo/fixtures.ts` با برچسب «پیش‌نمایش رابط»
Branch/PR/Commit: مستقیم روی `main`
Migrations: ندارد (بدون DB در این فاز)
Key files: `src/app/layout.tsx`، `src/app/globals.css`، `src/app/prototype/*`، `src/components/layout/*`، `src/components/theme/*`، `src/components/ui/*`، `src/components/map/*`، `src/components/data-table/mission-table.tsx`، `src/demo/fixtures.ts`، `src/app/api/v1/health/route.ts`
Tests executed: `npm run typecheck`، `npm run lint`، `npm run test` (۴ تست Vitest)، `npm run build`، `npx playwright test` (۱۲ تست در ۴ viewport: 360/768/1024/1440 — همه موفق پس از تغییر webServer به build+start برای حذف race شرط hydration روی dev server)
Manual demo steps: اجرای `npm run dev`؛ ورود به `/prototype/overview`؛ تغییر theme با دکمه بالای هدر؛ تغییر عرض مرورگر بین 360 تا 1440؛ ورود به `/prototype/map`؛ کلیک روی marker خودرو برای باز شدن کارت جزئیات؛ کلیک دکمه پخش سیکر زمان برای مشاهده حرکت نمایشی نوار زمان.
Offline/network verification: بررسی `read_network_requests` در مرورگر نشان داد تمام درخواست‌ها (فونت Vazirmatn به‌صورت woff2، chunkهای JS/CSS) فقط به `localhost` هستند؛ هیچ درخواستی به CDN یا دامنه خارجی ارسال نشد.
Known limitations: نقشه `/prototype/map` کاملاً تزئینی و غیرجغرافیایی است (طبق دامنه فاز)؛ سیکر زمان و فیلترها غیرعملیاتی‌اند؛ آیتم‌های منوی غیرفعال (مأموریت‌ها، مرسوله‌ها، مسیرها، ناوگان، ساختار سازمانی، تنظیمات) با برچسب «به‌زودی» غیرفعال نگه داشته شدند.
Deferred items: پیاده‌سازی واقعی صفحات فوق در فازهای 1 تا 14 طبق `IMPLEMENTATION_PLAN.md`.
Decisions added/changed: ندارد (تصمیمات معماری این فاز محدود به انتخاب Next.js 16.3 / React 19.2 پایدار در زمان اجرا بود؛ بدون ADR جدید)

### Phase 1 — اجرای واقعی برنامه، ورود و پوسته محافظت‌شده

Status: DONE
Started: 2026-08-04
Completed: 2026-08-04
Visible output URL: `/login`، `/change-password`، `/dashboard` (پس از `npm run dev`، `http://localhost:3000`)
Demo account/data: کاربر Admin اولیه از `SEED_ADMIN_USERNAME`/`SEED_ADMIN_PASSWORD` در `.env` توسط `npm run db:seed` ساخته می‌شود؛ بدون داده تجاری پیش‌فرض
Branch/PR/Commit: مستقیم روی `main`
Migrations: `prisma/migrations/20260804165252_init` — مدل‌های `User`، `Role`، `UserRole`، `Session`، `AuditLog` و enum `RoleCode`
Key files: `prisma/schema.prisma`، `prisma/seed.ts`، `prisma.config.ts`، `src/lib/db/prisma.ts`، `src/lib/security/*`، `src/lib/permissions/roles.ts`، `src/lib/auth/*`، `src/lib/http/*`، `src/server/services/*`، `src/app/login/*`، `src/app/change-password/*`، `src/app/(dashboard)/*`، `src/app/api/v1/auth/me/route.ts`، `src/proxy.ts`، `src/components/layout/*` (تعمیم‌یافته برای بازاستفاده)
Tests executed: `npm run typecheck`، `npm run lint`، `npm run test` (۱۰ تست Vitest شامل هش رمز و session token)، `npm run build`، `npx playwright test` (۴۰ تست در ۴ viewport: ورود موفق/ناموفق، خروج، bypass مستقیم URL به `/dashboard`، bypass مستقیم API به `/api/v1/auth/me`، هدایت خودکار کاربر واردشده از `/login`، تغییر رمز اجباری در اولین ورود و ورود مجدد با رمز جدید)
Manual demo steps: `npm run db:migrate` و `npm run db:seed`؛ ورود با کاربر Admin موقت؛ هدایت اجباری به `/change-password`؛ تغییر رمز؛ مشاهده `/dashboard` با نام کاربری و نقش واقعی؛ تلاش برای ورود مستقیم به `/dashboard` در حالت خروج (ریدایرکت به `/login`)؛ خروج از حساب.
Offline/network verification: بدون سرویس خارجی؛ session و auth کاملاً داخل شبکه محلی (PostgreSQL روی همان سیستم) کار می‌کنند.
Known limitations: rate limit ورود درون‌حافظه‌ای و per-process است (برای استقرار چندنمونه‌ای باید در Phase 16 با store مشترک جایگزین شود)؛ مدیریت کامل کاربران (ایجاد/غیرفعال‌سازی از UI) در Phase 14 اضافه می‌شود؛ آیتم‌های منوی غیر از داشبورد همچنان غیرفعال («به‌زودی») هستند چون صفحات واقعی آن‌ها ساخته نشده‌اند.
Deferred items: مدیریت کاربران و نقش‌ها از UI (Phase 14)؛ rate limit مشترک/پایدار (Phase 16).
Decisions added/changed: ندارد (Prisma 7.9.1 با معماری adapter-based و `prisma.config.ts` به‌کار رفت؛ رمزنگاری رمز عبور با Argon2id طبق پیشنهاد `API_SECURITY_OFFLINE_OPERATIONS.md`؛ بدون ADR جدید)

### Phase 2 — ساختار سازمانی چهارسطحی

Status: DONE
Started: 2026-08-04
Completed: 2026-08-05
Visible output URL: `/organization` در زمان تکمیل این فاز؛ در Phase 3 به `/system/organization` منتقل شد تا با مسیرهای مستند‌شده در `docs/PROJECT_SPEC.md` بخش ۱۲ هم‌راستا باشد (فقط نقش Admin؛ پس از `npm run dev`، `http://localhost:3000`)
Demo account/data: کاربر Admin از Phase 1 (`SEED_ADMIN_USERNAME`)؛ بدون داده تجاری پیش‌فرض — گره‌ها از UI ساخته می‌شوند.
Branch/PR/Commit: مستقیم روی `main`
Migrations: `prisma/migrations/20260804192641_add_organization_unit` — مدل `OrganizationUnit` (enum `OrganizationLevel`، self-relation برای parent/children، createdBy/updatedBy → User)
Key files: `prisma/schema.prisma`، `src/lib/domain/organization-rules.ts`، `src/lib/validation/organization.ts`، `src/server/services/organization-service.ts`، `src/app/api/v1/organization-units/*`، `src/app/api/v1/organization-tree/route.ts`، `src/app/(dashboard)/organization/page.tsx`، `src/features/organization/*` (tree view، form، history، React Query hooks)، `src/components/ui/sheet.tsx`، `src/components/ui/confirm-dialog.tsx`، `src/components/layout/nav-items.ts` (role-aware nav)
Tests executed: `npm run typecheck`، `npm run lint`، `npm run test` (۱۹ تست Vitest شامل قواعد سطح/والد و build-tree/جست‌وجو)، `npm run build`، `npx playwright test` (۵۶ تست در ۴ viewport: ایجاد چهارسطحی کامل + ویرایش مختصات + تاریخچه audit، رد سطح/والد نامعتبر و کد تکراری و مختصات نامعتبر، رد حذف گره دارای زیرمجموعه و موفقیت پس از حذف فرزند، رد کامل نقش STATUS_VIEWER از صفحه و API)
Manual demo steps: ورود Admin؛ ورود به `/organization`؛ ایجاد دفتر کشوری → دفتر گروه → دفتر توزیع‌کننده → دو انبار با «افزودن زیرمجموعه»؛ جست‌وجو بر اساس نام/کد؛ ویرایش مختصات یک انبار؛ بازکردن دوباره ویرایش و مشاهده تاریخچه («ایجاد شد»، «ویرایش شد»).
Offline/network verification: بدون سرویس خارجی؛ تمام عملیات از طریق API داخلی `/api/v1/organization-*` روی همان شبکه محلی.
Known limitations: کتابخانه آیکن (`iconAssetId`) در schema پیش‌بینی شده اما UI انتخاب آیکن ندارد (Phase 14)؛ نمایش مختصات فقط عددی است، بدون نقشه واقعی (Phase 4)؛ درخت سازمانی fetch کامل (بدون pagination/lazy loading سمت سرور) — برای مقیاس چندصد گره کافی است، در صورت رشد باید در Phase 16 بازبینی شود؛ دسترسی خواندن (GET) نیز مثل نوشتن فقط Admin است — گسترش به نقش‌های دیگر (مثل Planner برای انتخاب انبار مبدأ) در فاز مربوطه (Phase 7+) اضافه می‌شود.
Deferred items: انتخاب آیکن گره (Phase 14)، نمایش روی نقشه واقعی (Phase 4)، دسترسی خواندن reference-data برای Planner/Viewer (فاز مصرف‌کننده).
Decisions added/changed: ندارد؛ اما دو یافته فنی مهم حین این فاز کشف و مستند شد: (۱) `Secure` cookie روی HTTP ساده (127.0.0.1:3100) توسط `page.request` پلی‌رایت—برخلاف مرورگر واقعی—نادیده گرفته می‌شود؛ راه‌حل: env اختیاری `COOKIE_INSECURE` فقط برای اجرای تست/محلی HTTP، پیش‌فرض امن حفظ شد. (۲) فیلتر جست‌وجوی خالی نباید Set خالی برگرداند وگرنه کل درخت پنهان می‌شود — در `organization-tree-view.tsx` اصلاح شد.

### Phase 3 — انواع خودرو، نوع بار و ناوگان

Status: DONE
Started: 2026-08-05
Completed: 2026-08-05
Visible output URL: `/system/vehicles`، `/system/vehicle-types`، `/system/cargo-types` (فقط نقش Admin؛ پس از `npm run dev`، `http://localhost:3000`). به همین مناسبت `/organization` (Phase 2) نیز به `/system/organization` منتقل و یک shell مشترک تب‌دار (`(dashboard)/system/layout.tsx`) برای کل بخش تنظیمات سامانه اضافه شد.
Demo account/data: کاربر Admin از Phase 1؛ بدون نوع خودرو/بار پیش‌فرض یا hardcoded — طبق ممنوعیت صریح CLAUDE.md همه از UI ساخته می‌شوند.
Branch/PR/Commit: مستقیم روی `main`
Migrations: `prisma/migrations/20260804232317_add_fleet_catalogs` — مدل‌های `VehicleType`، `CargoType`، `Vehicle` و enum `VehicleReadiness`.
Key files: `prisma/schema.prisma`، `src/lib/validation/vehicle.ts`، `src/server/services/{vehicle-type,cargo-type,vehicle}-service.ts`، `src/app/api/v1/{vehicle-types,cargo-types,vehicles}/**`، `src/app/(dashboard)/system/**` (layout تب‌دار + صفحات organization/vehicles/vehicle-types/cargo-types)، `src/features/fleet/*` (لیست‌های catalog، فرم خودرو، React Query hooks)، `src/components/ui/stat-card.tsx`، `src/lib/http/api-client-error.ts` (استخراج `ApiError` مشترک از Phase 2)
Tests executed: `npm run typecheck`، `npm run lint`، `npm run test` (۲۹ تست Vitest شامل رد مقادیر منفی/صفر و کد نامعتبر)، `npm run build`، `npx playwright test` (۶۸ تست در ۴ viewport: تعریف دو نوع خودرو و سه خودرو، خارج‌کردن یکی از سرویس و بررسی تغییر آمار نسبت به baseline؛ رد مقدار منفی، نام/شناسه تکراری، حذف نوع استفاده‌شده و موفقیت حذف پس از آزادشدن؛ رد کامل نقش STATUS_VIEWER از صفحه و API)
Manual demo steps: ورود Admin؛ `/system/vehicle-types` → افزودن «کامیونت» و «وانت»؛ `/system/vehicles` → افزودن سه خودرو (کارت‌های خلاصه بالای صفحه به‌روز می‌شوند)؛ ویرایش یکی و تغییر وضعیت به «خارج از سرویس» → مشاهده تغییر فوری کارت‌های «آماده» و «خارج از سرویس».
Offline/network verification: بدون سرویس خارجی؛ همه عملیات از طریق API داخلی `/api/v1/{vehicle-types,cargo-types,vehicles}*`.
Known limitations: کتابخانه آیکن (`iconAssetId`) هنوز اضافه نشده (طبق تصمیم Phase 2 برای OrganizationUnit، اینجا هم به Phase 14 موکول شد)؛ دسترسی خواندن (GET) نیز مثل نوشتن فقط Admin است، هم‌راستا با محدودیت مشابه Phase 2 — گسترش به Planner برای انتخاب خودرو/نوع بار هنگام برنامه‌ریزی مأموریت در Phase 7+ انجام می‌شود؛ فیلتر/جست‌وجو fetch کامل بدون pagination سمت سرور دارد (مقیاس بزرگ در Phase 16 بازبینی می‌شود)؛ `GET /vehicles/availability` مستند در API_SECURITY (برای بررسی هم‌پوشانی زمانی) پیاده نشد چون به مأموریت (Phase 7) وابسته است.
Deferred items: انتخاب آیکن (Phase 14)، `GET /vehicles/availability` (Phase 7)، دسترسی خواندن reference-data برای Planner/Viewer (فاز مصرف‌کننده).
Decisions added/changed: بدون ADR جدید. دو اصلاح غیر-Phase-3 به‌عنوان جزئی از این فاز انجام شد چون زیرساخت لازم (`system` shell) اینجا ساخته شد: (۱) مسیر Phase 2 از `/organization` به `/system/organization` منتقل شد تا با `docs/PROJECT_SPEC.md` بخش ۱۲ مطابق باشد. (۲) نوع/کلاس `ApiError` مشترک بین features که در Phase 2 داخل `features/organization/types.ts` تعریف شده بود، به `src/lib/http/api-client-error.ts` منتقل شد (با re-export برای سازگاری) تا `features/fleet` بدون وابستگی نادرست به `features/organization` از آن استفاده کند.

### Phase 4 — نقشه داخلی و نمایش دفاتر و انبارها

Status: DONE
Started: 2026-08-05
Completed: 2026-08-05
Visible output URL: `/map` (همه نقش‌های احرازهویت‌شده: Admin، STATUS_VIEWER، MISSION_PLANNER)؛ مدیریت Provider در `/system/map-providers` (فقط Admin).
Demo account/data: کاربر Admin از Phase 1؛ گره‌های سازمانی دارای مختصات از Phase 2. بدون Provider پیش‌فرض seed‌شده — طبق ADR-016 انتخاب Provider تصمیم استقرار است و Admin باید حداقل یک Provider (ترجیحاً داخلی) ثبت کند.
Branch/PR/Commit: مستقیم روی `main`
Migrations: `prisma/migrations/20260805042443_add_map_provider` — مدل `MapProvider` و enumهای `MapProviderKind`، `MapProviderHealthStatus`.
Key files: `src/lib/domain/map-provider-rules.ts` (اعتبارسنجی baseline آدرس/scheme + نگاشت scheme به MapLibre)، `src/lib/validation/map-provider.ts`، `src/server/services/map-provider-service.ts` (شامل test-connection سمت سرور با timeout/redirect:error/content-type/size)، `src/app/api/v1/map-providers/**`، `src/app/api/v1/map/organization-units/route.ts` (endpoint سبک همه‌نقش)، `src/features/map-providers/*`، `src/features/map/*` (map-view، maplibre-map-inner با dynamic import و ssr:false، level-styles)، `src/app/(dashboard)/map/page.tsx`، افزودن `maplibre-gl` به dependencies.
Tests executed: `npm run typecheck`، `npm run lint`، `npm run test` (۴۱ تست Vitest شامل ۱۲ تست قواعد URL/scheme)، `npm run build`، `npx playwright test` (۸۸ تست در ۴ viewport: بارگذاری کاشی واقعی از یک XYZ خارجی نمونه و تأیید موفقیت `test-connection`، حالت تخمین «Provider تنظیم نشده» بدون کرش shell، toggle سطوح سازمانی، رد آدرس بدون placeholder/بزرگ‌نمایی نامعتبر/نام تکراری، دسترسی STATUS_VIEWER به `/map` ولی نه به مدیریت Provider).
Manual demo steps: ورود Admin؛ `/system/map-providers` → افزودن Provider (نوع XYZ، آدرس `{z}/{x}/{y}`)؛ «تست اتصال» → نمایش وضعیت سالم/خراب فارسی؛ تنظیم Provider پیش‌فرض؛ ورود به `/map` → مشاهده marker چهار سطح سازمانی (دفتر کشوری/گروه/توزیع‌کننده/انبار) با رنگ متمایز، کلاستر در تراکم بالا، popup با tap/click، toggle نمایش هر سطح.
Offline/network verification: assetهای MapLibre (JS+CSS) کاملاً local bundle شده‌اند (بدون کاشی/فونت/آیکن از CDN)؛ NavigationControl از SVG inline (data URI) استفاده می‌کند نه sprite خارجی؛ کاشی‌ها فقط از URL پیکربندی‌شده توسط Admin درخواست می‌شوند. چون این محیط فقط دسترسی اینترنت دارد نه یک tile server داخلی واقعی، اتصال به یک Provider خارجی نمونه (OSM-compatible XYZ، طبق پیشنهاد صریح ADR-016/سند عملیات) تأیید شد؛ آزمون واقعی «قطع اینترنت + Provider داخلی روی LAN» به‌عنوان محدودیت شناخته‌شده ثبت می‌شود (Phase 16 دوباره پوشش می‌دهد).
Known limitations: WMTS فقط در سطح CRUD/schema پشتیبانی می‌شود، منطق واقعی درخواست کاشی WMTS پیاده نشده (طبق عبارت «پشتیبانی اولیه XYZ/TMS» در دامنه فاز، عمدی است). تزریق واقعی API key برای Providerهای `requiresApiKey=true` در درخواست کاشی پیاده نشده — فقط به‌عنوان metadata ذخیره می‌شود. سخت‌گیری کامل SSRF (allowlist hostname/CIDR قابل‌تنظیم، محافظت DNS rebinding) عمداً به Phase 16 موکول شده (طبق IMPLEMENTATION_PLAN)؛ Phase 4 فقط baseline (scheme، placeholder، timeout، redirect:error، content-type/size در test-connection) را پیاده کرده است. تست واقعی «قطع اینترنت + سرور نقشه داخلی روی LAN» در این محیط توسعه ممکن نبود (بدون tile server داخلی واقعی)، در Phase 16 با محیط استقرار واقعی تکرار می‌شود. آیکن اختصاصی هر سطح سازمانی روی نقشه پیاده نشده؛ فعلاً رنگ دایره متمایز است (کتابخانه IconAsset در Phase 14 اضافه می‌شود).
Deferred items: WMTS tile fetching، تزریق کلید API در درخواست کاشی، allowlist/SSRF کامل (Phase 16)، آیکن اختصاصی هر سطح (Phase 14)، آزمون قطع اینترنت با Provider داخلی واقعی (Phase 16)، درون‌ریزی سبک نقشه از فایل Mapnik XML — پیشنهادی، معماری در ADR-022 منجمد شده، نیازمند فاز اجرایی مستقل (پیوست `IMPLEMENTATION_PLAN.md`).
Decisions added/changed: بدون ADR جدید. یک یافته فنی مهم محیط توسعه مستند شد: نقشه‌ی MapLibre در پنل مرورگر داخلی ابزارهای Claude Code (نه در برنامه واقعی) هرگز style را بارگذاری نمی‌کند و هیچ کاشی درخواست نمی‌شود (احتمالاً throttle شدن requestAnimationFrame برای تب پس‌زمینه)؛ با یک تست تشخیصی Playwright (Chromium واقعی) تأیید شد که این محدودیت مخصوص آن پنل است و در مرورگر واقعی/Playwright ۴۲ کاشی واقعی با موفقیت بارگذاری شدند. یادداشت در حافظه پروژه ثبت شد تا در فازهای بعد (که نقشه بیشتر توسعه می‌یابد) verification همیشه از طریق Playwright انجام شود، نه پنل مرورگر داخلی.

### Phase 5 — مدیریت مسیر، CSV و ترسیم روی نقشه

Status: DONE
Started: 2026-08-05
Completed: 2026-08-05
Visible output URL: `/routes` (همه نقش‌های احرازهویت‌شده — مشاهده)، `/routes/new` و مدیریت (ویرایش/تکثیر/غیرفعال‌سازی) در `/routes/[id]` (فقط Admin و MISSION_PLANNER).
Demo account/data: کاربران Admin/Planner از فازهای قبل؛ بدون مسیر پیش‌فرض seed‌شده — طبق الگوی فازهای قبل همه از UI/CSV ساخته می‌شوند. برای ترسیم روی نقشه به یک `MapProvider` فعال (Phase 4) نیاز است.
Branch/PR/Commit: مستقیم روی `main`
Migrations: `prisma/migrations/20260805101856_add_routes` — مدل‌های `Route` (نسخه‌بندی با `code`+`version`) و `RoutePoint`، enum `RouteSource`.
Key files: `src/lib/geo/distance.ts` (Haversine pure)، `src/lib/csv/csv.ts` (parser/stringifier RFC4180 سبک + مقابله با formula injection)، `src/lib/domain/route-csv.ts` (اعتبارسنجی سطری CSV طبق ADR-012)، `src/lib/validation/route.ts`، `src/lib/security/route-preview-token.ts` (توکن HMAC stateless برای import، ADR-020)، `src/server/services/route-service.ts` (create/newVersion/duplicate/patch/export/CSV preview)، `src/app/api/v1/routes/**` (list/create/summary/import-csv/confirm-import/[id]/[id]/new-version/[id]/duplicate/[id]/export.csv)، `src/features/routes/*` (route-draw-map-inner با Marker قابل‌درگ + خط GeoJSON، route-point-editor با undo/redo، route-csv-import-panel، routes-list-view، route-create-view، route-detail-view، duplicate-route-dialog)، `src/app/(dashboard)/routes/**`، افزودن آیکن‌های `copy`/`power`/`upload`/`download`.
Tests executed: `npm run typecheck`، `npm run lint`، `npm run test` (۶۷ تست Vitest شامل ۷ تست Haversine، ۹ تست CSV parse/stringify/sanitize، ۱۰ تست اعتبارسنجی سطری CSV)، `npm run build`، `npx playwright test` (۱۱۲ تست در ۴ viewport شامل ۲۴ تست جدید Phase 5: import CSV نمونه + export دقیقاً همان داده، رد سرستون نامعتبر و مختصات خارج از محدوده، ترسیم مسیر با Tap توسط Planner، ویرایش نقطه → نسخه جدید + غیرفعال‌شدن نسخه قبلی + فهرست فقط آخرین نسخه را نشان می‌دهد، تکثیر + غیرفعال‌سازی، دسترسی خواندن Viewer ولی رد کامل نوشتن).
Manual demo steps: ورود Admin؛ `/routes/new` → تب «وارد کردن CSV» → آپلود `docs/samples/route-template.csv` → مشاهده پیش‌نمایش موفق و ۳ نقطه → تکمیل شناسه/نام → ذخیره؛ در `/routes/[id]` روی «ویرایش نقاط (نسخه جدید)» کلیک و یک نقطه را در جدول اصلاح، «ذخیره نسخه جدید» (نسخه ۲ ساخته و نسخه ۱ غیرفعال می‌شود)؛ «خروجی CSV» را دانلود و مقایسه با ورودی؛ ورود Planner و تب «ترسیم روی نقشه» → چند Tap روی نقشه → «پایان مسیر» → ذخیره.
Offline/network verification: بدون سرویس خارجی برای CRUD/CSV؛ ترسیم روی نقشه از همان MapProvider پیکربندی‌شده Phase 4 استفاده می‌کند (بدون CDN اضافه).
Known limitations: فهرست مسیرها fetch کامل بدون pagination سمت سرور دارد (مشابه محدودیت مشابه Phase 2/3، در Phase 16 بازبینی می‌شود). محدودیت حداکثر تعداد نقطه (۱۰,۰۰۰) و حجم فایل (۵MB) درون کد hardcode است، نه یک تنظیم قابل ویرایش از UI (سیستم تنظیمات سراسری هنوز در فاز بعد اضافه نشده). parse فایل CSV بافر کامل را در حافظه می‌خواند (نه streaming واقعی)، اما پیش از parse با محدودیت اندازه فایل بررسی می‌شود. دسترسی خواندن `GET /routes` برای هر سه نقش باز است (طبق ماتریس مجوز PROJECT_SPEC که «مشاهده» را به Viewer می‌دهد). آیکن نقطه شروع/پایان/میانی روی نقشه فقط رنگی است (کتابخانه IconAsset در Phase 14).
Deferred items: pagination سمت سرور فهرست مسیرها، تنظیم قابل‌ویرایش سقف نقطه/حجم فایل CSV (Phase 14 تنظیمات)، streaming واقعی parse فایل بزرگ (در صورت نیاز عملکردی در Phase 16 بازبینی می‌شود)، اتصال Route به Mission (Phase 7).
Decisions added/changed: ADR-020 اضافه شد — نسخه‌بندی Route با رکورد جدید هم‌کد (نه مدل جدای `RouteVersion` که در متن IMPLEMENTATION_PLAN آمده ولی در ARCHITECTURE_AND_DATA_MODEL.md تعریف نشده بود) و توکن HMAC stateless برای پیش‌نمایش import CSV به‌جای ذخیره‌سازی سمت سرور. همچنین دو فایل ماک‌آپ اشتباه‌نام‌گذاری‌شده (`03-routes-management-desktop.png` و `04-settings-vehicles-desktop.png` که محتوایشان جابه‌جا بود) بدون تغییر محتوا مبادله شدند تا با `docs/mockups/README.md` مطابق باشند.

### Phase 6 — تعریف مرسوله و مقصد

Status: DONE
Started: 2026-08-05
Completed: 2026-08-05
Visible output URL: `/shipments` (فهرست)، `/shipments/new` (ایجاد)، `/shipments/[id]` (جزئیات/ویرایش/تاریخچه) — فقط Admin و MISSION_PLANNER؛ STATUS_VIEWER کاملاً مسدود است (طبق ماتریس مجوز PROJECT_SPEC که برای مرسوله فقط Planner/Admin را تیک زده و برخلاف Phase 5 مقدار «مشاهده» برای Viewer ندارد).
Demo account/data: کاربران Admin/Planner از فازهای قبل؛ بدون مرسوله یا نوع بار پیش‌فرض seed‌شده. برای ایجاد مرسوله حداقل یک `CargoType` و یک `OrganizationUnit` سطح `WAREHOUSE` لازم است.
Branch/PR/Commit: مستقیم روی `main`
Migrations: `prisma/migrations/20260805121327_add_shipments` — مدل `Shipment` و enum `ShipmentStatus`.
Key files: `src/lib/validation/shipment.ts` (`superRefine` برای دو حالت مقصد)، `src/server/services/shipment-service.ts` (تولید خودکار `trackingCode` با retry روی برخورد یکتایی، snapshot مختصات مقصد، اعتبارسنجی مبدأ=WAREHOUSE)، `src/app/api/v1/shipments/**`، `src/features/shipments/*` (shipment-form با map preview قابل Tap برای مقصد آزاد — با استفاده مجدد از `RouteDrawMapInner` فاز ۵ در حالت `editable=false`، shipments-list-view، shipment-create-view، shipment-detail-view، shipment-history)، `src/app/(dashboard)/shipments/**`. گسترش دسترسی خواندن `GET /api/v1/organization-units` و `GET /api/v1/cargo-types` به نقش MISSION_PLANNER (طبق یادداشت «فاز مصرف‌کننده» ثبت‌شده در Known limitations فازهای ۲ و ۳)، و افزودن `fetchOrganizationUnitsFlat`/`useOrganizationUnitsFlat` به feature سازمانی موجود برای انتخاب مقصد.
Tests executed: `npm run typecheck`، `npm run lint`، `npm run test` (۷۷ تست Vitest شامل ۱۰ تست جدید اعتبارسنجی مرسوله: دو حالت مقصد معتبر، مقصد ناقص در هر دو حالت، فیلدهای الزامی، مختصات خارج از محدوده، وزن/حجم منفی، بروزرسانی جزئی)، `npm run build`، `npx playwright test` (۱۳۲ تست در ۴ viewport شامل ۲۰ تست جدید Phase 6: ایجاد مرسوله با مقصد گره سازمانی توسط Admin، ایجاد مرسوله با مقصد مختصات آزاد توسط Planner، رد مبدأ غیرانبار/مقصد ناقص/کد رهگیری تکراری، ویرایش وضعیت با ثبت در تاریخچه + حذف نرم از فهرست، محرومیت کامل STATUS_VIEWER).
Manual demo steps: ورود Admin؛ ساخت یک نوع بار در `/system/cargo-types` در صورت نبود؛ `/shipments/new` → تعریف مرسوله اول با مقصد «گره سازمانی» (جست‌وجو و انتخاب یک دفتر/انبار دارای مختصات)؛ مشاهده preview نقشه با مبدأ/مقصد؛ ذخیره و مشاهده صفحه جزئیات با کد رهگیری تولیدشده خودکار؛ ساخت مرسوله دوم با مقصد «مختصات آزاد» و تعیین مقصد با Tap روی نقشه یا وارد کردن مستقیم عرض/طول جغرافیایی؛ در جزئیات یکی از مرسوله‌ها روی «ویرایش» کلیک، تغییر وضعیت به «در انتظار ارسال» و مشاهده رویداد در تاریخچه.
Offline/network verification: بدون سرویس خارجی؛ map preview از همان MapProvider پیکربندی‌شده Phase 4 استفاده می‌کند.
Known limitations: فهرست مرسوله‌ها fetch کامل بدون pagination سمت سرور دارد (محدودیت مشابه فازهای قبل، Phase 16 بازبینی می‌شود). انتخاب مقصد از نوع «گره سازمانی» با یک `<select>` ساده پر از نتایج جست‌وجوی سرور است، نه combobox خودکاره؛ برای درخت سازمانی بزرگ در Phase 15 قابل بهبود است. عدم امکان drag برای اصلاح دقیق مقصد روی نقشه (فقط Tap و ورود مستقیم عدد) — تصمیم عمدی برای جلوگیری از drag تصادفی marker مبدأ (که موقعیتش از انبار می‌آید و نباید قابل جابه‌جایی باشد)، طبق محدودیت مستند در حافظه فنی پروژه. مرسوله هنوز به مأموریت متصل نیست (Phase 7).
Deferred items: pagination سمت سرور، combobox جست‌وجوی پیشرفته مقصد (Phase 15)، اتصال مرسوله به مأموریت (Phase 7)، مشتق‌شدن وضعیت `IN_TRANSIT`/`DELIVERED` از مأموریت فعال (Phase 7+).
Decisions added/changed: بدون ADR جدید — طراحی نسخه‌بندی/snapshot مقصد دقیقاً طبق `ARCHITECTURE_AND_DATA_MODEL.md` بخش Shipment اجرا شد. دسترسی خواندن `organization-units` و `cargo-types` برای MISSION_PLANNER که در Known limitations فازهای ۲/۳ به‌عنوان «فاز مصرف‌کننده» موکول شده بود، در همین فاز باز شد.

### Phase 7 — برنامه‌ریزی مأموریت از فرم

Status: DONE
Started: 2026-08-05
Completed: 2026-08-06
Visible output URL: `/missions` (فهرست)، `/missions/new` (wizard ایجاد)، `/missions/[id]` (جزئیات/ویرایش/لغو/تکثیر/تاریخچه) — فقط Admin و MISSION_PLANNER؛ STATUS_VIEWER کاملاً مسدود است (طبق ماتریس مجوز PROJECT_SPEC، مشابه محدودیت Phase 6).
Demo account/data: کاربران Admin/Planner از فازهای قبل؛ بدون مأموریت پیش‌فرض seed‌شده. برای ساخت مأموریت حداقل یک یا چند `Shipment` هم‌مبدأ/هم‌مقصد (Phase 6) و یک `Vehicle` با آمادگی `READY` (Phase 3) لازم است؛ `Route` اختیاری است (فاز fallback مسیر مستقیم طبق ADR-011).
Branch/PR/Commit: مستقیم روی `main`
Migrations: `prisma/migrations/20260805184713_add_missions` — مدل‌های `Mission` و `MissionShipment`، enum `MissionPersistedStatus`. `prisma/migrations/20260805184838_add_mission_shipment_active_unique_index` — ایندکس یکتای دستی partial (`MissionShipment_active_shipment_unique`) طبق ADR-019/021.
Key files: `src/lib/dates/jalali.ts` (تبدیل شمسی/میلادی با افست ثابت Asia/Tehran)، `src/lib/domain/mission-rules.ts` (سازگاری مقصد مرسوله‌ها، هم‌پوشانی زمانی خودرو، وضعیت نمایشی مشتق‌شده)، `src/lib/domain/mission-estimate.ts` (تخمین pure مسافت/زمان/سوخت با استفاده مجدد از `geo/distance` فاز ۵)، `src/lib/validation/mission.ts`، `src/server/services/mission-service.ts` (create/publish/update/cancel/duplicate/estimate با `commitMissionAssignment` تراکنشی و row-lock روی مرسوله)، `src/app/api/v1/missions/**` (list/create/summary/estimate/[id]/[id]/publish/[id]/cancel/[id]/duplicate/[id]/history)، `src/components/ui/jalali-datetime-input.tsx`، `src/features/missions/*` (mission-wizard شش‌مرحله‌ای، missions-list-view، mission-detail-view، mission-history، mission-cancel-dialog، mission-duplicate-dialog، React Query hooks)، `src/app/(dashboard)/missions/**`. گسترش دسترسی خواندن `GET /api/v1/vehicles` به نقش MISSION_PLANNER (طبق یادداشت «فاز مصرف‌کننده» فاز ۳) و افزودن فیلتر `availableForMission` به `listShipments()` فاز ۶.
Tests executed: `npm run typecheck`، `npm run lint`، `npm run test` (۱۱۰ تست Vitest شامل ۶ تست جدید تقویم جلالی، ۱۳ تست قواعد مأموریت، ۵ تست تخمین، ۹ تست اعتبارسنجی)، `npm run build`، `npx playwright test` (۱۵۶ تست در ۴ viewport شامل ۲۴ تست جدید Phase 7: سناریوی کامل wizard توسط Planner با دو مرسوله هم‌مقصد تا انتشار + تبدیل وضعیت مرسوله‌ها به «در انتظار ارسال»، رد مرسوله‌های ناسازگار/زمان گذشته/خودروی خارج از سرویس، رد انتشار به‌دلیل تداخل زمانی خودرو، لغو مأموریت با آزادسازی مرسوله‌ها + تکثیر به مأموریت پیش‌نویس جدید، حذف مأموریت پیش‌نویس، محرومیت کامل STATUS_VIEWER از صفحه و API).
Manual demo steps: ورود Planner؛ `/missions/new` → انتخاب یک یا چند مرسوله هم‌مقصد → بررسی preview مبدأ/مقصد روی نقشه → انتخاب خودرو آماده → تعیین زمان شروع (ورودی تاریخ/ساعت شمسی) → انتخاب مسیر اختیاری (یا رد‌شدن با مسیر مستقیم) → بازبینی تخمین مسافت/مدت/سوخت → «ذخیره و انتشار»؛ مشاهده صفحه جزئیات با وضعیت «برنامه‌ریزی‌شده» و مرسوله‌های مرتبط؛ تست لغو با دلیل اجباری و مشاهده آزادشدن مرسوله؛ تست تکثیر مأموریت لغوشده به مأموریت جدید با زمان شروع دیگر.
Offline/network verification: بدون سرویس خارجی؛ محاسبه تخمین کاملاً local (تابع pure، بدون فراخوانی سرویس آنلاین مسیریابی، طبق ممنوعیت صریح CLAUDE.md)؛ preview نقشه از همان MapProvider پیکربندی‌شده Phase 4 استفاده می‌کند.
Known limitations: موتور موقعیت تقریبی لحظه‌ای (حرکت واقعی خودرو روی نقشه در طول مأموریت) هنوز پیاده نشده — Phase 7 فقط تخمین ایستا (مسافت/مدت/زمان تخمینی رسیدن) در زمان برنامه‌ریزی محاسبه می‌کند؛ وضعیت نمایشی `WAITING/IN_PROGRESS/ARRIVED` صرفاً مقایسه زمانی ساده است، نه شبیه‌سازی حرکت (Phase 9). ساخت مأموریت از داخل نقشه (بدون ترک صفحه نقشه) پیاده نشده (Phase 8). فهرست مأموریت‌ها fetch کامل بدون pagination سمت سرور دارد (محدودیت مشابه فازهای قبل). tolerance عدم تطابق مسیر با مبدأ/مقصد (متر) hardcode است، نه تنظیم قابل‌ویرایش Admin (Phase 14 تنظیمات). فیلد `MissionPersistedStatus.ARCHIVED` هنوز هیچ مسیر UI/سرویسی برای تنظیم آن ندارد (فقط در schema پیش‌بینی شده؛ مسیر واقعی بایگانی به فاز(های) بعد موکول است).
Deferred items: موتور موقعیت تقریبی و شبیه‌سازی حرکت (Phase 9)، ساخت/انتشار مأموریت از داخل نقشه (Phase 8)، pagination سمت سرور فهرست مأموریت‌ها، تنظیم قابل‌ویرایش tolerance مسیر (Phase 14)، مسیر عملیاتی رسیدن به وضعیت `ARCHIVED`.
Decisions added/changed: ADR-021 اضافه شد — نام‌گذاری enum `MissionPersistedStatus` طبق سند معماری (`DRAFT/SCHEDULED/CANCELLED/ARCHIVED`، نه عبارت توصیفی implementation plan) با همان رویه ADR-020، و تصحیح مقدار پیش‌فرض `MissionShipment.isActiveAssignment` از `true` (متن ADR-019) به `false` (پیاده‌سازی واقعی) چون رکورد پیش‌نویس باید غیرفعال آغاز شود.

### Phase 8 — تعریف مأموریت از داخل نقشه

Status: DONE
Started: 2026-08-06
Completed: 2026-08-06
Visible output URL: `/map` — دکمه «ساخت مأموریت از نقشه» (فقط Admin و MISSION_PLANNER) که نمای نقشه را به حالت انتخاب مبدأ/مقصد و سپس یک پنل ساخت مأموریت تبدیل می‌کند؛ بدون هیچ صفحه/مسیر جدید.
Demo account/data: کاربران Admin/Planner از فازهای قبل؛ برای دمو حداقل یک مرسوله (فاز ۶) با مبدأ/مقصد مشخص و یک خودرو `READY` (فاز ۳) لازم است — این فاز هیچ داده مرجع جدیدی معرفی نمی‌کند.
Branch/PR/Commit: مستقیم روی `main`
Migrations: **ندارد.** این فاز کاملاً UI-level است و صرفاً serviceها/validationهای فاز ۷ و کوئری‌های موجود فاز ۶ (`GET /shipments?originWarehouseId=`) را از مسیر تعامل نقشه فراخوانی می‌کند؛ هیچ مدل، فیلد یا endpoint جدیدی اضافه نشد (طبق ADR-023).
Key files: `src/features/missions/mission-form-parts.tsx` (استخراج `ShipmentPickerList`/`VehiclePickerList`/`RouteStepPanel`/`MissionReviewStep` از `mission-wizard.tsx` فاز ۷ برای reuse بدون تکرار کد، بدون تغییر رفتار)، `src/lib/domain/mission-rules.ts` (تابع pure جدید `shipmentMatchesDestinationPoint` + آزمون واحد)، `src/features/map/maplibre-map-inner.tsx` (props اختیاری و backward-compatible: `interactionMode`, `onMarkerSelect`, `onMapPick`, `pinPoint` — رفتار پیش‌فرض `/map` بدون تغییر)، `src/features/missions/mission-map-create-panel.tsx` (پنل ساخت مأموریت: مرسوله/خودرو/زمان/مسیر با زیرتب انتخاب از فهرست + import سریع CSV + ترسیم روی نقشه (reuse مستقیم `RouteCsvImportPanel`/`RoutePointEditor` فاز ۵) + بازبینی/تخمین + ذخیره پیش‌نویس/انتشار با همان hookهای فاز ۷)، `src/features/map/map-view.tsx` (state machine مرحله مبدأ → مقصد → جزئیات، جست‌وجوی انبار، ورود دستی مختصات مقصد به‌عنوان جایگزین Tap)، `src/app/(dashboard)/map/page.tsx` (تبدیل به server component برای محاسبه `canCreateMission` بر اساس نقش).
Tests executed: `npm run typecheck`، `npm run lint`، `npm run test` (۱۱۵ تست Vitest شامل ۵ تست جدید `shipmentMatchesDestinationPoint`)، `npm run build` (۴۱ route بدون تغییر — هیچ route جدیدی اضافه نشد)، `npx playwright test` (۱۶۸ تست در ۴ viewport شامل ۱۲ تست جدید Phase 8 در `tests/e2e/mission-map-create.spec.ts`: سناریوی کامل — انتخاب مبدأ از جست‌وجو + مقصد با مختصات دستی + انتخاب مرسوله/خودرو + انتشار + بررسی تغییر وضعیت مرسوله‌ها، Tap واقعی روی canvas نقشه در نقطه خالی (با mock کنترل‌شده فهرست marker برای قطعیت کامل، مستقل از داده انباشته‌شده سایر تست‌ها) که پنل ساخت مأموریت را باز می‌کند، و مخفی‌بودن دکمه «ساخت مأموریت از نقشه» برای نقش STATUS_VIEWER — بدون هیچ رگرسیونی در ۱۵۶ تست فازهای قبل، به‌ویژه `missions.spec.ts` و `map.spec.ts`).
Manual demo steps: ورود Planner؛ `/map` → «ساخت مأموریت از نقشه» → جست‌وجو/Tap روی marker یک انبار → Tap روی نقطه مقصد یا ورود مختصات → در پنل باز‌شده، انتخاب یک یا چند مرسوله هم‌مبدأ/هم‌مقصد نمایش‌داده‌شده → انتخاب خودرو آماده → بررسی/تغییر زمان شروع → انتخاب مسیر موجود یا «ترسیم روی نقشه»/«وارد کردن CSV» برای ساخت مسیر جدید در همان پنل → «محاسبه دوباره» برای دیدن تخمین → «انتشار مأموریت» → هدایت به `/missions/[id]` با وضعیت «برنامه‌ریزی‌شده».
Offline/network verification: بدون سرویس خارجی اضافه؛ همان MapProvider پیکربندی‌شده فاز ۴ استفاده می‌شود؛ تخمین و تطبیق مقصد کاملاً محلی و pure هستند.
Known limitations: اگر برای مبدأ/مقصد انتخاب‌شده روی نقشه هیچ مرسوله‌ای از قبل ثبت نشده باشد، مأموریت از این مسیر قابل ساخت نیست (باید ابتدا مرسوله از `/shipments/new` ساخته شود) — طبق ADR-023 این محدودیت عمدی است چون مبدأ/مقصد مأموریت همیشه از مرسوله مشتق می‌شود، نه فیلد مستقل. tolerance تطبیق مقصد با نقطه Tap‌شده (۱۵۰۰ متر) و tolerance عدم تطابق مسیر (۱۰۰۰ متر، از فاز ۷) هر دو hardcode هستند، نه تنظیم قابل‌ویرایش Admin (Phase 14). ویرایش مأموریت از داخل نقشه پیاده نشده — پنل نقشه فقط حالت «ساخت» را پوشش می‌دهد؛ ویرایش مأموریت `DRAFT` موجود همچنان فقط از `/missions/[id]` (فاز ۷) ممکن است.
Deferred items: ویرایش مأموریت از داخل نقشه، تنظیم قابل‌ویرایش toleranceهای تطبیق مقصد/مسیر (Phase 14)، ساخت مرسوله inline از داخل پنل نقشه (در صورت نبود مرسوله مطابق).
Decisions added/changed: ADR-023 اضافه شد — مستندسازی این‌که انتخاب مبدأ/مقصد روی نقشه یک فیلتر جست‌وجوی مرسوله است (با تابع pure `shipmentMatchesDestinationPoint`)، نه فیلد مستقل مأموریت، تا با invariant «مبدأ/مقصد مأموریت = مبدأ/مقصد مرسوله» از فاز ۷ در تعارض نباشد. همچنین یک باگ واقعی در `maplibre-map-inner.tsx` کشف و رفع شد: click handler نقطه خالی نقشه داخل `map.on("load", ...)` ثبت می‌شد و در نتیجه کلیک زودهنگام کاربر (پیش از کامل‌شدن بارگذاری style) بی‌اثر می‌ماند؛ به بیرون از `"load"` منتقل شد (بدون نیاز به ADR جداگانه، جزئیات در کد مستند شد).

## قاعده تغییر وضعیت به DONE

فاز فقط زمانی `DONE` است که:

1. خروجی قابل مشاهده تعریف‌شده واقعاً در دسترس باشد؛
2. سناریوی نمایش دستی با موفقیت اجرا شده باشد؛
3. Definition of Done در `CLAUDE.md` رعایت شده باشد؛
4. تست‌ها، migration، محدودیت‌ها و مسیر مشاهده در همین سند ثبت شده باشند؛
5. feature ناقص یا دکمه ظاهراً فعال از فازهای بعد باقی نمانده باشد.
