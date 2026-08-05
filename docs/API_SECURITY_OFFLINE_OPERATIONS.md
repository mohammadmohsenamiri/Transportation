# API، امنیت، استقرار آفلاین و عملیات

## 1. قرارداد API

APIها زیر `/api/v1` و با JSON استاندارد ارائه شوند. mutationها CSRF/session protection داشته باشند. response خطا:

```json
{
  "error": {
    "code": "MISSION_VEHICLE_OVERLAP",
    "message": "خودرو در بازه انتخاب‌شده مأموریت دیگری دارد.",
    "fieldErrors": {},
    "requestId": "..."
  }
}
```

پیام کاربر فارسی و code پایدار انگلیسی است. جزئیات stack/SQL در production افشا نشود.

## 2. endpointهای اصلی

### Authentication

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/change-password`

### Organization

- `GET /api/v1/organization-units?level=&parentId=&q=&page=`
- `POST /api/v1/organization-units`
- `GET/PATCH/DELETE /api/v1/organization-units/:id`
- `GET /api/v1/organization-tree`

### Vehicle catalogs

- CRUD `/vehicle-types`
- CRUD `/vehicles`
- CRUD `/cargo-types`
- `GET /vehicles/availability?from=&to=&vehicleTypeId=`

### Shipments

- `GET/POST /shipments`
- `GET/PATCH/DELETE /shipments/:id`
- `GET /shipments/:id/history`

### Routes

- `GET/POST /routes`
- `GET/PATCH/DELETE /routes/:id`
- `POST /routes/import-csv` — preview token، بدون ذخیره نهایی
- `POST /routes/confirm-import`
- `GET /routes/:id/export.csv`
- `GET /routes/:id/geometry`

### Missions

- `GET/POST /missions`
- `GET/PATCH/DELETE /missions/:id`
- `POST /missions/:id/publish`
- `POST /missions/:id/cancel`
- `POST /missions/:id/duplicate`
- `GET /missions/:id/history`
- `POST /missions/estimate` — distance/ETA/fuel preview بدون ذخیره

### Map and dashboard

- `GET /map/scene?viewTime=&originId=&destinationId=&vehicleTypeId=&startBefore=&startAfter=&etaBefore=&etaAfter=&status=&q=`
- `GET /map/missions/:id/geometry`
- `GET /dashboard/overview?from=&to=`
- `GET /dashboard/charts?from=&to=`
- `GET /system/time` برای همگام‌سازی live clock

### Settings

- CRUD `/map-providers` فقط Admin
- `POST /map-providers/:id/test`
- CRUD `/icon-assets`
- CRUD `/users` و `/users/:id/roles`
- `GET /audit-logs`
- `GET /health` و endpoint جداگانه readiness برای reverse proxy

## 3. pagination، sorting و filtering

- pagination server-side؛ cursor برای داده حجیم و page برای صفحات مدیریتی قابل قبول است.
- sort fieldها allowlist شوند؛ نام column مستقیم از query به ORM منتقل نشود.
- limit پیش‌فرض 25، حداکثر 100؛ map scene endpoint limit و aggregation ویژه دارد.
- زمان‌ها ISO-8601 UTC در API؛ UI تبدیل شمسی انجام می‌دهد.
- Decimalها در API به string یا number کنترل‌شده و schema مستند تبدیل شوند.

## 4. Authentication و session

- login با شناسه کاربری و password hash امن (Argon2id ترجیحی یا bcrypt سازگار با مرجع).
- cookie امضاشده، HttpOnly، SameSite=Lax/Strict و Secure در HTTPS.
- session expiration و revoke در تغییر password/disable user.
- account اولیه Admin فقط از env/seed امن و با اجبار تغییر رمز در اولین ورود.
- rate limit login بر اساس user+IP با storage داخلی/DB یا reverse proxy؛ وابسته به سرویس ابری نباشد.

## 5. Authorization

هر service متد `actorContext` دریافت و permission check صریح دارد. queryها نیز باید scope را در DB اعمال کنند تا داده غیرمجاز حتی موقتاً به client نرسد.

Actionهای audit اجباری:

- login failure/success حساس، logout، تغییر رمز
- ایجاد/ویرایش/لغو/انتشار مأموریت
- تغییر وضعیت خودرو
- import/export route
- تغییر ساختار سازمانی
- آپلود/غیرفعال‌سازی icon
- تغییر Provider و تست اتصال
- ایجاد/تعلیق کاربر و نقش

## 6. Upload security

### CSV

- MIME و extension هر دو بررسی شوند؛ به MIME اعتماد مطلق نشود.
- parse streaming برای فایل بزرگ؛ formula injection در export با prefix برای مقادیر شروع‌شونده با `=`, `+`, `-`, `@` مدیریت شود.
- خطاها حداکثر N مورد با شماره ردیف برگردند.
- فایل preview موقت TTL داشته باشد و فقط سازنده/ادمین confirm کند.

### PNG/SVG

- حداکثر اندازه اولیه 2MB و ابعاد منطقی.
- SVG sanitize و سپس ذخیره؛ external URL، `<script>`, `<foreignObject>`, event attributes و data URI ناشناخته حذف/reject شوند.
- نام فایل server-generated؛ path traversal ممنوع.
- download با Content-Type و CSP مناسب.

### Mapnik Style (XML) — پیشنهادی، طبق ADR-022؛ در فاز اجرایی آینده پیاده می‌شود

این بخش صرفاً الزامات امنیتی الزام‌آور برای هر پیاده‌سازی آینده این قابلیت را ثبت می‌کند؛ هنوز کد/route/UI برایش وجود ندارد.

- MIME و پسوند هر دو بررسی شوند (`.xml` + `text/xml`/`application/xml`)؛ به هیچ‌کدام به‌تنهایی اعتماد نشود.
- parser باید DOCTYPE/DTD processing و resolve شدن external entity را کاملاً غیرفعال کند (جلوگیری از XXE و افشای فایل محلی سرور).
- پارامترهای مسیر (`<Parameter name="file">`, `base` و مشابه) باید resolve و با بررسی `realpath` تضمین شوند که داخل sandbox اختصاصی همان آپلود باقی می‌مانند؛ `..`، مسیر مطلق خارج از sandbox و symlink فرارونده reject شوند.
- در نسخه اول فقط `<Datasource>`های فایل‌محور/محلی (`shape`, `geojson`, `gdal`/راستر, `csv`) مجازند؛ اتصال شبکه‌ای `postgis`/`ogr`، پارامتر `table` (که در Mapnik می‌تواند subquery خام SQL باشد) و هر پارامتر `url`/`host`/`port` رد شوند — پذیرفتن آن‌ها معادل SQL injection/SSRF با اختیار آپلودکننده است.
- سقف‌های سخت: حداکثر حجم فایل XML، حداکثر حجم بسته datasource، حداکثر تعداد `<Layer>`/`<Style>`، و timeout رندر (job بعد از عبور از سقف `FAILED` می‌شود).
- فقط `ADMIN` مجاز به آپلود/تأیید render است؛ پیش از تأیید نهایی، فهرست datasourceهای resolve‌شده به Admin نمایش داده شود (الگوی preview/confirm دومرحله‌ای CSV، ADR-020) و عملیات کامل audit شود (ADR-015).
- موتور رندر Mapnik یک وابستگی بومی/سیستمی **اختیاری** روی میزبان استقرار است، نه بخشی از runtime برنامه؛ نبود آن نباید هیچ قابلیت اصلی سامانه را مختل کند (مسیر جایگزین: پیش‌رندر کاملاً آفلاین توسط Admin/DevOps و ثبت فقط خروجی کاشی نهایی به‌عنوان یک `MapProvider` معمولی — بدون parse هیچ XML ناشناخته‌ای روی سرور).

## 7. امنیت Map Provider

URL نمونه می‌تواند placeholderهای `{z}`, `{x}`, `{y}` و در TMS معکوس `{reverseY}` داشته باشد. Provider تنها توسط Admin ثبت می‌شود.

- scheme فقط `http` یا `https`.
- در production allowlist hostname/CIDR configurable است؛ private network برای سرور داخلی مجاز است.
- credential داخل URL نمایش‌داده‌شده ممنوع؛ secret جداگانه و mask شده.
- اگر test connection از server انجام می‌شود، DNS rebinding، redirect غیرمجاز، timeout، response size و content type کنترل شود.
- CSP `connect-src` و `img-src` بر اساس Providerهای فعال تولید شود یا از proxy داخلی کنترل‌شده استفاده شود.
- external provider failure باید فقط map layer مربوط را degraded کند.

نکته: Google/Bing معمولاً شرایط کلید، سهمیه و مجوز خاص دارند. Provider عمومی پیش‌فرض پیشنهادی `OpenStreetMap-compatible XYZ` است، اما attribution و usage policy باید رعایت و برای بار سازمانی tile server داخلی/کش‌شده استفاده شود.

## 8. الزامات عدم وابستگی به اینترنت

آزمون پذیرش offline:

1. DNS/route اینترنت سرور و client مسدود شود.
2. login، CRUD تمام داده‌های مرجع، تعریف route CSV/نقشه، تعریف مأموریت، dashboard و map داخلی کار کند.
3. browser devtools هیچ درخواست failed به CDN یا API خارجی ضروری نشان ندهد.
4. font، icon، JS، CSS، source map production و map assets ضروری محلی باشند.
5. زمان سامانه از NTP داخلی یا ساعت سرور استفاده کند.

Production image باید dependencyها و assetهای build را در خود داشته باشد. نصب npm در زمان اجرای production مجاز نیست. برای build بدون اینترنت، یکی از این راه‌ها مستند شود:

- registry داخلی npm
- cache/artifact mirror سازمانی
- image از پیش ساخته و امضاشده

## 9. استقرار پیشنهادی

Docker Compose یا سرویس‌های معادل داخل شبکه:

```text
reverse-proxy -> transportation-web
                 transportation-worker (optional)
                 postgres
                 internal file volume
