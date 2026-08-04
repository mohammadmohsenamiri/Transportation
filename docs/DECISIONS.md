# تصمیمات معماری الزام‌آور

این فایل ADRهای خلاصه را نگه می‌دارد. تغییر هر تصمیم نیازمند ثبت ADR جدید با وضعیت `Accepted` یا `Superseded` است؛ تصمیم قبلی حذف نشود.

## ADR-001 — Stack هم‌خانواده با AITaskManagement

**Status:** Accepted

Next.js App Router، TypeScript، React، PostgreSQL، Prisma، Tailwind، Vazirmatn و Playwright استفاده می‌شوند. Zod، React Hook Form و TanStack Query برای validation/form/server-state اضافه می‌شوند. هدف هم‌راستایی مهارت تیم و الگوی نگهداری است.

## ADR-002 — Modular Monolith

**Status:** Accepted

نسخه اول یک deployable وب با مرزهای domain روشن است. microserviceها برای این scope هزینه عملیاتی غیرضروری دارند. worker پشت interface می‌تواند جدا اجرا شود.

## ADR-003 — MapLibre و Provider مستقل

**Status:** Accepted

MapLibre GL JS به دلیل open-source بودن، پشتیبانی raster/vector و امکان bundle محلی انتخاب شده است. domain به Google/Bing/Mapbox متصل نمی‌شود. Provider داخلی TMS/XYZ/WMTS اولویت دارد.

## ADR-004 — Offline-first عملیاتی، نه PWA آفلاین کامل

**Status:** Accepted

«بدون اینترنت» یعنی سامانه با دسترسی به شبکه داخلی، سرور برنامه، DB و tile server داخلی کامل کار کند. نسخه اول الزام ندارد بدون دسترسی به سرور داخلی در browser کار کند. Service Worker تنها در صورت نیاز مستقل اضافه می‌شود.

## ADR-005 — موقعیت محاسباتی source of truth نیست

**Status:** Accepted

source of truth مأموریت، زمان، سرعت snapshot و route است. marker در view time محاسبه می‌شود و به‌طور پیوسته در DB نوشته نمی‌شود. UI همیشه آن را تقریبی می‌نامد.

## ADR-006 — Snapshot داده‌های برنامه‌ریزی

**Status:** Accepted

مختصات/عنوان مبدأ و مقصد، سرعت، route version و فاصله/ETA هنگام انتشار snapshot می‌شوند تا تغییر داده مرجع تاریخچه را بازنویسی نکند.

## ADR-007 — Route versioning

**Status:** Accepted

Route استفاده‌شده in-place تغییر ماهوی نمی‌کند. ویرایش، نسخه جدید می‌سازد و مأموریت قدیمی به نسخه قبلی متصل می‌ماند.

## ADR-008 — UTC در DB و شمسی در UI

**Status:** Accepted

DateTime در UTC ذخیره و API با ISO-8601 منتقل می‌شود. UI از timezone تنظیم‌شده و تقویم جلالی استفاده می‌کند. `Asia/Tehran` مقدار اولیه است.

## ADR-009 — RBAC چندنقشی

**Status:** Accepted

کاربر می‌تواند چند role داشته باشد. authorization در service/query enforce می‌شود. Admin superset است. scope سازمانی به شکل مدل آماده ولی در نسخه اول اختیاری است.

## ADR-010 — مدل مرسوله جدا از مأموریت

**Status:** Accepted

Shipment و Mission جدا هستند؛ Mission می‌تواند چند Shipment داشته باشد. این جداسازی dashboard مرسوله، تاریخچه و توسعه آینده را صحیح نگه می‌دارد.

## ADR-011 — مسیر مستقیم fallback

**Status:** Accepted

وقتی route موجود نیست، خط geodesic مستقیم، style خط‌چین و position interpolation روی همان خط استفاده می‌شود. UI باید نبود مسیر واقعی را آشکار کند.

## ADR-012 — CSV schema ثابت نسخه اول

**Status:** Accepted

Headerها `sequence,latitude,longitude,label` و encoding UTF-8 هستند. preview و confirm دو مرحله‌ای است. تغییر schema نیازمند version field و backward compatibility است.

## ADR-013 — عدم استفاده از CDN

**Status:** Accepted

تمام JS/CSS/font/iconهای لازم محلی هستند. external map tiles فقط Provider اختیاری‌اند. build و runtime production به CDN وابسته نیستند.

