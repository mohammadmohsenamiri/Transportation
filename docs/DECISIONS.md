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

## ADR-020 — پیاده‌سازی نسخه‌بندی Route و توکن پیش‌نمایش import CSV

**Status:** Accepted

`docs/IMPLEMENTATION_PLAN.md` فاز ۵ از عبارت «مدل‌های `Route` و `RouteVersion` و `RoutePoint`» استفاده می‌کند، اما `ARCHITECTURE_AND_DATA_MODEL.md` بخش ۳ (سند مرجع الزام‌آور مدل داده) صرفاً `Route` (با فیلد اسکالر `version Int`) و `RoutePoint` را تعریف می‌کند و مدل مستقل `RouteVersion` ندارد. طبق ADR-007 («ویرایش، نسخه جدید می‌سازد»)، نسخه‌بندی به این شکل پیاده‌سازی شد:

- هر ویرایش ماهوی (تغییر نقاط) یک رکورد **جدید** `Route` می‌سازد با همان `code`، `version = نسخه قبلی + 1`، و `points` کاملاً جدید؛ رکورد نسخه قبلی بدون تغییر در DB باقی می‌ماند (`isActive=false` می‌شود) تا مأموریت‌های تاریخی (Phase 7+) که به `routeId` مشخص همان نسخه اشاره کرده‌اند دست‌نخورده بمانند.
- ویرایش غیرماهوی (نام/توضیحات/`isActive`) به‌صورت in-place روی همان رکورد انجام می‌شود و نسخه جدید نمی‌سازد.
- یکتایی `code` در سطح DB با `@@unique([code, version])` تضمین می‌شود؛ یکتایی «هر `code` فقط یک lineage» در service layer چک می‌شود.
- فهرست مسیرها همیشه فقط آخرین نسخه هر `code` را نشان می‌دهد (انتخاب `MAX(version)` در حافظه پس از fetch، بدون pagination — مشابه محدودیت شناخته‌شده Phase 2/3 برای درخت سازمانی و ناوگان).

برای `POST /routes/import-csv` (پیش‌نمایش، بدون ذخیره) طبق سند API، به‌جای ذخیره موقت preview در DB یا Redis (که طبق ADR-017 برای این نیاز اجباری نیست)، یک **توکن امضاشده stateless** استفاده شد: `HMAC-SHA256` روی `{actorUserId, checksum نقاط, exp}` با کلید `SESSION_SECRET`. در `POST /routes/confirm-import`، نقاط ارسالی کاربر دوباره کامل اعتبارسنجی و checksum آن با مقدار داخل توکن مقایسه می‌شود؛ عدم تطابق یا انقضا (۱۵ دقیقه) یا کاربر متفاوت رد می‌شود. این رویکرد الزام سند امنیتی («TTL و فقط سازنده confirm کند») را بدون زیرساخت اضافه برآورده می‌کند.

## ADR-022 — درون‌ریزی سبک نقشه Mapnik XML (پیشنهادی، پیاده‌سازی‌نشده)

**Status:** Proposed — این ADR فقط شکل معماری را برای زمانی که این قابلیت وارد یک فاز اجرایی شود منجمد می‌کند؛ هیچ کد، migration یا UI برای آن هنوز نوشته نشده و طبق قرارداد اجرای فاز (`IMPLEMENTATION_PLAN.md`) و ممنوعیت «افزودن قابلیت خارج از scope فاز جاری» در `CLAUDE.md`، نباید بدون تخصیص یک فاز مستقل scaffold شود.

### مسئله

Mapnik Style یک فایل XML است که برای موتور رندر سمت‌سرور **Mapnik** (کتابخانه C++ پشت پشته کلاسیک OpenStreetMap/`renderd`/`mod_tile`) قواعد استایل و ارجاع به منابع داده محلی (Shapefile، GeoTIFF/GDAL، PostGIS، CSV) را تعریف می‌کند. این فرمت **معادل یا قابل‌مصرف مستقیم توسط MapLibre GL JS نیست**: MapLibre (رندرر WebGL سمت‌کاربر همین سامانه) فقط دو چیز می‌فهمد — کاشی‌های رستری آماده (PNG/JPEG روی XYZ/TMS، که همین حالا پشتیبانی می‌شود) یا کاشی‌های برداری MVT/PBF به‌همراه یک سند «MapLibre/Mapbox Style» با فرمت JSON کاملاً متفاوت. بنابراین «بارگذاری فایل Mapnik XML و دیدن فوری آن روی نقشه» یک قابلیت سمت‌مرورگر نیست؛ نیازمند یک مرحله رندر واقعی سمت‌سرور (یا سمت عملیات/DevOps) است که خروجی XML را به کاشی واقعی تبدیل کند.

