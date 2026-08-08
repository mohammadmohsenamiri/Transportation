# وضعیت فازهای پیاده‌سازی

آخرین به‌روزرسانی: 2026-08-08 (ممیزی عرضی فازهای ۰ تا ۱۳)

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
| 9 | موتور موقعیت تقریبی | لایه محاسباتی pure (بدون UI) — Development Pack کامل در `docs/phase-09-simulation-engine/` | DONE | M | بدون UI، طبق ADR-024 |
| 10 | نقشه عملیاتی پایه و حرکت خودروها | خودروهای مأموریت‌دار در موقعیت تقریبی روی نقشه | DONE | L | Demo 3؛ ADR-025 |
| 11 | جدول مأموریت، انتخاب متقابل و فیلترها | همگام‌سازی نقشه/جدول و فیلترهای عملیاتی | DONE | M | ADR-027 |
| 12 | سیکر زمان زنده و تاریخی | بازسازی وضعیت ناوگان در زمان دلخواه | DONE | M | ADR-028 |
| 13 | فرانمای وضعیت مدیریتی | KPIهای واقعی و drill-down | DONE | S | Demo 4؛ ADR-029 |
| 14 | مدیریت کاربران، آیکن‌ها و تنظیمات تکمیلی | کاربران، نقش‌ها، آیکن سفارشی و audit viewer | NOT_STARTED | M | Development Pack در `docs/phase-14-users-icons-settings/` |
| 15 | تکمیل چرخه عمر مأموریت | وضعیت پایانی واقعی، زمان واقعی و کنترل همروندی | NOT_STARTED | M | Development Pack در `docs/phase-15-mission-lifecycle-completion/` |
| 16 | ریسپانسیو، Touch و دسترس‌پذیری نهایی | اجرای کامل جریان‌ها روی موبایل و تبلت | NOT_STARTED | L | — |
| 17 | اجرای بدون اینترنت، امنیت، عملیات و ظرفیت | نسخه production قابل اجرا فقط در LAN | NOT_STARTED | L | — |
| 18 | UAT و Release Candidate | نسخه قابل نصب، راهنما، گزارش UAT و rollback | NOT_STARTED | M | Release Candidate |

## نقاط تحویل

- **Demo 0 — Phase 0:** ظاهر و ساختار کامل محصول قابل مشاهده است.
- **Demo 1 — Phase 4:** کاربر وارد می‌شود، دفاتر و خودروها را مدیریت می‌کند و نقاط را روی نقشه داخلی می‌بیند.
- **Demo 2 — Phase 8:** مسیر، مرسوله و مأموریت از فرم و نقشه ساخته می‌شوند.
- **Demo 3 — Phase 10:** حرکت تقریبی خودروهای واقعی مأموریت روی نقشه نمایش داده می‌شود.
- **Demo 4 — Phase 13:** نقشه عملیاتی، timeline و داشبورد مدیریتی قابل ارائه‌اند.
- **Release Candidate — Phase 18:** نسخه برای UAT و استقرار شبکه داخلی آماده است.

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
Known limitations: rate limit ورود درون‌حافظه‌ای و per-process است (برای استقرار چندنمونه‌ای باید در Phase 17 با store مشترک جایگزین شود)؛ مدیریت کامل کاربران (ایجاد/غیرفعال‌سازی از UI) در Phase 14 اضافه می‌شود؛ آیتم‌های منوی غیر از داشبورد همچنان غیرفعال («به‌زودی») هستند چون صفحات واقعی آن‌ها ساخته نشده‌اند.
Deferred items: مدیریت کاربران و نقش‌ها از UI (Phase 14)؛ rate limit مشترک/پایدار (Phase 17).
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
Known limitations: کتابخانه آیکن (`iconAssetId`) فقط در `ARCHITECTURE_AND_DATA_MODEL.md` مشخص شده و **در schema وجود ندارد**؛ ستون و مدل `IconAsset` در Phase 14 ساخته می‌شوند (تصحیح‌شده در ممیزی Phase 14 — پیش‌تر این سطر به‌اشتباه می‌گفت ستون در schema پیش‌بینی شده است)؛ نمایش مختصات فقط عددی است، بدون نقشه واقعی (Phase 4)؛ درخت سازمانی fetch کامل (بدون pagination/lazy loading سمت سرور) — برای مقیاس چندصد گره کافی است، در صورت رشد باید در Phase 17 بازبینی شود؛ دسترسی خواندن (GET) نیز مثل نوشتن فقط Admin است — گسترش به نقش‌های دیگر (مثل Planner برای انتخاب انبار مبدأ) در فاز مربوطه (Phase 7+) اضافه می‌شود.
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
Known limitations: کتابخانه آیکن (`iconAssetId`) هنوز اضافه نشده (طبق تصمیم Phase 2 برای OrganizationUnit، اینجا هم به Phase 14 موکول شد)؛ دسترسی خواندن (GET) نیز مثل نوشتن فقط Admin است، هم‌راستا با محدودیت مشابه Phase 2 — گسترش به Planner برای انتخاب خودرو/نوع بار هنگام برنامه‌ریزی مأموریت در Phase 7+ انجام می‌شود؛ فیلتر/جست‌وجو fetch کامل بدون pagination سمت سرور دارد (مقیاس بزرگ در Phase 17 بازبینی می‌شود)؛ `GET /vehicles/availability` مستند در API_SECURITY (برای بررسی هم‌پوشانی زمانی) پیاده نشد چون به مأموریت (Phase 7) وابسته است.
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
Offline/network verification: assetهای MapLibre (JS+CSS) کاملاً local bundle شده‌اند (بدون کاشی/فونت/آیکن از CDN)؛ NavigationControl از SVG inline (data URI) استفاده می‌کند نه sprite خارجی؛ کاشی‌ها فقط از URL پیکربندی‌شده توسط Admin درخواست می‌شوند. چون این محیط فقط دسترسی اینترنت دارد نه یک tile server داخلی واقعی، اتصال به یک Provider خارجی نمونه (OSM-compatible XYZ، طبق پیشنهاد صریح ADR-016/سند عملیات) تأیید شد؛ آزمون واقعی «قطع اینترنت + Provider داخلی روی LAN» به‌عنوان محدودیت شناخته‌شده ثبت می‌شود (Phase 17 دوباره پوشش می‌دهد).
Known limitations: WMTS فقط در سطح CRUD/schema پشتیبانی می‌شود، منطق واقعی درخواست کاشی WMTS پیاده نشده (طبق عبارت «پشتیبانی اولیه XYZ/TMS» در دامنه فاز، عمدی است). تزریق واقعی API key برای Providerهای `requiresApiKey=true` در درخواست کاشی پیاده نشده — فقط به‌عنوان metadata ذخیره می‌شود. سخت‌گیری کامل SSRF (allowlist hostname/CIDR قابل‌تنظیم، محافظت DNS rebinding) عمداً به Phase 17 موکول شده (طبق IMPLEMENTATION_PLAN)؛ Phase 4 فقط baseline (scheme، placeholder، timeout، redirect:error، content-type/size در test-connection) را پیاده کرده است. تست واقعی «قطع اینترنت + سرور نقشه داخلی روی LAN» در این محیط توسعه ممکن نبود (بدون tile server داخلی واقعی)، در Phase 17 با محیط استقرار واقعی تکرار می‌شود. آیکن اختصاصی هر سطح سازمانی روی نقشه پیاده نشده؛ فعلاً رنگ دایره متمایز است (کتابخانه IconAsset در Phase 14 اضافه می‌شود).
Deferred items: WMTS tile fetching، تزریق کلید API در درخواست کاشی، allowlist/SSRF کامل (Phase 17)، آیکن اختصاصی هر سطح (Phase 14)، آزمون قطع اینترنت با Provider داخلی واقعی (Phase 17)، درون‌ریزی سبک نقشه از فایل Mapnik XML — پیشنهادی، معماری در ADR-022 منجمد شده، نیازمند فاز اجرایی مستقل (پیوست `IMPLEMENTATION_PLAN.md`).
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
Known limitations: فهرست مسیرها fetch کامل بدون pagination سمت سرور دارد (مشابه محدودیت مشابه Phase 2/3، در Phase 17 بازبینی می‌شود). محدودیت حداکثر تعداد نقطه (۱۰,۰۰۰) و حجم فایل (۵MB) درون کد hardcode است، نه یک تنظیم قابل ویرایش از UI (سیستم تنظیمات سراسری هنوز در فاز بعد اضافه نشده). parse فایل CSV بافر کامل را در حافظه می‌خواند (نه streaming واقعی)، اما پیش از parse با محدودیت اندازه فایل بررسی می‌شود. دسترسی خواندن `GET /routes` برای هر سه نقش باز است (طبق ماتریس مجوز PROJECT_SPEC که «مشاهده» را به Viewer می‌دهد). آیکن نقطه شروع/پایان/میانی روی نقشه فقط رنگی است (کتابخانه IconAsset در Phase 14).
Deferred items: pagination سمت سرور فهرست مسیرها، تنظیم قابل‌ویرایش سقف نقطه/حجم فایل CSV (Phase 14 تنظیمات)، streaming واقعی parse فایل بزرگ (در صورت نیاز عملکردی در Phase 17 بازبینی می‌شود)، اتصال Route به Mission (Phase 7).
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
Known limitations: فهرست مرسوله‌ها fetch کامل بدون pagination سمت سرور دارد (محدودیت مشابه فازهای قبل، Phase 17 بازبینی می‌شود). انتخاب مقصد از نوع «گره سازمانی» با یک `<select>` ساده پر از نتایج جست‌وجوی سرور است، نه combobox خودکاره؛ برای درخت سازمانی بزرگ در Phase 16 قابل بهبود است. عدم امکان drag برای اصلاح دقیق مقصد روی نقشه (فقط Tap و ورود مستقیم عدد) — تصمیم عمدی برای جلوگیری از drag تصادفی marker مبدأ (که موقعیتش از انبار می‌آید و نباید قابل جابه‌جایی باشد)، طبق محدودیت مستند در حافظه فنی پروژه. مرسوله هنوز به مأموریت متصل نیست (Phase 7).
Deferred items: pagination سمت سرور، combobox جست‌وجوی پیشرفته مقصد (Phase 16)، اتصال مرسوله به مأموریت (Phase 7)، مشتق‌شدن وضعیت `IN_TRANSIT`/`DELIVERED` از مأموریت فعال (Phase 7+).
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