## ADR-014 — SVG غیرقابل اعتماد است

**Status:** Accepted

SVG upload به‌عنوان input hostile sanitize می‌شود. script، foreignObject، event attributes و external reference reject می‌شوند. render خام unsanitized ممنوع است.

## ADR-015 — Soft delete و Audit

**Status:** Accepted

رکوردهای business و settings مهم soft-delete/disable می‌شوند و mutationهای حساس before/after audit دارند. hard delete فقط برای داده موقت فاقد reference مجاز است.

## ADR-016 — Provider عمومی پیش‌فرض قراردادی نیست

**Status:** Accepted

هیچ Provider جهانی بدون بررسی terms، key و quota تضمین «رایگان» ندارد. سامانه adapter عمومی XYZ ارائه می‌کند؛ انتخاب سرویس بیرونی تصمیم deployment است و نباید شرط کارکرد اصلی باشد.

## ADR-017 — Redis در شروع اجباری نیست

**Status:** Accepted

برای کاهش پیچیدگی شبکه داخلی، jobهای اولیه می‌توانند DB-backed باشند. در صورت نیاز به throughput/retry بالا، Redis/BullMQ پشت interface افزوده می‌شود؛ domain تغییر نمی‌کند.

## ADR-018 — سیاست ویرایش مأموریت پس از شروع

**Status:** Accepted

پیش از `startAt` (وضعیت نمایشی `WAITING`)، مأموریت `SCHEDULED` به‌طور کامل قابل ویرایش است: خودرو، مسیر، زمان شروع، مقصد و مرسوله‌ها با همان اعتبارسنجی انتشار دوباره بررسی و snapshot می‌شوند.

از لحظه‌ای که وضعیت نمایشی به `IN_PROGRESS` یا `ARRIVED` می‌رسد:

- فقط توضیحات و متادیتای غیرعملیاتی (غیر از خودرو/مسیر/مبدأ/مقصد/زمان/مرسوله) قابل ویرایش می‌ماند.
- خودرو، مسیر، مبدأ/مقصد و زمان شروع دیگر مستقیماً ویرایش نمی‌شوند؛ تنها مسیر مجاز `cancel` مأموریت جاری (با `cancellationReason` اجباری) و سپس `duplicate` به مأموریت جایگزین با مقادیر پیش‌پرشده است.
- لغو مأموریت در حال اجرا نیازمند confirmation صریح در UI است.
- هر دو مأموریت (لغوشده و جایگزین) در `history` و `AuditLog` به هم قابل ردیابی می‌مانند (`metadataJson` مأموریت جدید به `id` مأموریت لغوشده اشاره کند).

این قانون باید در service layer (نه فقط UI) در Phase 7 enforce شود؛ تلاش برای ویرایش مستقیم فیلدهای قفل‌شده پس از شروع باید با خطای domain (`MISSION_ALREADY_STARTED`) رد شود.

## ADR-019 — قید یکتایی مرسوله فعال در مأموریت

**Status:** Accepted

برای تضمین اینکه یک مرسوله در هر لحظه حداکثر در یک مأموریت فعال باشد، فیلد `isActiveAssignment Boolean @default(true)` به مدل `MissionShipment` اضافه می‌شود (به‌روزرسانی در `ARCHITECTURE_AND_DATA_MODEL.md`). چون Prisma schema مستقیماً partial unique index تعریف نمی‌کند، یک migration SQL دستی این ایندکس را می‌سازد:

```sql
CREATE UNIQUE INDEX "MissionShipment_active_shipment_unique"
ON "MissionShipment" ("shipmentId")
WHERE "isActiveAssignment" = true;
```

رفتار:

- هنگام publish، shipment با `SELECT ... FOR UPDATE` در transaction قفل و رکورد `MissionShipment` جدید با `isActiveAssignment = true` درج می‌شود؛ اگر رکورد فعال دیگری وجود داشته باشد، ایندکس خطای unique برمی‌گرداند و service آن را به خطای domain `SHIPMENT_ALREADY_ASSIGNED` نگاشت می‌کند.
- هنگام `cancel`، `complete` یا `archive` مأموریت، `isActiveAssignment` مربوط به `false` تغییر می‌کند تا مرسوله آزاد شود.
- این migration باید به‌صورت دستی (raw SQL در پوشه migration Prisma) نوشته و در Phase 7 مستند شود.
