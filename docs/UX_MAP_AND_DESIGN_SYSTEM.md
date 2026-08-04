# طراحی تجربه کاربری، نقشه و Design System

## 1. زبان بصری

ظاهر باید آینده‌نگر، دقیق و حرفه‌ای باشد؛ نه شلوغ و بازی‌گونه. اصول:

- پنل‌های لایه‌ای با عمق ظریف، border نیمه‌شفاف و glow محدود
- grid و typography واضح برای خوانایی فارسی
- motion کوتاه 120 تا 220ms؛ پشتیبانی `prefers-reduced-motion`
- رنگ‌های وضعیت از design token و قابل خواندن در light/dark
- visualization داده مهم‌تر از تزئینات
- هیچ متن یا کنترل مهمی فقط با hover قابل کشف نباشد

Theme روشن و تیره الزامی است. theme پیش‌فرض روشن برای هم‌راستایی با پروژه مرجع، ولی نقشه می‌تواند style روشن/تیره متناسب داشته باشد. انتخاب کاربر persist شود.

## 2. فونت و typography

- Vazirmatn از package/local
- body حداقل 14px دسکتاپ و 15/16px موبایل
- KPIها با ارقام خوانا و `font-variant-numeric: tabular-nums`
- کد، URL و مختصات LTR
- line-height فارسی حداقل 1.7 برای متن‌های توضیحی

## 3. Layout واکنش‌گرا

### Desktop ≥ 1280

- sidebar راست
- header باریک
- map workspace تمام‌ارتفاع
- جدول مأموریت کنار نقشه با عرض 360 تا 440px
- filter panel collapsible
- timeline پایین نقشه و بالاتر از attribution

### Tablet 768–1279

- sidebar جمع‌شونده
- جدول به drawer یا panel 35–45% عرض تبدیل شود
- filterها در sheet
- timeline دو ردیفه و touch-friendly

### Mobile 360–767

- navigation پایین یا drawer
- نقشه تمام صفحه
- جدول مأموریت bottom sheet با snap point
- فیلترها full-screen sheet
- کارت جزئیات bottom sheet و نه popup کوچک نقشه
- actionهای اصلی sticky و قابل دسترسی با یک دست

هیچ قابلیت اصلی در موبایل حذف نشود؛ فقط presentation تغییر کند.

## 4. قواعد Touch و Accessibility

- target لمسی حداقل 44×44 CSS px و فاصله مناسب
- drag روی map نباید مانع scroll sheet شود؛ handle واضح لازم است
- ترسیم route دارای دکمه‌های «افزودن نقطه»، undo، redo، پایان ترسیم و لغو باشد؛ فقط gesture مخفی کافی نیست
- keyboard navigation برای desktop؛ focus visible؛ Escape برای modal/sheet
- map actionها alternative list/button داشته باشند
- contrast مطابق WCAG AA برای متن و کنترل‌ها
- رنگ تنها نشانه status نباشد؛ icon/label نیز استفاده شود
- اعلان تغییر فیلتر/selection برای screen reader با aria-live محدود

## 5. فرانمای وضعیت

### Header

- عنوان «فرانمای وضعیت»
- زمان آخرین به‌روزرسانی
- وضعیت اتصال داخلی و Provider نقشه
- انتخاب بازه زمانی

### KPI cards

چیدمان 5 ستون در نمایش بزرگ و 2/1 ستون در کوچک. هر کارت شامل مقدار، عنوان، trend اختیاری و لینک drill-down است. animation شمارنده کوتاه و فقط بار اول؛ ارقام همیشه قابل انتخاب/خواندن.

### نمودارها

- بدون وابستگی CDN
- tooltip فارسی و RTL
- legend قابل toggle
- empty state و timestamp داده
- نمودارهای پیشنهادی: وضعیت مأموریت، آمادگی خودرو، مأموریت بر نوع خودرو، روند روزانه مرسوله رسیده

## 6. Map Workspace

### Toolbar