### Phase 9 — موتور موقعیت تقریبی

Status: DONE
Started: 2026-08-06
Completed: 2026-08-06
Visible output URL: **ندارد.** طبق تصمیم صریح مالک محصول و ADR-024، این فاز هیچ UI ندارد و کاملاً مستقل از React/Next.js UI/کتابخانه نقشه است. «خروجی قابل مشاهده» طبق تعریف بازنگری‌شده در `docs/phase-09-simulation-engine/09-ACCEPTANCE.md`: مجموعه تست خودکار سبز و قطعی. Development Pack کامل پیش از پیاده‌سازی در `docs/phase-09-simulation-engine/` تهیه شده بود و این پیاده‌سازی دقیقاً همان مستندات را دنبال کرد.
Demo account/data: کاربران Admin/Planner/Viewer از فازهای قبل؛ fixtureهای تست با همان الگوی `buildMissionFixtures` فازهای ۷/۸ ساخته شدند.
Branch/PR/Commit: مستقیم روی `main`
Migrations: **ندارد** (طبق `docs/phase-09-simulation-engine/07-DATABASE.md` — موتور شبیه‌سازی صرفاً داده‌های snapshot‌شده فاز ۷ را می‌خواند، هیچ فیلد/جدول جدیدی لازم نداشت).
Key files: `src/lib/domain/mission-simulation.ts` (هسته pure — `calculateMissionGeometry`/`simulateMissionPosition`: binary search روی cumulative distance، interpolation خطی lat/lng، bearing، ETA/remaining، reuse کامل `deriveMissionDisplayStatus` فاز ۷ و `haversineDistanceMeters` فاز ۵ بدون بازنویسی)، `src/server/services/simulation-service.ts` (تنها فایل این فاز که Prisma را فراخوانی می‌کند — `getMissionSimulation`)، `src/lib/validation/simulation.ts` (schema پارامتر `viewTime`)، `src/app/api/v1/missions/[id]/simulate/route.ts` (تنها endpoint فقط-خواندنی جدید، برای سه نقش Admin/Planner/Viewer باز — هم‌تراز دسترسی خواندن `/map`، نه محدودیت سخت‌گیرانه‌تر جهش مأموریت).
Tests executed: `npm run typecheck`، `npm run lint`، `npm run test` (۱۵۵ تست Vitest شامل ۴۰ تست جدید در `mission-simulation.test.ts`: سناریوهای مرزی U1–U23، وضعیت S1–S10، مرزی B1–B3، منفی N1–N2، حافظه M1، همزمانی C1 — دقیقاً مطابق `docs/phase-09-simulation-engine/08-TESTS.md`)، `npm run build` (۴۲ route — دقیقاً یک route جدید، `/api/v1/missions/[id]/simulate`)، `npx playwright test` (اجرای کامل ۴ viewport شامل ۳۶ تست جدید در `tests/e2e/mission-simulation.spec.ts`: مسیر مستقیم، مسیر واقعی چندنقطه‌ای، ۴۰۴/۴۲۲/۴۰۱، پیش‌فرض `viewTime`، دسترسی بیننده وضعیت، انجماد موقعیت پس از لغو — بدون رگرسیون در تست‌های فازهای قبل).
Manual demo steps: طبق `docs/phase-09-simulation-engine/09-ACCEPTANCE.md` §3، این فاز به‌جای سناریوی UI، یک پیمایش اسکریپتی ترمینال دارد: مأموریتی با مسیر شناخته‌شده در چهار لحظه (پیش از شروع، میانه مسیر، لحظه ETA، پس از یک لغو شبیه‌سازی‌شده) شبیه‌سازی و JSON چهار نتیجه بازبینی شد — پیش از شروع (`WAITING`، پیشرفت صفر، موقعیت مبدأ)، میانه مسیر (`IN_PROGRESS`، پیشرفت بین صفر و یک، bearing معنادار)، لحظه ETA (`ARRIVED`، پیشرفت یک، موقعیت مقصد)، پس از لغو (`CANCELLED`، موقعیت منجمد در لحظه لغو) — همگی مطابق انتظار.
Offline/network verification: بدون وابستگی جدید؛ کل فاز محاسبه سرور-داخلی روی داده از قبل در PostgreSQL محلی است، بدون هیچ فراخوانی شبکه‌ای جدید.
Known limitations: طبق `docs/phase-09-simulation-engine/11-OUT_OF_SCOPE.md` — بدون رندر نقشه (فاز ۱۰)، بدون صفحه simulation-lab (به تصمیم فاز ۱۰ موکول شد)، بدون endpoint شبیه‌سازی دسته‌ای چند-مأموریتی (فاز ۱۰ طراحی می‌کند)، بدون caching (نیازی در مقیاس فعلی احساس نشد)، interpolation خطی lat/lng نه geodesic-exact (طبق ADR-P9-02 پذیرفتنی).
Deferred items: رندر نقشه عملیاتی و marker متحرک (Phase 10)، تصمیم درباره صفحه simulation-lab (Phase 10)، سیکر زمان تاریخی (Phase 12)، endpoint شبیه‌سازی دسته‌ای (Phase 10، در صورت نیاز).
Decisions added/changed: این فاز خودش یک Development Pack کامل (۱۶ سند، `docs/phase-09-simulation-engine/`) با ADR-P9-01 تا ADR-P9-09 دارد که پیش از این پیاده‌سازی نوشته شد؛ ADR-024 (سند اصلی `docs/DECISIONS.md`) نیز همان تصمیم حذف UI از این فاز را ثبت کرده است. هیچ تصمیم معماری جدیدی حین پیاده‌سازی لازم نشد — پیاده‌سازی دقیقاً طبق مستندات از پیش نوشته‌شده انجام شد، بدون انحراف.