### تصمیم معماری

این قابلیت به‌عنوان یک **pipeline آفلاین/غیرهمزمان مخصوص Admin** طراحی می‌شود که خروجی نهایی‌اش دقیقاً یک رکورد استاندارد `MapProvider` موجود (`kind = INTERNAL_XYZ` یا `INTERNAL_TMS`) است — یعنی کامپوننت نقشه سمت‌کلاینت (`maplibre-map-inner`, فاز ۴) **هیچ تغییری نمی‌کند** و همچنان فقط با `MapProvider` صحبت می‌کند؛ Mapnik XML صرفاً یک **راه جدید تولید** محتوای همان جدول است، نه یک مسیر رندر موازی.

مدل داده جدید و مجزا از `MapProvider` پیشنهاد می‌شود تا «چگونگی تولید داده» از «چگونگی سرویس‌دهی کاشی» جدا بماند:

```text
MapStyleSource (پیشنهادی)
  id, name
  originalFileName, storagePath (sandbox اختصاصی هر آپلود)
  sha256, sizeBytes
  datasourceManifestJson  -- فهرست resolve‌شده datasourceهای محلی، برای بازبینی Admin پیش از تأیید render
  renderStatus = PENDING | RENDERING | SUCCEEDED | FAILED
  renderError nullable
  renderedProviderId nullable -> MapProvider
  isActive (soft-delete طبق ADR-015)
  uploadedBy/audit
```

موتور رندر Mapnik خودش **در runtime برنامه Next.js باندل یا اجباری نمی‌شود** — دقیقاً مطابق الگوی ADR-016/017 («Provider/زیرساخت سنگین اختیاری، در نبودش کارکرد اصلی نباید بشکند»)، دو مسیر عملیاتی پیشنهاد می‌شود:

1. **رندر سمت‌سرور (اختیاری):** اگر باینری/binding بومی Mapnik روی سرور استقرار نصب باشد، Admin فایل XML + بسته فشرده datasourceهای محلی ارجاع‌شده را از UI آپلود می‌کند؛ یک job پس‌زمینه DB-backed (بدون نیاز اجباری به Redis، طبق ADR-017) آن را sanitize و به یک درخت کاشی XYZ روی دیسک محلی رندر می‌کند؛ در صورت موفقیت، رکورد `MapProvider` به‌صورت خودکار ساخته/به‌روزرسانی و از طریق `renderedProviderId` به `MapStyleSource` پیوند می‌خورد.
2. **پیش‌رندر کاملاً آفلاین (پیش‌فرض پیشنهادی و ایمن‌تر برای production):** Admin/DevOps فایل XML را با ابزار Mapnik خودش (خارج از این سامانه) به یک بسته کاشی (MBTiles یا پوشه XYZ) تبدیل می‌کند و فقط **خروجی نهایی کاشی** را از همان مسیر عمومی «Provider داخلی» موجود ثبت می‌کند — در این مسیر هیچ XML ناشناخته‌ای هرگز روی سرور parse نمی‌شود.

پیاده‌سازی مسیر (۱) اختیاری و به تصمیم فاز اجرایی موکول است؛ مسیر (۲) به‌تنهایی کل نیاز کاربردی («من یک سبک Mapnik دارم و می‌خواهم رویش کار کنم») را بدون افزودن هیچ سطح حمله جدیدی برآورده می‌کند و باید همیشه به‌عنوان گزینه مستند بماند.

### امنیت (پیش‌نیاز اجباری هر پیاده‌سازی، هم‌راستا با ADR-014 و بخش Upload security سند عملیات)