internal clients -> internal map server
```

- TLS با CA داخلی
- secrets از environment/secret file خارج repo
- volumeهای جدا برای PostgreSQL، upload و backup
- healthcheck برای web، DB و worker
- log ساختاریافته JSON با rotation؛ بدون secret و محتوای کامل حساس
- telemetry خارجی خاموش؛ metrics داخلی در صورت نیاز

## 10. Backup و بازیابی

- backup روزانه PostgreSQL و upload icons/routes metadata
- retention قابل تنظیم، پیشنهاد 7 روز روزانه + 4 هفته هفتگی
- رمزنگاری backup و محدودیت دسترسی
- آزمون restore دوره‌ای؛ backup بدون restore test معتبر تلقی نشود
- RPO/RTO اولیه پیشنهادی: RPO 24h و RTO 4h تا زمانی که مالک محصول مقدار دیگری تصویب کند

## 11. Migration و release

- migrationهای Prisma append-only؛ migration اعمال‌شده ویرایش نشود.
- قبل از deploy: backup، `prisma migrate deploy`، build/test و smoke test.
- rollback کد باید با schema backward-compatible باشد؛ migration destructive نیازمند plan جدا.
- release شامل commit SHA، نسخه DB، زمان و مسئول باشد.

## 12. Observability داخلی

- request ID در log و error response
- audit log مجزا از application log
- metricهای حداقل: latency/error API، DB pool، active sessions، map scene size، CSV failures، provider health
- صفحه `/system/health` فقط Admin و بدون افشای secret
- alert می‌تواند در نسخه اول در داشبورد داخلی باشد و به اینترنت وابسته نباشد.