### Phase 10 — نقشه عملیاتی پایه و حرکت خودروها

Status: DONE
Started: 2026-08-06
Completed: 2026-08-06
Visible output URL: `/map` (همه نقش‌های احرازهویت‌شده: Admin، STATUS_VIEWER، MISSION_PLANNER) — همان صفحه فازهای ۴/۸، اکنون با marker خودروهای مأموریت‌دار در موقعیت تقریبی. طبق ADR-025 عنوان شیپ‌شده «نقشه عملیات» (نه «نمای پایش» از اسناد مرجع) عمداً حفظ شد.
Demo account/data: کاربران Admin/Planner/Viewer از فازهای قبل؛ برای دمو حداقل یک مأموریت `SCHEDULED` (فاز ۷/۸) لازم است — این فاز هیچ داده مرجع جدیدی معرفی نمی‌کند.
Branch/PR/Commit: مستقیم روی `main`
Migrations: **ندارد.** این فاز صرفاً مصرف‌کننده خروجی موتور فاز ۹ (`simulateMissionPosition`/`calculateMissionGeometry`، بدون تغییر) است؛ هیچ فیلد/جدول جدیدی لازم نشد.
Key files: `src/server/services/map-scene-service.ts` (تابع `getMapScene` — حلقه روی مأموریت‌های `SCHEDULED`/`deletedAt:null` و فراخوانی موتور فاز ۹ برای هرکدام؛ منطق شبیه‌سازی دسته‌ای که فاز ۹ صراحتاً به این فاز موکول کرده بود)، `src/app/api/v1/map/scene/route.ts` (endpoint فقط-خواندنی، همان سه نقش `/map`)، `src/features/map/types.ts` (`MapSceneMission`/`MapScene`)، `src/features/map/mission-marker-styles.ts` (رنگ marker بر اساس وضعیت نمایشی)، `src/features/map/api.ts`/`use-map-queries.ts` (`useMapScene` با `refetchInterval` پنج‌ثانیه‌ای در حالت زنده، غیرفعال هنگام `viewTime` ثابت)، `src/features/map/maplibre-map-inner.tsx` (marker خودرو DOM-based با SVG ساخته‌شده یک‌بار و به‌روزرسانی attribute-only برای جلوگیری از churn هر ۵ ثانیه، لایه خط مسیر/خط مستقیم منتخب، marker پرچم مبدأ/مقصد highlight)، `src/features/map/mission-detail-panel.tsx` (پنل جزئیات با برچسب اجباری «نمای زنده محاسباتی»)، `src/features/map/map-view.tsx` (سیم‌کشی: مخفی‌کردن خودروها در حالت ساخت مأموریت فاز ۸، sync انتخاب marker↔پنل، محاسبه پیش‌نمایش مسیر منتخب با fallback خط مستقیم هنگام نبود مسیر یا در حین lazy-load).
Tests executed: `npm run typecheck`، `npm run lint` (بدون خطا؛ ۲ warning از پیش‌موجود در `map-provider-form.tsx`/`organization-form.tsx` نامرتبط به این فاز)، `npm run test` (۱۵۵ تست Vitest — بدون تست واحد جدید؛ این فاز فقط از توابع pure فاز ۹/۵/۷ بدون تغییر استفاده مجدد می‌کند)، `npm run build` (موفق؛ یک route جدید: `/api/v1/map/scene`)، `npx playwright test tests/e2e/map-scene.spec.ts` (۲۰ تست در ۴ viewport: صحنه در سه لحظه پیش از شروع/میانه مسیر/پس از ETA با وضعیت و موقعیت درست، `isFallbackDirect=true` برای مأموریت بدون مسیر، دسترسی خواندن STATUS_VIEWER، رد ۴۰۱ بدون ورود، و یک سناریوی کامل UI: کلیک روی marker خودرو → باز شدن پنل جزئیات با برچسب «نمای زنده محاسباتی» و یادداشت «بدون مسیر تعریف‌شده»)، سپس اجرای کامل رگرسیون `npx playwright test` روی همه فایل‌های موجود بدون خطای جدید.
Manual demo steps: ورود Admin/Planner؛ انتشار سه مأموریت — یکی با مسیر واقعی، یکی بدون مسیر (fallback خط مستقیم)، یکی با `startAt` گذشته (برای مشاهده «رسیده»)؛ ورود به `/map` → مشاهده marker رنگی هر خودرو با جهت حرکت و برچسب دائمی «نمای زنده محاسباتی — موقعیت‌ها تقریبی هستند»؛ کلیک روی marker → پنل جزئیات (مبدأ←مقصد، ETA، پیشرفت، مرسوله‌ها) و ترسیم مسیر/خط‌چین منتخب با highlight مبدأ/مقصد باز می‌شود؛ کلیک دوباره یا دکمه «بستن» برای خروج از انتخاب.
Offline/network verification: بدون سرویس خارجی اضافه؛ همان MapProvider پیکربندی‌شده فاز ۴؛ refresh پنج‌ثانیه‌ای صرفاً `GET /api/v1/map/scene` داخلی را دوباره فرامی‌خواند، بدون درخواست شبکه‌ای جدید به بیرون؛ موقعیت محاسبه‌شده هرگز در DB نوشته نمی‌شود (طبق قاعده صریح CLAUDE.md بخش ۲).
Known limitations: طبق دامنه مصوب فاز ۱۰ (`IMPLEMENTATION_PLAN.md`) — بدون جدول مأموریت کنار نقشه و همگام‌سازی متقابل جدول/نقشه (Phase 11)، بدون فیلتر عملیاتی (Phase 11)، بدون سیکر زمان تاریخی/آینده با UI (Phase 12؛ فقط پارامتر `viewTime` سطح API از فاز ۹ موجود است)، بدون clustering برای خودروها (تراکم فعلی کم است؛ در صورت نیاز واقعی به Phase 16 موکول می‌شود)، آیکن اختصاصی خودرو (کتابخانه IconAsset، Phase 14) هنوز جایگزین SVG ساده فعلی نشده. Development Pack شانزده‌سندی این فاز (طبق درخواست صریح) فقط تا `00-README.md` تکمیل شد و پیاده‌سازی مستقیماً بر اساس آن به‌علاوه اسناد الزام‌آور موجود انجام شد — جزئیات در ADR-025.
Deferred items: جدول مأموریت + همگام‌سازی متقابل نقشه/جدول (Phase 11)، فیلترهای عملیاتی (Phase 11)، UI سیکر زمان تاریخی/آینده (Phase 12)، clustering خودرو در صورت نیاز مقیاس (Phase 16)، آیکن اختصاصی خودرو (Phase 14).
Decisions added/changed: ADR-025 اضافه شد — تصمیم تکمیل مستقیم فاز ۱۰ به‌جای ادامه Development Pack شانزده‌سندی (پس از تأیید صریح مالک محصول برای پیاده‌سازی مستقیم)، و حفظ عنوان شیپ‌شده «نقشه عملیات» به‌جای «نمای پایش» اسناد مرجع.