- XML باید با یک parser سخت‌گیرانه پردازش شود که پردازش DOCTYPE/DTD و resolve شدن external entity را کاملاً غیرفعال کند (جلوگیری از XXE، افشای فایل محلی و SSRF از طریق entity).
- پارامترهای مسیر (`<Parameter name="file">`, `base`, و مشابه) باید resolve و با `realpath` تضمین شوند که داخل sandbox اختصاصی همان آپلود می‌مانند؛ `..`، مسیر مطلق خارج از sandbox و symlink فرارونده رد می‌شوند.
- در نسخه اول فقط `<Datasource>`های فایل‌محور/محلی (`shape`, `geojson`, `gdal`/راستر, `csv`) مجاز است؛ اتصال شبکه‌ای `postgis`/`ogr` و پارامتر `table` (که در Mapnik می‌تواند literally یک subquery خام SQL باشد) و هر پارامتر `url`/`host`/`port` **رد می‌شود** — پذیرفتن آن‌ها معادل دادن اجرای SQL دلخواه یا SSRF به آپلودکننده است.
- سقف‌های سخت اجباری: حداکثر حجم فایل XML، حداکثر حجم کل بسته datasource، حداکثر تعداد `<Layer>`/`<Style>`، و timeout رندر (job بعد از عبور از سقف kill و `FAILED` می‌شود) — هم‌الگو با سقف نقاط CSV (فاز ۵) و حجم SVG/PNG (سند عملیات).
- فقط نقش `ADMIN` مجاز به آپلود/تأیید render است؛ عملیات کامل audit می‌شود (`beforeJson`/`afterJson` طبق ADR-015) و پیش از تأیید نهایی، فهرست datasourceهای resolve‌شده به Admin نمایش داده می‌شود تا دقیقاً بداند سبک به کدام فایل‌های محلی دسترسی می‌خواهد (الگوی preview/confirm دومرحله‌ای مشابه import CSV، ADR-020).
- غیرفعال‌سازی یک `MapStyleSource` (soft-delete) کاشی‌های از قبل تولیدشده را نمی‌شکند مگر Admin آن `MapProvider` را هم جداگانه غیرفعال کند.

### خارج از دامنه این ADR

انتخاب دقیق toolchain رندر (Mapnik بومی در برابر بسته‌بندی‌های جایگزین)، جزئیات پیاده‌سازی صف job، و اینکه مسیر (۱) اصلاً در نسخه اول ساخته شود یا فقط مسیر (۲) مستند و کافی تلقی شود — همگی به فاز اجرایی‌ای که این قابلیت را برمی‌دارد موکول است؛ این ADR فقط تضمین می‌کند که وقتی آن فاز شروع شود، دوباره از صفر درباره معماری بحث نشود.

## ADR-021 — نام‌گذاری وضعیت مأموریت و مقدار پیش‌فرض `isActiveAssignment`

**Status:** Accepted

`docs/IMPLEMENTATION_PLAN.md` فاز ۷ در متن توصیفی از وضعیت‌های «`DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED`» نام می‌برد، اما `ARCHITECTURE_AND_DATA_MODEL.md` بخش مدل داده (سند مرجع الزام‌آور) enum `MissionPersistedStatus` را صریحاً `DRAFT, SCHEDULED, CANCELLED, ARCHIVED` تعریف کرده است. همسو با رویه ADR-020 (اولویت سند معماری بر متن توصیفی implementation plan در تعارض نام‌گذاری)، enum پیاده‌سازی‌شده دقیقاً `DRAFT | SCHEDULED | CANCELLED | ARCHIVED` است؛ «انتشار» مأموریت آن را به `SCHEDULED` می‌برد (نه `PUBLISHED`) و بایگانی/پایان چرخه به `ARCHIVED` نگاشت می‌شود (نه `COMPLETED`، که در دامنه فعلی معادل مشخصی ندارد و به فازهای بعد موکول است).

همچنین متن ADR-019 مقدار پیش‌فرض `MissionShipment.isActiveAssignment` را `@default(true)` نوشته بود؛ در پیاده‌سازی این مقدار به `@default(false)` اصلاح شد، چون رکورد `MissionShipment` هنگام ساخت/ویرایش مأموریت `DRAFT` (پیش از `publish`) باید غیرفعال باشد — در غیر این صورت انتخاب مرسوله در حالت پیش‌نویس، آن مرسوله را به‌اشتباه به‌عنوان «قبلاً به مأموریت فعال دیگری متصل» علامت می‌زد و از فهرست «مرسوله‌های در دسترس برای مأموریت» حذف می‌کرد. مقدار `true` فقط هنگام `commitMissionAssignment` (در زمان `publish` یا re-commit مأموریت `SCHEDULED`) صراحتاً تنظیم می‌شود؛ رفتار قید یکتایی (partial unique index) و نگاشت خطا به `SHIPMENT_ALREADY_ASSIGNED` طبق ADR-019 بدون تغییر باقی می‌ماند. این سند ADR-019 را نسخ نمی‌کند، فقط مقدار پیش‌فرض ستون را در همین‌جا تصحیح می‌کند.