- انتخاب Provider/layer
- جست‌وجو
- بازکردن فیلتر
- fit to active missions
- toggle دفاتر/انبارها/خودروها
- ورود به حالت تعریف مأموریت یا ترسیم مسیر برای Planner/Admin

### Markerها

- Vehicle marker جهت حرکت را در صورت امکان از bearing segment بگیرد.
- وضعیت‌ها با ring/badge: waiting، moving، arrived، cancelled، out-of-service.
- icon سفارشی در container استاندارد قرار گیرد تا اندازه و hit area ثابت بماند.
- marker انتخاب‌شده دارای halo و z-index بالاتر است.
- marker دفاتر و انبارها بر اساس level قابل تمایز باشد.

### Selection synchronization

یک `selectedMissionId` واحد در state map workspace نگهداری شود. map و table هر دو از آن استفاده کنند؛ دو state مستقل ممنوع. تغییر selection باید:

1. ردیف را highlight کند.
2. marker را highlight کند.
3. در صورت انتخاب از جدول map را با animation کوتاه pan کند.
4. detail card را باز کند.
5. geometry route انتخاب‌شده را lazy-load کند.

### کارت جزئیات مأموریت

- کد مأموریت و شناسه خودرو
- مبدأ و مقصد
- status در زمان مشاهده
- progress bar و درصد
- زمان شروع، ETA و زمان باقی‌مانده
- نوع خودرو و نوع/تعداد مرسوله
- فاصله کل/باقی‌مانده
- badge «تقریبی»
- action مشاهده جزئیات کامل

## 7. سیکر زمان

- fixed در پایین map؛ overlap با attribution و mobile safe area نداشته باشد.
- نمایش واضح `زنده` یا `بازسازی زمانی`.
- slider باید علاوه بر drag، دکمه‌های گام 5/15 دقیقه و input ساعت داشته باشد.
- تاریخ شمسی و ساعت با ثانیه اختیاری نمایش داده شود.
- در Live، thumb به‌صورت خودکار حرکت کند؛ interaction کاربر سیستم را Historical می‌کند.
- اطلاعات position در client در interval معقول refresh شود؛ animation خودرو بین دو tick نرم ولی قابل خاموش‌کردن باشد.

## 8. ایجاد مأموریت از نقشه

Wizard کوتاه:

1. انتخاب انبار مبدأ از marker یا search
2. انتخاب مقصد از marker یا click/tap و ورود عنوان
3. انتخاب خودرو و زمان شروع
4. افزودن/انتخاب مرسوله‌ها و نوع بار
5. انتخاب route موجود، import CSV، ترسیم route یا direct fallback
6. review summary شامل فاصله، ETA، سوخت تقریبی و هشدارها
7. ذخیره draft یا انتشار

در خروج از wizard با تغییرات ذخیره‌نشده confirmation لازم است.

## 9. مدیریت آیکن

- upload با drag/drop و file picker
- preview light/dark و روی map روشن/تیره
- crop برای PNG در صورت نیاز؛ SVG بدون اجرای script render شود
- category و نام قابل جست‌وجو
- جلوگیری از حذف asset استفاده‌شده؛ replace/disable مجاز
- fallback icon داخلی همواره موجود است، ولی VehicleType business seed ایجاد نمی‌شود.

## 10. حالت‌های UI الزامی

برای هر صفحه و component داده‌ای:

- skeleton/loading
- empty با action مناسب
- recoverable error با retry
- validation error کنار فیلد و summary بالای فرم
- success toast و در mutation مهم summary
- permission denied بدون افشای داده
- offline-external-provider degraded state با امکان انتخاب نقشه داخلی

## 11. واژگان ثابت UI

- Dashboard: «فرانمای وضعیت»
- Map: «نمای پایش»
- Mission: «مأموریت»
- Shipment: «مرسوله»
- Vehicle readiness: «آماده به کار»، «خارج از سرویس»
- Estimated position: «موقعیت تقریبی»
- Live mode: «نمای زنده محاسباتی»
- Historical mode: «بازسازی زمانی»