### Phase 11 — جدول مأموریت، انتخاب متقابل و فیلترها

Status: DONE
Started: 2026-08-06
Completed: 2026-08-06
Visible output URL: `/map` (همه نقش‌های احرازهویت‌شده) — همان صفحه فاز ۱۰، اکنون با جدول مأموریت‌های فعال کنار نقشه (دسکتاپ/تبلت) یا در bottom sheet (موبایل)، پنل فیلتر (inline دسکتاپ، Sheet تبلت/موبایل)، جست‌وجوی سریع، مرتب‌سازی ستون‌ها، فیلتر context-menu مبدأ/مقصد از marker انبار و chip فیلترهای فعال.
Demo account/data: کاربران Admin/Planner/Viewer از فازهای قبل؛ برای دمو حداقل چند مأموریت `SCHEDULED` (فاز ۷/۸) با نوع خودرو/مبدأ متفاوت لازم است — این فاز هیچ داده مرجع جدیدی معرفی نمی‌کند.
Branch/PR/Commit: مستقیم روی `main`
Migrations: **ندارد.** فقط یک فیلد افزوده‌ای در پاسخ سرویس موجود: `MapSceneMission.shipmentTrackingCodes` (کد رهگیری مرسوله‌های هر مأموریت، برای جست‌وجوی سریع) — از داده‌ای که `map-scene-service.ts` فاز ۱۰ همین حالا fetch می‌کرد مشتق شد، بدون کوئری/فیلد DB جدید.
Key files: `src/lib/domain/mission-interaction-rules.ts` (توابع pure فیلتر/جست‌وجو/مرتب‌سازی روی `MapSceneMission[]` — بدون محاسبه موقعیت/فاصله)، `src/features/map/use-mission-interaction.ts` (hook مشترک انتخاب+فیلتر+جست‌وجو+مرتب‌سازی+ستون‌ها+نمای‌ذخیره‌شده+صفحه‌بندی، جایگزین `selectedMissionId` محلی فاز ۱۰)، `src/features/map/mission-table-columns.ts`، `src/features/map/operational-mission-table.tsx` (جدول دسکتاپ/تبلت + کارت موبایل، ستون قابل‌مرتب‌سازی، منوی هر ردیف، ناوبری کیبورد)، `src/features/map/mission-filter-panel.tsx` (فرم فیلتر + chip فعال + نماهای ذخیره‌شده نشست)، `src/features/map/maplibre-map-inner.tsx` (دکمه فیلتر مبدأ/مقصد داخل popup marker انبار)، `src/features/map/map-view.tsx` (سیم‌کشی کامل + layout واکنش‌گرا)، `src/server/services/map-scene-service.ts`/`src/features/map/types.ts` (افزودن `shipmentTrackingCodes`)، `src/components/ui/icons.tsx` (آیکن‌های `filter`/`sort`/`more-vertical`).
Tests executed: `npm run typecheck`، `npm run lint` (بدون خطا؛ همان ۲ warning پیش‌موجود نامرتبط)، `npm run test` (۱۸۳ تست Vitest شامل ۲۸ تست جدید `mission-interaction-rules.test.ts`: فیلتر هر شرط به‌تنهایی و ترکیبی AND، preset‌های زمانی/دیرکرد، جست‌وجو، مرتب‌سازی پایدار با tie-break، خط لوله کامل قطعی)، `npm run build` (موفق؛ بدون route جدید — فاز ۱۱ کاملاً سمت کلاینت است)، `npx playwright test tests/e2e/mission-interaction.spec.ts` (۲۸ تست در ۴ viewport، ۲ مورد به‌طور عمدی روی موبایل skip: مرتب‌سازی ستون و تست کیبورد Enter/Escape، چون نمای کارت موبایل معادل جدول قابل‌مرتب‌سازی/کیبوردی ندارد؛ پوشش شامل همگام‌سازی marker↔ردیف دوطرفه، فیلتر نوع خودرو روی جدول و marker‌های نقشه هم‌زمان، جست‌وجوی سریع، فیلتر مبدأ از پنل، دسترسی نقش بیننده وضعیت)، سپس اجرای کامل رگرسیون `npx playwright test` روی همه فایل‌های موجود (تکرار با `--workers=1` برای تفکیک رگرسیون واقعی از ناپایداری resource-contention شناخته‌شده این محیط). رگرسیون یک باگ واقعی responsive آشکار کرد و رفع شد: کلاس `flex-1` بدون قید breakpoint روی Panel نقشه، داخل container والد `flex flex-col xl:flex-row`، زیر `xl:` (موبایل/تبلت/دسکتاپ ۱۰۲۴) روی محور اصلی عمودی flex-basis را صفر می‌کرد و ارتفاع نقشه را تقریباً به صفر فشرده می‌ساخت (فقط در `xl:flex-row` که flex-1 درست روی عرض اثر می‌گذاشت، بی‌خطا بود) — با تغییر به `xl:flex-1` (فقط در حالت ردیف فعال) رفع شد؛ چند assertion در `tests/e2e/map-scene.spec.ts` هم به‌روزرسانی شد چون جدول جدید فاز ۱۱ متن مشابه (شناسه خودرو/وضعیت/مسیر) را در panel دسکتاپ (همیشه mount) تکرار می‌کند و `.first()`/بدون فیلتر دیگر یکتا نبود.
Manual demo steps: ورود Admin/Planner؛ انتشار چند مأموریت با نوع خودرو/مبدأ متفاوت؛ ورود به `/map` → مشاهده جدول مأموریت‌های فعال کنار نقشه؛ کلیک «فیلترها» → تنظیم فیلتر نوع خودرو → مشاهده هم‌زمان محدودشدن جدول و marker‌های نقشه؛ جست‌وجوی کد مأموریت در جعبه جست‌وجوی سریع؛ کلیک روی marker یک خودرو → highlight ردیف متناظر و باز شدن پنل جزئیات؛ کلیک روی سرستون «وضعیت» یا «ETA» برای مرتب‌سازی؛ کلیک راست‌کلیک/tap روی marker انبار برای دکمه «فیلتر مبدأ از این نقطه»؛ در عرض موبایل، دکمه شناور «نمایش فهرست مأموریت‌ها» و Sheet تمام‌صفحه فیلتر را بررسی کنید.
Offline/network verification: بدون سرویس خارجی اضافه؛ فیلتر/جست‌وجو/مرتب‌سازی کاملاً سمت کلاینت روی همان داده Scene فاز ۱۰ (بدون فراخوانی شبکه جدید)؛ تنها منبع داده هنوز `GET /api/v1/map/scene` داخلی پنج‌ثانیه‌ای است.
Known limitations: طبق ADR-027 — نمای ذخیره‌شده فقط برای نشست مرورگر جاری است، با رفرش از بین می‌رود (persist شدن به Phase 14 موکول شد). صفحه‌بندی «نمایش بیشتر» (اندازه ۲۰) به‌جای virtualization واقعی استفاده شد؛ برای دهها-صدها مأموریت هم‌زمان کافی است. نمای موبایل (کارت) فاقد سرستون‌های قابل‌مرتب‌سازی و ناوبری کیبوردی ردیف است (محدودیت شناخته‌شده، دو تست مربوطه روی موبایل عمداً skip شدند). Development Pack شانزده‌سندی این فاز فقط تا `00-README.md` تکمیل شد؛ جزئیات در ADR-027.
Deferred items: persist شدن نمای ذخیره‌شده بین نشست‌ها (Phase 14)، virtualization واقعی جدول در صورت نیاز مقیاس بزرگ، ستون‌های قابل‌مرتب‌سازی/ناوبری کیبورد در نمای کارت موبایل، فیلتر سمت سرور در صورت رشد بسیار بزرگ تعداد مأموریت هم‌زمان.
Decisions added/changed: ADR-027 اضافه شد — محل نگهداری state تعامل (custom hook تک‌فایلی، نه Context)، فیلتر/جست‌وجو/مرتب‌سازی کاملاً سمت کلاینت، نمای ذخیره‌شده فقط-نشست، و عدم افزودن کتابخانه جدول/virtualization جدید (صفحه‌بندی ساده به‌جای آن).

