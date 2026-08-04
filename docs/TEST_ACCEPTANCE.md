# سناریوهای آزمون و معیار پذیرش محصول

## 1. سناریوی پایه سازمان و خودرو

1. Admin چهار سطح صحیح سازمانی ایجاد می‌کند.
2. تلاش برای اتصال WAREHOUSE مستقیم به COUNTRY_OFFICE رد می‌شود.
3. Admin یک VehicleType دلخواه و خودرو READY ثبت می‌کند.
4. Viewer فقط مشاهده می‌کند و mutation API برای او 403 می‌دهد.

## 2. CSV Route

- فایل معتبر preview و سپس ذخیره شود؛ distance و point count درست باشد.
- latitude خارج محدوده، sequence تکراری، header اشتباه و فایل بیش از limit رد شوند.
- export سپس import مجدد geometry معادل تولید کند.
- فایل UTF-8 BOM و label فارسی درست parse شود.

## 3. تعریف مأموریت با مسیر

- Planner مرسوله، مبدأ، مقصد، خودرو، ساعت و route را انتخاب می‌کند.
- estimate فاصله، ETA و سوخت تقریبی را نشان می‌دهد.
- publish snapshotها را ذخیره می‌کند.
- تغییر avgSpeed خودرو پس از publish، ETA مأموریت را تغییر نمی‌دهد.
- مأموریت دوم هم‌پوشان برای همان خودرو رد می‌شود.

## 4. مأموریت بدون مسیر

- مأموریت با origin/destination و speed معتبر publish می‌شود.
- map خط‌چین مستقیم و badge نبود route نشان می‌دهد.
- موقعیت در نیمه زمان تقریباً در نیمه خط است.

## 5. موتور زمان

برای route چندsegment:

- قبل شروع: origin و WAITING
- دقیقاً شروع: progress=0
- وسط segment: مختصات و remaining معتبر
- دقیقاً ETA: destination و ARRIVED
- بعد ETA: position clamp به destination
- cancel: style/status لغوشده و محاسبه تا زمان cancel
- timezone boundary و تغییر روز شمسی نتیجه UTC صحیح دارد

## 6. همگام‌سازی نقشه و جدول

- click marker ردیف را select و visible می‌کند.
- click row marker را select و map را pan می‌کند.
- انتخاب جدید route قبلی را پاک و فقط route جدید را نشان می‌دهد.
- در mobile همان flow با bottom sheet قابل انجام است.

## 7. فیلترها

- context action مقصد فقط خودروهای همان مقصد را نشان دهد.
- مبدأ، VehicleType، startBefore/After و etaBefore/After با هم ترکیب شوند.
- chipها وضعیت query را منعکس و clear all کار کند.
- URL/query state در refresh حفظ شود، مگر داده حساس.

## 8. سیکر زمان

- Live با زمان جاری حرکت کند.
- drag خودکار وارد Historical شود.
- بازسازی زمان گذشته marker و status را deterministic تغییر دهد.
- Return to Live زمان و داده را sync کند.
- play/pause و step روی touch و keyboard کار کند.

## 9. Dashboard

KPIها با dataset fixture مستقل محاسبه و با list drill-down یکسان باشند. مأموریت مرزی دقیقاً در ETA طبق تعریف واحد فقط در دسته صحیح شمارش شود.

## 10. Offline/Intranet

با مسدودکردن اینترنت:

- login، dashboard، CRUD، import/export، map داخلی و timeline موفق
- external provider degraded ولی app usable
- هیچ font/icon/script ضروری fail نشود
- refresh مستقیم تمام routeها از reverse proxy صحیح باشد

## 11. امنیت

- هر role برای endpointهای غیرمجاز 403
- user غیرفعال session معتبر قبلی را از دست بدهد
- SVG مخرب اجرا نشود
- CSV formula injection در export خنثی شود
- Provider URL نامعتبر/redirect خطرناک رد شود
- XSS در title/description و map popup اجرا نشود
- audit mutationهای حساس را با actor و before/after ثبت کند

## 12. Responsive/Touch/Accessibility

Matrix حداقل:

- Chromium desktop 1440×900
- tablet 1024×768 و 768×1024
- mobile 390×844 و حداقل 360px
- touch emulation، keyboard-only، light/dark و reduced motion

هیچ کنترل اصلی زیر 44px، خارج viewport، hover-only یا بدون focus visible نباشد.

## 13. Performance baseline

با fixture ظرفیت:

- listها server-paginated و بدون fetch همه رکوردها
- map scene geometry غیرضروری نفرستد
- حرکت slider با 2,000 marker پس از clustering/optimization قابل استفاده باشد
- p95 dashboard/list هدف زیر 500ms و map scene زیر 1s در LAN؛ نتیجه واقعی ثبت شود

## 14. UAT نهایی

مالک محصول باید حداقل این جریان را تأیید کند:

1. تعریف ساختار و خودرو
2. تعریف نوع بار و مرسوله
3. ایجاد route با CSV و روی نقشه
4. ایجاد مأموریت از فرم و از نقشه
5. مشاهده حرکت تقریبی در Live
6. بازسازی یک زمان گذشته
7. اعمال تمام فیلترها
8. مشاهده KPIهای فرانمای وضعیت
9. تغییر آیکن
10. اجرای کامل در شبکه داخلی بدون اینترنت
