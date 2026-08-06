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

## ADR-023 — انتخاب مبدأ/مقصد روی نقشه به‌عنوان فیلتر مرسوله، نه فیلد مستقل مأموریت

**Status:** Accepted

`docs/IMPLEMENTATION_PLAN.md` فاز ۸ می‌گوید «انتخاب انبار مبدأ از marker یا جست‌وجو» و «انتخاب مقصد با Tap یا ورود مختصات» — که در نگاه اول می‌تواند این‌طور خوانده شود که مأموریت فیلد مبدأ/مقصد مستقل و مستقیماً قابل‌تنظیم از UI دارد. اما طبق فاز ۷ (`mission-service.ts`)، مبدأ/مقصد مأموریت **همیشه** از مرسوله(های) انتخاب‌شده مشتق می‌شود (`resolveOperationalInputs` مقدار `originWarehouseId`/مقصد را فقط از اولین مرسوله می‌خواند) و `missionCreateSchema`/`missionUpdateSchema` هیچ فیلد مستقل مبدأ/مقصد نمی‌پذیرند. تغییر این immutable invariant برای فاز ۸ به‌معنای بازنویسی معماری فاز ۷ بود که هم خارج از دامنه یک فاز است و هم قاعده «مبدأ/مقصد مأموریت = مبدأ/مقصد مرسوله» را می‌شکست.

به همین دلیل، Tap روی مبدأ/مقصد در نمای نقشه به‌عنوان **فیلتر جست‌وجوی مرسوله** پیاده‌سازی شد، نه به‌عنوان مقداردهی مستقیم فیلد مأموریت:

- Tap/جست‌وجوی انبار مبدأ → `originWarehouseId` را برای query موجود `GET /shipments?availableForMission=true&originWarehouseId=...` (فاز ۶) تنظیم می‌کند.
- Tap/ورود مختصات مقصد → با تابع pure جدید `shipmentMatchesDestinationPoint` (در `src/lib/domain/mission-rules.ts`، با آزمون واحد) هر مرسوله بازگشتی را با نقطه انتخاب‌شده مقایسه می‌کند: تطبیق دقیق در صورت یکسان بودن `destinationOrganizationUnitId`، وگرنه فاصله geodesic (`haversineDistanceMeters`، فاز ۵) در محدوده ۱۵۰۰ متر — چون Tap کاربر روی نقشه نمی‌تواند به دقت مختصات ثبت‌شده مرسوله برسد.
- کاربر سپس از میان مرسوله‌های تطبیق‌یافته انتخاب می‌کند؛ payload نهایی ارسالی به `POST /api/v1/missions` دقیقاً همان شکل فرم فاز ۷ (`shipmentIds`, `vehicleId`, `startAt`, `routeId`, `notes`) است — هیچ endpoint یا فیلد جدیدی اضافه نشده. این دقیقاً معیار پذیرش فاز ۸ («مأموریت ساخته‌شده از نقشه و فرم باید خروجی و audit یکسان داشته باشد») را برآورده می‌کند، چون هر دو مسیر UI روی همان `mission-service.ts` فاز ۷ فرود می‌آیند.

پیامد: اگر مرسوله‌ای با مبدأ/مقصد انتخاب‌شده روی نقشه وجود نداشته باشد، مأموریت از این مسیر قابل ساخت نیست (باید ابتدا مرسوله متناظر از `/shipments/new` ساخته شود) — این محدودیت شناخته‌شده و عمدی است، نه نقص.

## ADR-024 — فاز ۹ بدون UI؛ صفحه simulation-lab از دامنه فاز خارج شد

**Status:** Accepted

پیش از شروع پیاده‌سازی فاز ۹، یک Development Pack کامل (۱۶ سند) در `docs/phase-09-simulation-engine/` تهیه شد. طبق دستور صریح مالک محصول در همان درخواست، فاز ۹ («موتور موقعیت تقریبی») باید کاملاً مستقل از React، کامپوننت‌های UI Next.js و هر کتابخانه رندر نقشه باشد — بدون هیچ استثنا.

این با متن قبلی `docs/IMPLEMENTATION_PLAN.md` فاز ۹ در تعارض بود، که «صفحه داخلی `/system/simulation-lab` فقط برای Admin/توسعه» را هم بخشی از دامنه پیاده‌سازی و هم «خروجی قابل مشاهده» این فاز معرفی می‌کرد.