### Phase 12 — موتور زمان‌بندی (سیکر زمان زنده و تاریخی)

Status: DONE
Started: 2026-08-06
Completed: 2026-08-06
Visible output URL: `/map` (همه نقش‌های احرازهویت‌شده) — همان صفحه فاز ۱۰/۱۱، اکنون با نوار زمان (Timeline Seeker) زیر نقشه: نشانگر حالت زنده/تاریخی، دکمه‌های گام ±۵/±۱۵ دقیقه، Play/Pause، انتخاب سرعت ۰.۲۵×–۸×، ورود مستقیم ساعت:دقیقه، slider درگ‌پذیر و دکمه «بازگشت به اکنون».
Demo account/data: کاربران Admin/Planner/Viewer از فازهای قبل؛ برای دمو حداقل یک مأموریت `SCHEDULED` با ETA در گذشته یا آینده نزدیک لازم است تا اثر بازسازی زمانی/رسیدن قابل مشاهده باشد — این فاز هیچ داده مرجع جدیدی معرفی نمی‌کند.
Branch/PR/Commit: مستقیم روی `main`
Migrations: **ندارد.** این فاز کاملاً سمت کلاینت است؛ هیچ فیلد/جدول DB جدیدی اضافه نشد. تنها تغییر غیر-UI یک اصلاح رفتار cache در `useMapScene` موجود فاز ۱۰ بود (`placeholderData`، بدون تغییر schema/query خود endpoint).
Key files: `src/lib/domain/timeline-rules.ts` (توابع pure: `defaultTimeRange`، `clampToRange`، `advanceBySpeed`، `percentForTime`/`timeForPercent`، `stepMinutes` — بدون DB/React، با ۱۸ تست واحد)، `src/lib/dates/jalali.ts` (افزوده شد: `tehranCalendarDayRange`/`UtcRange`، استخراج‌شده از فاز ۱۱ برای استفاده مشترک)، `src/features/map/use-timeline-engine.ts` (hook حالت Live/Historical + Playback، تیک پخش با `setInterval` هزارمیلی‌ثانیه‌ای)، `src/features/map/timeline-seeker.tsx` (UI نوار زمان)، `src/features/map/map-view.tsx` (سیم‌کشی `timeline.viewTimeParam` به `useMapScene`، بستن خودکار Playback هنگام ورود به حالت ساخت مأموریت)، `src/features/map/use-map-queries.ts` (افزودن `placeholderData: keepPreviousData` به `useMapScene` — رفع یک رگرسیون واقعی کشف‌شده حین آزمون، نه صرفاً کد فاز ۱۲؛ جزئیات در ADR-028)، `src/components/ui/icons.tsx` (آیکن‌های `play`/`pause`/`skip-back`/`skip-forward`).
Tests executed: `npm run typecheck`، `npm run lint` (بدون خطا؛ همان ۲ warning پیش‌موجود نامرتبط)، `npm run test` (۲۰۱ تست Vitest شامل ۱۸ تست جدید `timeline-rules.test.ts`: clamp/advance/percent-time roundtrip، گام‌های زمانی مرزی، بازه پیش‌فرض)، `npm run build` (موفق؛ بدون route جدید)، `npx playwright test tests/e2e/timeline-engine.spec.ts` (۲۸ تست در ۴ viewport: پیش‌فرض زنده، پرش-به-زمان تا پس از ETA و نمایش «رسیده»، بازگشت به اکنون، Play/Pause، گام‌های ۵/۱۵ دقیقه، اجبار بازگشت به زنده هنگام ورود به حالت ساخت مأموریت، دسترس‌پذیری کیبورد نوار زمان). سپس اجرای کامل رگرسیون `npx playwright test` روی همه فایل‌های موجود: با `--workers=2` با خطای Node `Zone Allocation failed - process out of memory` قطع شد؛ تکرار با `--workers=1` بعد از ~۲۰ دقیقه با فرایند dev server طولانی‌عمر (نگه‌داشته‌شده توسط `reuseExistingServer: true` در طول این نشست چندساعته) از کار افتاد — تمام تست‌های بعد از آن لحظه، حتی سناریوهای پایه فاز ۱ (ورود ساده)، با `net::ERR_CONNECTION_REFUSED` شکست خوردند که خودش اثبات می‌کند علت تخلیه حافظه فرایند dev server تحت بار انباشته این نشست طولانی است، نه رگرسیون کد فاز ۱۲. برای تفکیک قطعی، فقط فایل‌هایی که از hook مشترک تغییریافته (`useMapScene`) استفاده می‌کنند با dev server تازه (بعد از مرگ فرایند قبلی) دوباره اجرا شدند: `npx playwright test tests/e2e/map-scene.spec.ts tests/e2e/mission-interaction.spec.ts tests/e2e/mission-map-create.spec.ts --workers=1` — همه ۵۸ تست در هر ۴ viewport موفق (۲ مورد skip عمدی از پیش‌موجود فاز ۱۱)، که عدم رگرسیون تغییر `placeholderData` را قطعی می‌کند.
Manual demo steps: ورود Admin/Planner؛ انتشار یک مأموریت با ETA نزدیک؛ ورود به `/map` → مشاهده برچسب «نمای زنده محاسباتی» زیر نقشه و روی نوار زمان؛ کلیک روی marker خودرو برای انتخاب؛ درگ نوار زمان یا کلیک دکمه‌های گام برای مشاهده بازسازی هم‌زمان marker و ردیف جدول در آن لحظه با برچسب «بازسازی زمانی»؛ کلیک Play برای پخش خودکار و Pause برای توقف؛ کلیک «بازگشت به اکنون»؛ ورود به «ساخت مأموریت از نقشه» حین Playback فعال برای مشاهده بازگشت خودکار به زنده.
Offline/network verification: بدون سرویس خارجی اضافه؛ نوار زمان فقط پارامتر `viewTime` متفاوتی به همان `GET /api/v1/map/scene` داخلی فاز ۱۰ می‌دهد — هیچ endpoint یا وابستگی شبکه جدیدی معرفی نشد.
Known limitations: طبق ADR-028 — بازه زمانی هنوز محدود به یک روز تقویمی جلالی است (بدون UI صفحه‌بندی چندروزه). ترجیحات Playback/Timeline (حالت، سرعت، آخرین لحظه) بین بارگذاری‌های صفحه persist نمی‌شوند و همیشه به‌طور قطعی به Live بازمی‌گردند (تصمیم عمدی محصولی، نه محدودیت فنی). Development Pack شانزده‌سندی این فاز فقط تا `00-README.md` تکمیل شد؛ جزئیات در ADR-028.
Deferred items: بازه زمانی چندروزه با pagination (طبق `PROJECT_SPEC.md` §10)، persist شدن ترجیحات Playback بین نشست‌ها (در صورت تصمیم محصولی آینده)، bookmark زمانی/ضبط پخش/همگام‌سازی چندکاربره (نقاط توسعه آینده طبق Special Requirements سند پیش‌نویس).
Decisions added/changed: ADR-028 اضافه شد — محل state موتور زمان‌بندی و ترتیب آن نسبت به فاز ۱۱، مکانیزم تیک پخش (`setInterval` هزارمیلی‌ثانیه‌ای)، خارج از دامنه ماندن بازه چندروزه، بدون persistence ترجیحات، اجبار بازگشت به زنده هنگام ورود به حالت ساخت مأموریت، به‌علاوه اصلاح `placeholderData: keepPreviousData` در `useMapScene` (رگرسیون کشف‌شده حین آزمون).

