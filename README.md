# Transportation Management System

سامانه فارسی و راست‌به‌چپ مدیریت حمل بار، تعریف مأموریت، پایش تقریبی خودروها روی نقشه و نمایش «فرانمای وضعیت».

این ریپازیتوری مستقل از `AITaskManagement` است. آن پروژه فقط مرجع انتخاب فناوری و قواعد عمومی توسعه بوده و هیچ تغییری در آن نباید انجام شود.

## اسناد الزامی برای Claude

Claude پیش از هر تغییر باید اسناد زیر را به‌ترتیب بخواند:

1. [`CLAUDE.md`](./CLAUDE.md)
2. [`docs/PROJECT_SPEC.md`](./docs/PROJECT_SPEC.md)
3. [`docs/ARCHITECTURE_AND_DATA_MODEL.md`](./docs/ARCHITECTURE_AND_DATA_MODEL.md)
4. [`docs/UX_MAP_AND_DESIGN_SYSTEM.md`](./docs/UX_MAP_AND_DESIGN_SYSTEM.md)
5. [`docs/API_SECURITY_OFFLINE_OPERATIONS.md`](./docs/API_SECURITY_OFFLINE_OPERATIONS.md)
6. [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md)
7. [`docs/DECISIONS.md`](./docs/DECISIONS.md)
8. [`docs/PHASE_STATUS.md`](./docs/PHASE_STATUS.md)
9. [`docs/TEST_ACCEPTANCE.md`](./docs/TEST_ACCEPTANCE.md)

نمونه قالب ورودی مسیر: [`docs/samples/route-template.csv`](./docs/samples/route-template.csv)

ماک‌آپ‌های مرجع طراحی: [`docs/mockups/`](./docs/mockups/README.md)

## پشته فنی مبنا

- Next.js App Router و TypeScript با حالت strict
- React
- PostgreSQL و Prisma ORM
- Tailwind CSS و کامپوننت‌های Headless قابل سفارشی‌سازی
- Zod، React Hook Form و TanStack Query
- MapLibre GL JS و Turf.js؛ تمام assetها به‌صورت محلی bundle شوند
- Playwright برای آزمون‌های E2E و Vitest برای آزمون‌های واحد
- فونت Vazirmatn به‌صورت package/local، بدون CDN

نسخه‌های اولیه باید با نسخه‌های پایدار و سازگار ریپازیتوری مرجع هماهنگ باشند؛ ارتقای major version تنها در یک فاز مستقل و پس از ثبت تصمیم معماری مجاز است.

## قواعد کلیدی محصول

- کل رابط کاربری فارسی، RTL، لمسی و واکنش‌گرا است.
- تاریخ‌ها در پایگاه داده UTC/Gregorian و در UI شمسی نمایش داده می‌شوند.
- کارکرد اصلی سامانه نباید به اینترنت، CDN، نقشه عمومی یا سرویس ابری وابسته باشد.
- نقشه داخلی TMS/XYZ/WMTS منبع اصلی در محیط عملیاتی است؛ Provider جهانی فقط گزینه تکمیلی است.
- موقعیت خودروها «تقریبی» و بر اساس زمان شروع، سرعت snapshot شده و مسیر مأموریت محاسبه می‌شود؛ تا زمانی که GPS واقعی اضافه نشده نباید با عنوان موقعیت واقعی نمایش داده شود.
- Claude فقط یک فاز را در هر تغییر پیاده‌سازی می‌کند و پس از آن `docs/PHASE_STATUS.md` را به‌روزرسانی می‌کند.

## شروع توسعه

وضعیت فعلی: Phase 0، Phase 1 (ورود واقعی و پوسته محافظت‌شده)، Phase 2 (ساختار سازمانی چهارسطحی)، Phase 3 (انواع خودرو، نوع بار و ناوگان)، Phase 4 (نقشه داخلی و نمایش دفاتر/انبارها)، Phase 5 (مدیریت مسیر، CSV و ترسیم روی نقشه) و Phase 6 (تعریف مرسوله و مقصد) تکمیل شده‌اند.

```bash
npm install
cp .env.example .env   # DATABASE_URL، SESSION_SECRET و SEED_ADMIN_* را پر کنید
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

سپس `http://localhost:3000` را باز کنید:

- `/login` — ورود واقعی؛ کاربر Admin اولیه از مقادیر `SEED_ADMIN_USERNAME`/`SEED_ADMIN_PASSWORD` در `.env` ساخته می‌شود و در اولین ورود مجبور به تغییر رمز است.
- `/dashboard` — پوسته محافظت‌شده واقعی؛ بدون session معتبر به `/login` هدایت می‌شود.
- `/system/organization` — مدیریت CRUD ساختار سازمانی چهارسطحی (دفتر کشوری/گروه/توزیع‌کننده/انبار)؛ فقط برای نقش Admin.
- `/system/vehicles`، `/system/vehicle-types`، `/system/cargo-types` — مدیریت ناوگان، انواع خودرو و انواع بار با کارت‌های خلاصه آمادگی؛ فقط برای نقش Admin.
- `/system/map-providers` — مدیریت Provider نقشه (XYZ/TMS/WMTS داخلی یا خارجی اختیاری) با تست اتصال؛ فقط برای نقش Admin.
- `/map` — نمایش دفاتر و انبارها روی نقشه داخلی (MapLibre)؛ برای همه نقش‌های احرازهویت‌شده (Admin، بیننده وضعیت، برنامه‌ریز مأموریت).
- `/routes`، `/routes/new`، `/routes/[id]` — مدیریت مسیرها: import/export CSV، ترسیم با Click/Tap روی نقشه، نسخه‌بندی، تکثیر و غیرفعال‌سازی؛ مشاهده برای همه نقش‌ها، مدیریت فقط برای Admin و برنامه‌ریز مأموریت.
- `/shipments`، `/shipments/new`، `/shipments/[id]` — تعریف مرسوله با مبدأ انبار و مقصد (گره سازمانی یا مختصات آزاد با Tap روی نقشه)، جزئیات، ویرایش، تاریخچه و حذف نرم؛ فقط برای Admin و برنامه‌ریز مأموریت.
- `/prototype/overview` و `/prototype/map` — همچنان پیش‌نمایش رابط با fixture ثابت (`src/demo/fixtures.ts`) هستند، بدون اتصال به داده واقعی یا session.

فرمان‌های تست و کیفیت:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run db:format
```

هیچ secret، فایل `.env`، کلید Provider نقشه یا credential پایگاه داده نباید commit شود.