**تصمیم:** طبق همان رویه ADR-020/021/023 (اولویت تصمیم صریح/سند معماری بر متن توصیفی implementation plan)، صفحه `/system/simulation-lab` به‌طور کامل از دامنه فاز ۹ حذف شد. `docs/IMPLEMENTATION_PLAN.md` فاز ۹ به‌روزرسانی شد تا این تغییر را منعکس کند و به Development Pack ارجاع دهد. «خروجی قابل مشاهده» این فاز، که طبق `CLAUDE.md` معمولاً باید یک مسیر قابل کلیک باشد، برای این فاز به‌طور مستند بازتعریف شد: مجموعه تست خودکار سبز و قطعی به‌همراه یک اجرای دستی اسکریپتی غیرقابل‌کامیت (جزئیات در `docs/phase-09-simulation-engine/09-ACCEPTANCE.md`).

صفحه lab (در صورت نیاز واقعی) به فاز ۱۰ موکول شد؛ تصمیم نهایی درباره ساختنش با نقشه عملیاتی واقعی همپوشانی دارد یا نه، به مالک محصول در آغاز فاز ۱۰ واگذار شده است.

جزئیات کامل معماری موتور (تفکیک لایه pure/service/HTTP، الگوریتم interpolation، عدم persist موقعیت، reuse کامل `deriveMissionDisplayStatus` فاز ۷) در `docs/phase-09-simulation-engine/ADR.md` (ADR-P9-01 تا ADR-P9-09) ثبت شده و این سند را تکرار نمی‌کند.

## ADR-025 — فاز ۱۰: عنوان صفحه نقشه و Development Pack ناقص

**Status:** Accepted

برای فاز ۱۰ («نقشه عملیاتی») ابتدا طبق روال فاز ۹ تهیه یک Development Pack شانزده‌سندی با تأیید تک‌سند-به-تک‌سند مالک محصول آغاز شد؛ فقط `docs/phase-10-operational-map/00-README.md` نوشته شد. مالک محصول پیش از تأیید ادامه، صریحاً درخواست پیاده‌سازی مستقیم فاز ۱۰ را داد. طبق تصمیم، پیاده‌سازی مستقیماً بر اساس همان یک سند به‌علاوه اسناد الزام‌آور موجود (`IMPLEMENTATION_PLAN.md`، `PROJECT_SPEC.md`، `UX_MAP_AND_DESIGN_SYSTEM.md`) انجام شد؛ Pack ناقص باقی می‌ماند و به‌عنوان مصنوع برنامه‌ریزی جزئی/جایگزین‌شده مستند است، نه سند الزام‌آور کامل.

دو نکته از همان `00-README.md` پیش‌نویس به‌عنوان اصل راهنما حفظ شد:

- **عنوان صفحه:** صفحه شیپ‌شده فاز ۴/۸ عنوان «نقشه عملیات» را دارد؛ `PROJECT_SPEC.md`/`UX_MAP_AND_DESIGN_SYSTEM.md` عبارت «نمای پایش» را هم به کار برده‌اند. برای جلوگیری از رگرسیون UI/تست‌های موجود و چون «نقشه عملیات» از نظر معنایی برای این صفحه (نمایش عملیات جاری روی نقشه، نه صرفاً یک داشبورد پایش) دقیق‌تر است، عنوان شیپ‌شده حفظ شد؛ عبارت‌های سند مرجع به‌روزرسانی نشدند چون خارج از تغییرات business-logic این فاز هستند.
- **اصطلاحات:** «نمای زنده محاسباتی» و «موقعیت تقریبی» طبق ممنوعیت صریح `CLAUDE.md` بخش ۵ (رد عبارت «موقعیت زنده») در برچسب‌های UI فاز ۱۰ استفاده شدند، دقیقاً طبق واژه‌نامه منجمدشده در `00-README.md`.

فاز ۱۰ صرفاً مصرف‌کننده خروجی موتور شبیه‌سازی فاز ۹ است (`simulateMissionPosition`/`calculateMissionGeometry` بدون تغییر) — منطق شبیه‌سازی دسته‌ای (`getMapScene`) صرفاً حلقه‌ای روی مأموریت‌های `SCHEDULED` است که برای هرکدام همان تابع pure فاز ۹ را فراخوانی می‌کند، بدون منطق موقعیت جدید.

## ADR-027 — فاز ۱۱: محل نگهداری state تعامل، فیلتر سمت کلاینت، نمای ذخیره‌شده فقط-نشست، بدون کتابخانه جدول

**Status:** Accepted

مطابق همان الگوی فاز ۱۰ (ADR-025)، Development Pack فاز ۱۱ («لایه تعامل») فقط تا `docs/phase-11-interaction-layer/00-README.md` پیش رفت؛ مالک محصول پیش از تأیید ادامه، پیاده‌سازی مستقیم را درخواست کرد. آن سند عمداً چهار تصمیم معماری را به «سؤالات باز» موکول کرده بود تا در زمان پیاده‌سازی حل شوند (بخش ۹ همان سند). این ADR همان چهار تصمیم را ثبت می‌کند:

1. **محل state تعامل:** به‌جای Context یا کتابخانه state جدید، یک custom hook تک (`src/features/map/use-mission-interaction.ts`) انتخاب شد که انتخاب/فیلتر/جست‌وجو/مرتب‌سازی/ستون‌ها/صفحه‌بندی/نماهای ذخیره‌شده را در یک شیء برمی‌گرداند و مستقیماً در `map-view.tsx` مصرف می‌شود. جایگزین سنگین‌تر (React Context) چون این state فقط در یک صفحه (`/map`) مصرف می‌شود و prop-drilling عمیقی رخ نمی‌دهد، توجیه نداشت.
2. **فیلتر/جست‌وجو/مرتب‌سازی سمت کلاینت:** تمام این عملیات روی همان آرایه `MapSceneMission[]` که هر ۵ ثانیه توسط فاز ۱۰ کامل fetch می‌شود، در حافظه انجام می‌گیرند (`src/lib/domain/mission-interaction-rules.ts`، توابع pure با آزمون واحد) — هیچ query param فیلتر جدیدی به `GET /api/v1/map/scene` اضافه نشد. با مقیاس فعلی (دهها تا چندصد مأموریت زمان‌بندی‌شده هم‌زمان) این کاملاً کافی است؛ اگر در آینده مقیاس بسیار بزرگ شود، فیلتر سمت سرور یک تغییر مجزا و مستقل در همان endpoint خواهد بود.
3. **نمای ذخیره‌شده (Saved View):** فقط در حافظه کلاینت (state هوک، نه `localStorage`/DB) نگهداری می‌شود و با رفرش صفحه از بین می‌رود — حداقل سطح مورد نیاز objective فاز ۱۱. persist شدن بین نشست‌ها/دستگاه‌ها به یک جدول تنظیمات کاربر موکول شد (Phase 14 محدوده منطقی آن است، نه بخشی از این فاز).
4. **بدون کتابخانه جدول/virtualization جدید:** جدول با همان الگوی موجود `missions-list-view.tsx` (فاز ۷) — `<table>` معنایی دسکتاپ/تبلت + کارت `<ul>` موبایل — پیاده شد. برای «تعداد زیاد» به‌جای windowing واقعی، صفحه‌بندی «نمایش N مأموریت بیشتر» (اندازه صفحه ۲۰) استفاده شد که ردیف انتخاب‌شده هرگز از دید پنهان نمی‌ماند (صفحه به‌طور خودکار تا index آن گسترش می‌یابد). این با اصل بدون‌وابستگی سنگین فازهای قبل هم‌راستاست؛ در صورت رشد واقعی مقیاس فراتر از چند صد مأموریت هم‌زمان، virtualization واقعی یک تغییر مجزا خواهد بود.

فیلترهای «نمای نقشه» (مبدأ/مقصد/نوع خودرو/وضعیت/زمان شروع/ETA/فقط فعال) هم روی جدول و هم روی marker‌های نقشه اثر می‌گذارند (مجموعه یکسان `interaction.visibleMissions` هم به جدول و هم به‌عنوان prop `vehicles` به `MapLibreMapInner` داده می‌شود) — دقیقاً طبق `docs/PROJECT_SPEC.md` §۹ که این فیلترها را ذیل «نمای نقشه»، نه صرفاً جدول، تعریف کرده است.

## ADR-028 — فاز ۱۲: محل state موتور زمان‌بندی، مکانیزم تیک پخش، بدون چندروزه/persist، بدون قفل حالت ساخت مأموریت

**Status:** Accepted

مطابق همان الگوی فازهای ۱۰ و ۱۱ (ADR-025، ADR-027)، Development Pack فاز ۱۲ («موتور زمان‌بندی») فقط تا `docs/phase-12-timeline-engine/00-README.md` پیش رفت؛ مالک محصول پیش از تأیید ادامه، پیاده‌سازی مستقیم را درخواست کرد. آن سند عمداً پنج تصمیم معماری را به «سؤالات باز» موکول کرده بود (بخش ۹ همان سند). این ADR همان پنج تصمیم را ثبت می‌کند:

1. **محل state و ترتیب نسبت به فاز ۱۱:** یک custom hook مستقل (`src/features/map/use-timeline-engine.ts`) انتخاب شد که یک سطح بالاتر از `useMissionInteraction` در `map-view.tsx` فراخوانی می‌شود: `const timeline = useTimelineEngine()` قبل از `const sceneQuery = useMapScene(timeline.viewTimeParam)` که خودش قبل از `useMissionInteraction(allMissions)` است — دقیقاً همان زنجیره‌ای که سند پیش‌نویس پیش‌بینی کرده بود. نه Context و نه state machine library جدیدی معرفی نشد؛ این state فقط در همین یک صفحه مصرف می‌شود و پیچیدگی اضافه آن‌ها توجیهی ندارد (همان استدلال ADR-027 برای `useMissionInteraction`).
2. **مکانیزم تیک پخش:** `setInterval` با تناوب ثابت ۱۰۰۰ میلی‌ثانیه انتخاب شد (نه `requestAnimationFrame`) — منطبق با الگوی موجود poll پنج‌ثانیه‌ای فاز ۱۰ و ساده‌تر برای پیاده‌سازی/آزمون deterministic؛ چون موتور شبیه‌سازی فاز ۹ محض و کم‌هزینه است، این تناوب برای نرمی کافی بصری کافی است بدون فشار غیرضروری روی CPU/باتری در تب پس‌زمینه.
3. **بازه چندروزه:** خارج از دامنه این فاز باقی ماند؛ `TimeRange` هنوز دقیقاً یک روز تقویمی جلالی (`tehranCalendarDayRange`) است، بدون UI صفحه‌بندی. نقطه توسعه آینده طبق «Special Requirements» سند پیش‌نویس حفظ شده: `useTimelineEngine` و `timeline-rules.ts` هیچ فرضی درباره طول بازه در امضای توابعشان hardcode نکرده‌اند.
4. **Persist شدن ترجیحات Playback/Timeline:** طبق همان اصل session-only فاز ۱۱ (ADR-027) اما یک قدم محافظه‌کارانه‌تر — هیچ persistence‌ای (نه state نشست، نه `localStorage`) اضافه نشد؛ هر بارگذاری/رفرش صفحه به‌طور قطعی به حالت زنده (Live) بازمی‌گردد. دلیل صریح محصولی: یک dispatcher هرگز نباید بی‌صدا روی داده تاریخی مانده از نشست قبل بماند — طبق ممنوعیت `CLAUDE.md` بخش ۵ درباره ابهام «موقعیت زنده»، بازگشت پیش‌فرض به Live ایمن‌ترین رفتار است.
5. **تعامل Playback با حالت ساخت مأموریت:** ورود به حالت ساخت مأموریت از نقشه (فاز ۸) به‌طور خودکار `timeline.returnToLive()` را فرا می‌خواند و پخش تاریخی جاری را متوقف می‌کند — نه صرفاً «ادامه بی‌اثر در پس‌زمینه» و نه «قفل ورود». دلیل: ساخت مأموریت جدید باید همیشه نسبت به وضعیت *زنده* ناوگان/مسیرها تصمیم‌گیری شود، نه یک لحظه دلخواه تاریخی/آینده که ممکن است داده‌ای گمراه‌کننده درباره در دسترس بودن خودرو نشان دهد.

**تصمیم اضافه (کشف‌شده حین آزمون رگرسیون، نه یکی از پنج سؤال باز سند):** `useMapScene` (فاز ۱۰) با تغییر `viewTime` یک `queryKey` کاملاً جدید می‌سازد (`["map","scene",viewTime ?? "live"]`)؛ بدون `placeholderData`، هنگام سوییچ Live→Historical یا تغییر لحظه تاریخی، `data` بین دو fetch لحظه‌ای `undefined` می‌شود. چون `map-view.tsx` این را با `sceneQuery.data?.missions ?? []` می‌خواند، آرایه مأموریت‌ها موقتاً خالی می‌شود و قاعده «پاک‌کردن انتخاب اگر مأموریت دیگر در لیست فیلترشده نیست» در `use-mission-interaction.ts` بلافاصله `selectedMissionId` را پاک می‌کند — یعنی هر جهش/تغییر زمان، انتخاب کاربر روی نقشه را از بین می‌برد. با افزودن `placeholderData: keepPreviousData` (`@tanstack/react-query` v5) به `useMapScene`، داده قبلی حین بارگذاری داده جدید نگه داشته می‌شود و این رگرسیون رفع شد؛ در تست e2e موبایل (`تست پرش-به-زمان`) به‌طور پایدار قابل بازتولید بود (نه صرفاً ناپایداری محیطی) چون رندر آن viewport طولانی‌تر از پنجره رقابتی race بود تا حالت خالی موقت واقعاً commit شود.