### Phase 13 — فرانمای وضعیت مدیریتی

Status: DONE
Started: 2026-08-07
Completed: 2026-08-07
Visible output URL: `/dashboard` (هر سه نقش احرازهویت‌شده) — جایگزین کامل صفحه placeholder فاز ۱؛ اکنون هفت widget واقعی: شمارنده مأموریت/ناوگان/مرسوله، نمودار دونات توزیع وضعیت مأموریت، دو نمودار میله‌ای (توزیع ناوگان بر نوع خودرو، مأموریت بر نوع خودرو) و خلاصه شبکه سازمانی؛ به‌همراه انتخاب بازه زمانی، «آخرین به‌روزرسانی» شمسی، به‌روزرسانی خودکار/دستی و تنظیم چیدمان.
Demo account/data: کاربران Admin/Planner/Viewer از فازهای قبل؛ برای دمو چند خودرو، مرسوله و مأموریت با وضعیت‌های مختلف لازم است — این فاز هیچ داده مرجع جدیدی معرفی نمی‌کند.
Branch/PR/Commit: مستقیم روی `main`
Migrations: **ندارد.** هیچ فیلد/جدول جدیدی اضافه نشد؛ فرانما فقط از داده‌های موجود می‌خواند و طبق ADR-005 هیچ آماری در DB ذخیره یا cache نمی‌شود.
Key files: `src/lib/domain/dashboard-rules.ts` (توابع محض شمارش/توزیع/دونات/بازه با ۲۸ تست واحد)، `src/lib/domain/mission-labels.ts` (برچسب وضعیت، منتقل‌شده از لایه UI تا سرور بدون شکستن مرز لایه‌ها از آن استفاده کند)، `src/server/services/dashboard-service.ts` (سرویس واحد آمار — وضعیت مأموریت با `deriveMissionDisplayStatus` مشتق می‌شود نه `count` روی `persistedStatus`)، `src/lib/validation/dashboard.ts`، `src/app/api/v1/dashboard/summary/route.ts` (هر سه نقش)، `src/features/dashboard/*` (types, api, use-dashboard-queries, use-dashboard-layout, widget-catalog, dashboard-view, dashboard-widget, dashboard-kpi-card, dashboard-charts)، `src/app/(dashboard)/dashboard/page.tsx` (بازنویسی کامل + مجوزهای نقش‌محور drill-down)، `src/lib/navigation/use-search-param-seed.ts` (بذر یک‌باره فیلتر از query string)، `src/app/globals.css` (لایه ظاهری `dashboard-widget`/`dashboard-kpi` با `--color-panel-glow`)، `src/components/ui/icons.tsx` (آیکن‌های `chart-donut`/`chart-bar`/`refresh`/`layout`). صفحات مقصد drill-down (`missions-list-view.tsx`، `shipments-list-view.tsx`، `vehicle-fleet-view.tsx`، `use-mission-interaction.ts`، `map-view.tsx`) فقط مقدار *اولیه* فیلتر موجودشان را از query string می‌گیرند؛ هیچ فیلتر جدیدی اضافه نشد.
Tests executed: `npm run typecheck`، `npm run lint` (بدون خطا؛ همان ۲ warning پیش‌موجود نامرتبط)، `npm run test` (۲۲۹ تست Vitest شامل ۲۸ تست جدید `dashboard-rules.test.ts`: مرزهای دقیق `startAt`/ETA، ثبات وضعیت‌های غیرزمانی، جمع سطل‌ها برابر total، مرتب‌سازی قطعی با tie-break، تقسیم بر صفر، بستن کامل محیط دونات بدون انباشت خطای گردکردن، بازه‌های تقویمی و غلتان)، `npm run build` (موفق؛ route جدید `ƒ /api/v1/dashboard/summary` ثبت شد و هیچ خطای Suspense برای `useSearchParams` رخ نداد)، `npx playwright test tests/e2e/situation-dashboard.spec.ts` (**۶۰ تست، هر ۱۵ سناریو در هر ۴ viewport، همه موفق**): رندر هفت widget، جابه‌جایی دقیقاً یک‌واحدی هر شمارنده پس از انتشار یک مأموریت واقعی، انتقال همان مأموریت از «در انتظار» به «رسیده» صرفاً با تغییر `viewTime`، برابری مجموع قطاع‌ها با total، محدودشدن اعداد با بازه «امروز» و *عدم* تأثیر بازه روی آمار ناوگان/سازمان، drill-down به نقشه و به فهرست خودرو با فیلتر از پیش تنظیم‌شده، نادیده‌گرفتن بی‌صدای query string نامعتبر، دسترسی هر سه نقش با پنهان‌بودن لینک‌های مدیریتی برای بیننده وضعیت، ماندگاری پنهان‌کردن و ترتیب widget پس از reload، به‌روزرسانی دستی، و ۴۰۱/۴۲۲ endpoint.
Regression suite result: اجرای کامل `npx playwright test` (۳۴۰ تست) با ۱۷ شکست تمام شد که همه ریشه‌یابی شدند:
- **یک رگرسیون واقعی از همین فاز (۴ شکست، هر ۴ viewport):** `auth.spec.ts:6` که assert می‌کند پس از ورود، کاربر heading «خوش آمدید، {username}» و نقش‌هایش را می‌بیند. بازنویسی `/dashboard` این دو را که از فاز ۱ شیپ شده بودند حذف کرده بود. **رفع شد** با بازگرداندن خوشامد و badge نقش‌ها در header فرانما (نه با تغییر تست، چون این یک قرارداد شیپ‌شده است). این رفع خودش یک باگ دوم را آشکار کرد: import کردن `@/lib/permissions/roles` در کامپوننت `"use client"` کل Prisma client (و `node:module`) را وارد bundle مرورگر می‌کند — `tsc` قبول می‌کند ولی build با Turbopack می‌شکند؛ برچسب نقش‌ها اکنون در server component ترجمه و به‌صورت رشته ساده پاس داده می‌شود.
- **۱۳ شکست پیش‌موجود/محیطی (نه ناشی از فاز ۱۳)،** که با اجرای همان تست‌ها روی worktree جداگانه‌ای از commit پیش از فاز ۱۳ (`4ceecac`) اثبات شد: `fleet.spec.ts:18` دقیقاً با همان locator روی baseline هم شکست می‌خورد؛ `organization.spec.ts:18` روی هر ۴ viewport در baseline هم شکست می‌خورد (و فاز ۱۳ اصلاً هیچ فایلی در `features/organization` را تغییر نداده)؛ `mission-interaction.spec.ts:166` در اجرای ایزوله روی هر دو نسخه دقیقاً یک شکست یکسان روی `mobile-360` می‌دهد (شکست‌های اضافه‌اش فقط در اجرای کامل ۳۴۰تایی زیر بار ظاهر می‌شوند)؛ دو شکست `timeline-engine` هم فقط در همان اجرای پرباز ظاهر شدند و در اجرای ایزوله ۶۰/۶۰ سبز بودند.
- امضای مشترک این شکست‌های پیش‌موجود یکی است: **رکورد تازه‌ساخته‌شده در فهرستی که حالا هزاران سطر دارد پیدا نمی‌شود** — DB اشتراکی این محیط توسعه در طول جلسات آزمون به ۶٬۴۲۹ گره سازمانی، ۱٬۲۲۹ خودرو و ۱٬۰۴۶ مأموریت رسیده و صفحات درخت سازمانی/ناوگان طبق محدودیت شناخته‌شده فاز ۲/۳ هنوز pagination ندارند. این یک مسئله مقیاس واقعی است، ولی خارج از دامنه فاز ۱۳.

