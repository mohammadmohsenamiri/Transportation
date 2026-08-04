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

پس از تکمیل فاز Bootstrap، فرمان‌های مورد انتظار:

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

هیچ secret، فایل `.env`، کلید Provider نقشه یا credential پایگاه داده نباید commit شود.
