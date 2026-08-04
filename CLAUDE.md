# CLAUDE.md — دستورالعمل الزام‌آور توسعه

## 1. هویت و مرز پروژه

این ریپازیتوری یک سامانه سازمانی مدیریت حمل بار است، نه یک دموی نقشه و نه یک سامانه GPS واقعی. محصول باید مأموریت، مرسوله، خودرو، ساختار سازمانی، مسیر، نمایش تقریبی حرکت، داشبورد مدیریتی و تنظیمات سیستم را به‌شکل production-ready پوشش دهد.

- فقط در ریپازیتوری `Transportation` تغییر ایجاد کن.
- در `AITaskManagement` هیچ فایل، branch، commit، issue یا PR ایجاد یا ویرایش نکن.
- `AITaskManagement` صرفاً مرجع stack و conventions است.
- پیش از کدنویسی تمام اسناد معرفی‌شده در `README.md` را بخوان.
- در هر PR/تغییر فقط یک فاز از `docs/IMPLEMENTATION_PLAN.md` را اجرا کن.
- خارج از فاز جاری feature آینده را scaffold نکن، مگر interface کوچک و ضروری که در تصمیمات معماری مجاز شده باشد.

## 2. قواعد غیرقابل مذاکره

### فارسی، RTL و زمان

- root layout باید `lang="fa"` و `dir="rtl"` داشته باشد.
- هیچ متن نمایشی انگلیسی مانند Submit، Cancel، Loading یا Error باقی نماند.
- از CSS logical properties استفاده کن و به `left/right` سخت‌کدشده وابسته نشو.
- اعداد فنی، مختصات، کد رهگیری و URL می‌توانند LTR باشند و باید با `dir="ltr"` در محل مناسب نمایش داده شوند.
- تاریخ‌ها در DB به UTC ذخیره شوند؛ منطقه زمانی پیش‌فرض سامانه configurable و مقدار اولیه آن `Asia/Tehran` باشد.
- ورودی و خروجی UI شمسی باشد؛ تبدیل تاریخ فقط در boundary انجام شود.

### بدون وابستگی عملیاتی به اینترنت

- هیچ script، font، icon، tile، analytics، telemetry یا asset از CDN لود نشود.
- build تولیدی باید بعد از ساخته شدن، با قطع کامل اینترنت اجرا شود.
- Provider نقشه داخلی باید برای تمام قابلیت‌های اصلی کافی باشد.
- Provider عمومی خارجی optional است و خرابی آن نباید login، dashboard، CRUD، timeline یا نقشه داخلی را مختل کند.
- هر integration خارجی باید timeout، circuit breaker ساده، وضعیت سلامت و fallback قابل فهم داشته باشد.

### امنیت و مجوز

- مخفی‌کردن UI مجوز محسوب نمی‌شود؛ authorization در server/service boundary اجباری است.
- تمام inputهای route handler، server action، CSV و تنظیمات با Zod اعتبارسنجی شوند.
- عملیات مهم audit شوند.
- رکوردهای تجاری به‌صورت پیش‌فرض soft-delete شوند.
- SVG آپلودی باید sanitize شود؛ script، event handler، external reference و embedded HTML مجاز نیست.
- URL نقشه فقط توسط Admin تعریف شود و قواعد allowlist در سند عملیات رعایت شود.

### کیفیت معماری

- TypeScript strict؛ استفاده از `any` فقط با توضیح مکتوب و محدود.
- business logic داخل React component، route handler یا Prisma callback قرار نگیرد.
- لایه‌های domain/service/repository/permission/audit از UI جدا باشند.
- محاسبه موقعیت باید تابع pure و deterministic باشد و آزمون واحد مرزی داشته باشد.
- تغییر متوسط سرعت خودرو نباید تاریخچه مأموریت جاری/گذشته را تغییر دهد؛ سرعت در زمان برنامه‌ریزی یا انتشار مأموریت snapshot شود.
- موقعیت لحظه‌ای محاسبه‌شده را در هر tick در DB ذخیره نکن؛ source of truth داده‌های مأموریت، مسیر و زمان است.

## 3. ساختار پیشنهادی

```text
src/
  app/
    (auth)/
    (dashboard)/
      dashboard/
      map/
      missions/
      shipments/
      routes/
      system/
    api/v1/
  components/
    ui/
    layout/
    map/
    data-table/
    forms/
  features/
    auth/
    dashboard/
    organization/
    vehicles/
    shipments/
    missions/
    routes/
    map-providers/
    icons/
    users/
    audit/
  domain/
    mission/
    route/
    vehicle/
    shipment/
  lib/
    db/
    auth/
    permissions/
    audit/
    dates/
    geo/
    csv/
    validation/
    security/
  server/
    services/
    repositories/
    queries/
    jobs/
  styles/
prisma/
  schema.prisma
  seed.ts
public/
  icons/
  offline/
tests/
  unit/
  integration/
  e2e/
docs/
```

## 4. Definition of Done هر فاز

یک فاز فقط زمانی Done است که:

1. migration و seed لازم بدون خطا اجرا شوند.
2. lint، typecheck، unit test و build موفق باشند.
3. مجوزهای backend و frontend آزمون شده باشند.
4. loading، empty، error، success و destructive confirmation وجود داشته باشند.
5. UI در عرض‌های 360، 768، 1024 و 1440 پیکسل و با touch قابل استفاده باشد.
6. dark/light، RTL، متن بلند فارسی و keyboard navigation بررسی شده باشند.
7. هیچ درخواست runtime ناخواسته‌ای به اینترنت ارسال نشود.
8. مستندات، تصمیم‌ها و `PHASE_STATUS.md` به‌روز شوند.
9. summary شامل فایل‌های تغییرکرده، migrationها، تست‌ها و محدودیت‌های باقی‌مانده ارائه شود.

## 5. ممنوعیت‌ها

- استفاده از Google Maps JavaScript API به‌عنوان dependency اجباری ممنوع است.
- hardcode کردن VehicleType، CargoType، دفتر یا انبار نمونه در business logic ممنوع است.
- فرض اینکه هر مأموریت فقط همیشه یک مرسوله دارد ممنوع است؛ مدل باید یک یا چند مرسوله را پشتیبانی کند.
- محاسبه مسیر با سرویس آنلاین اجباری ممنوع است.
- نمایش عبارت «موقعیت زنده» برای داده تخمینی ممنوع است؛ از «نمای زنده محاسباتی» یا «موقعیت تقریبی» استفاده شود.
- حذف hard-delete رکوردهای دارای سابقه، دورزدن audit یا تغییر migration اعمال‌شده ممنوع است.
- اجرای چند فاز با هم، بازنویسی بی‌دلیل معماری یا افزودن قابلیت‌های خارج از scope ممنوع است.