Manual demo steps: ورود Admin → `/dashboard` → مشاهده شمارنده‌ها و نمودارها با «آخرین به‌روزرسانی» شمسی؛ تغییر بازه به «امروز» و مشاهده تغییر اعداد مأموریت در حالی که «کل خودروها» ثابت می‌ماند؛ کلیک روی کارت «در حال حرکت» → انتقال به نقشه عملیات با chip فیلتر «وضعیت: در حال حرکت»؛ بازگشت و کلیک «چیدمان» → پنهان‌کردن یک widget و جابه‌جایی یکی دیگر → رفرش صفحه و مشاهده ماندگاری → «بازگرداندن چیدمان پیش‌فرض»؛ ورود با نقش بیننده وضعیت و تأیید اینکه اعداد دیده می‌شوند ولی کارت‌های ناوگان/سازمان لینک ندارند.
Offline/network verification: هیچ سرویس خارجی، CDN، فونت یا کتابخانه نموداری اضافه نشد — نمودارها SVG درون‌خطی دست‌ساز هستند. تنها منبع داده `GET /api/v1/dashboard/summary` داخلی است؛ به‌روزرسانی خودکار ۳۰ ثانیه‌ای (نه ۵ ثانیه نقشه) و با انتخاب کاربر قابل خاموش‌کردن.
Known limitations: طبق ADR-029 — بازه زمانی فقط روی مأموریت‌ها (بر اساس `startAt`) اعمال می‌شود؛ آمار ناوگان/مرسوله/سازمان عمداً «وضعیت جاری» و مستقل از بازه هستند. در نتیجه شمارنده «شروع در ۲۴ ساعت آینده» هم مثل بقیه شمارنده‌های مأموریت تابع بازه است: با بازه پیش‌فرض `ALL` عدد کامل و دقیق است، ولی مثلاً با «امروز» فقط مأموریت‌هایی را می‌شمارد که هم امروز و هم در ۲۴ ساعت آینده شروع می‌شوند (یعنی «باقی امروز»). این رفتار سازگار است — همه شمارنده‌های آن widget به یک بازه محدودند — ولی هنگام تفسیر عدد باید در نظر گرفته شود. تغییر اندازه widget پیاده نشد (فقط نمایان‌بودن و ترتیب). چیدمان فقط روی همان مرورگر ذخیره می‌شود، نه در DB و نه بین دستگاه‌ها. سرویس آمار برای شمارش وضعیت‌های محاسباتی همه رکوردهای مأموریت بازه را با `select` باریک می‌خواند؛ این عمدی است (تنها راه استفاده مجدد از تابع دامنه به‌جای منطق موازی SQL) و از کوئری موجود `getMapScene` سبک‌تر است، ولی در مقیاس دهها هزار مأموریت هم‌زمان باید بازبینی شود. Development Pack شانزده‌سندی این فاز اصلاً تولید نشد؛ تنها مصنوع برنامه‌ریزی `PRE_IMPLEMENTATION_DEPENDENCY_REVIEW.md` است.
Deferred items: تغییر اندازه widget و داشبورد سفارشی چندصفحه‌ای، حالت wallboard/تمام‌صفحه، persist چیدمان در DB برای همگام‌سازی بین دستگاه‌ها (Phase 14 محدوده منطقی آن است)، widgetهای تحلیلی/پیش‌بینی و insight خودکار، نمودار روند زمانی (سری زمانی مرسوله رسیده) که نیازمند تجمیع تاریخی است، هشدارهای تداخل مأموریت و داده ناقص (`PROJECT_SPEC.md` §۱۱).
Decisions added/changed: ADR-029 اضافه شد — منبع اعداد مأموریت (وضعیت محاسبه‌شده به‌جای `persistedStatus`)، endpoint اختصاصی به‌جای بازاستفاده از `summary`های موجود با گیت نقشی ناسازگار، تفکیک persist (چیدمان بله، بازه/حالت خیر)، drill-down یک‌طرفه و یک‌باره، نمودار بدون dependency جدید، جابه‌جایی چیدمان با دکمه به‌جای drag & drop، عدم انیمیشن شمارنده JS، و اثر شیشه‌ای نامتقارن بین دو theme. همچنین انتقال `missionDisplayStatusLabel` به لایه domain برای حفظ مرز لایه‌ها.

