# وضعیت فازهای پیاده‌سازی

آخرین به‌روزرسانی: 2026-08-04

## خلاصه وضعیت

برآورد حجم نسبی هر فاز (نه زمان تقویمی) برای کمک به برنامه‌ریزی مالک محصول: `S` کوچک، `M` متوسط، `L` بزرگ/پرریسک.

| فاز | عنوان | خروجی قابل مشاهده | وضعیت | برآورد حجم | یادداشت |
|---:|---|---|---|:---:|---|
| 0 | پیش‌نمایش قابل کلیک و هویت بصری | فرانمای وضعیت و نقشه prototype در موبایل/تبلت/دسکتاپ | DONE | M | اولین فاز اجرایی؛ بدون DB |
| 1 | اجرای واقعی برنامه، ورود و پوسته محافظت‌شده | ورود واقعی، تغییر رمز و navigation نقش‌محور | NOT_STARTED | M | — |
| 2 | ساختار سازمانی چهارسطحی | CRUD واقعی دفاتر و انبارها در نمای درختی | NOT_STARTED | S | — |
| 3 | انواع خودرو، نوع بار و ناوگان | صفحه واقعی مدیریت خودرو و آمار آمادگی | NOT_STARTED | S | — |
| 4 | نقشه داخلی و نمایش دفاتر و انبارها | نقاط سازمانی روی Map Provider داخلی | NOT_STARTED | L | Demo 1؛ بالاترین ریسک فنی (اتصال Provider داخلی) |
| 5 | مدیریت مسیر، CSV و ترسیم روی نقشه | import/export CSV و ترسیم مسیر با Click/Tap | NOT_STARTED | M | — |
| 6 | تعریف مرسوله و مقصد | ثبت مرسوله و preview مبدأ/مقصد روی نقشه | NOT_STARTED | S | — |
| 7 | برنامه‌ریزی مأموریت از فرم | ساخت Draft، تخمین و انتشار مأموریت | NOT_STARTED | M | شامل ADR-018/019 |
| 8 | تعریف مأموریت از داخل نقشه | ساخت و انتشار مأموریت بدون ترک نقشه | NOT_STARTED | M | Demo 2 |
| 9 | موتور موقعیت تقریبی و آزمایشگاه شبیه‌سازی | حرکت یک مأموریت در زمان انتخابی | NOT_STARTED | M | — |
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
Visible output URL: `/prototype/overview`، `/prototype/map` (پس از `npm run dev`، آدرس محلی `http://localhost:3000`؛ `/` به‌صورت خودکار به `/prototype/overview` هدایت می‌شود)
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

## قاعده تغییر وضعیت به DONE

فاز فقط زمانی `DONE` است که:

1. خروجی قابل مشاهده تعریف‌شده واقعاً در دسترس باشد؛
2. سناریوی نمایش دستی با موفقیت اجرا شده باشد؛
3. Definition of Done در `CLAUDE.md` رعایت شده باشد؛
4. تست‌ها، migration، محدودیت‌ها و مسیر مشاهده در همین سند ثبت شده باشند؛
5. feature ناقص یا دکمه ظاهراً فعال از فازهای بعد باقی نمانده باشد.