## ممیزی عرضی فازهای ۰ تا ۱۳ (۲۰۲۶-۰۸-۰۸)

یک بازبینی سراسری روی همه فازهای پیاده‌سازی‌شده انجام شد (نه یک فاز جدید). سه دسته یافته و اقدام:

### الف) نقص واقعی داده: شمارنده‌های خلاصه با «کل» جمع نمی‌شدند — **رفع شد**

`getShipmentSummary` مقدار `total` را روی هر پنج وضعیت می‌شمرد ولی فقط سه سطل تفکیک برمی‌گرداند؛ یعنی مرسوله‌های `DRAFT` و `CANCELLED` در «کل» بودند اما در هیچ کارتی دیده نمی‌شدند. روی داده واقعی همین محیط، **۴۰۷ مرسوله پیش‌نویس نامرئی بودند** (کل ۱٬۵۷۷ در برابر ۱٬۱۷۰ نمایش‌داده‌شده) و کاربر هیچ راهی نداشت بفهمد مابه‌التفاوت کجاست.

`getMissionSummary` همان ایراد ساختاری را داشت (`ARCHIVED` شمرده نمی‌شد) ولی امروز فقط به‌طور *تصادفی* جمع می‌شد، چون هیچ کدی آن مقدار را نمی‌نویسد — و فاز ۱۵ با افزودن وضعیت‌های پایانی، بی‌صدا آن را می‌شکست.

اقدام: هر دو سرویس به یک `groupBy` روی وضعیت تبدیل شدند تا جمع سطل‌ها **ساختاراً** برابر `total` باشد، نه اتفاقی (و یک رفت‌وبرگشت DB به‌جای چهار/پنج count موازی). صفحه مرسوله‌ها اکنون هر شش کارت را نشان می‌دهد. نمایش وضعیت‌های جدید مأموریت در UI به فاز ۱۵ واگذار شد (بند S31 همان پک) تا کارت دائماً صفر اضافه نشود.

### ب) نقص مستندات: ارجاعات کهنه شماره فاز — **رفع شد**

هنگام درج فاز ۱۵ و جابه‌جایی فازهای ۱۵–۱۷ به ۱۶–۱۸، فقط عنوان‌ها و ردیف‌های جدول به‌روز شده بودند و **~۲۵ ارجاع درون‌متنی در ۸ فایل** با شماره قدیمی مانده بود. اثر عملی: «Phase 15» در متن به «ریسپانسیو» اشاره می‌کرد ولی خواننده به «چرخه عمر مأموریت» می‌رسید. همه ارجاعات در `PHASE_STATUS.md`، `IMPLEMENTATION_PLAN.md`، `docs/mockups/README.md` و پک فاز ۹ اصلاح شدند؛ جدول «نقاط تحویل» هم (Release Candidate از ۱۷ به ۱۸) به‌روز شد.

### ج) مواردی که بررسی و **سالم** یافت شدند

- **مجوزدهی:** هیچ route ای در `src/app/api` بدون `requireActor` نیست، جز `auth/me` (خودش ۴۰۱ می‌دهد) و `health` (بدون داده حساس) که هر دو عمدی و درست‌اند.
- **کیفیت کد:** هیچ `TODO`/`FIXME`/`HACK` در `src/` نیست؛ تمام `any`ها فقط در کد تولیدشده Prisma‌اند، نه کد دست‌نویس.
- **بقیه خلاصه‌ها:** `getFleetSummary` (دو وضعیت) و `getRouteSummary` (فعال/غیرفعال) ذاتاً کامل‌اند.

### محدودیت‌های شناخته‌شده‌ای که عمداً رفع نشدند

- **نبود pagination در درخت سازمانی و فهرست ناوگان** — نقص واقعی مقیاس که با حجم فعلی (~۶٬۴۰۰ گره، ~۱٬۲۲۰ خودرو) باعث شکست دو تست e2e می‌شود. با اجرای همان تست‌ها روی commit پیش از فاز ۱۳ تأیید شد که **پیش‌موجود** است، نه رگرسیون. ماژول دیگری است و طبق `CLAUDE.md` §۱ نباید با این ممیزی مخلوط شود؛ به‌عنوان کار مستقل ثبت شده است.
- **`mission-interaction.spec.ts:166`** روی `mobile-360` زیر بار اجرای کامل ناپایدار است؛ در اجرای ایزوله روی هر دو نسخه دقیقاً یک شکست یکسان می‌دهد.

## قاعده تغییر وضعیت به DONE

فاز فقط زمانی `DONE` است که:

1. خروجی قابل مشاهده تعریف‌شده واقعاً در دسترس باشد؛
2. سناریوی نمایش دستی با موفقیت اجرا شده باشد؛
3. Definition of Done در `CLAUDE.md` رعایت شده باشد؛
4. تست‌ها، migration، محدودیت‌ها و مسیر مشاهده در همین سند ثبت شده باشند؛
5. feature ناقص یا دکمه ظاهراً فعال از فازهای بعد باقی نمانده باشد.
