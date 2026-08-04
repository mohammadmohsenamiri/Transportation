# معماری سامانه، مدل داده و موتور موقعیت

## 1. سبک معماری

نسخه اول یک **modular monolith** با Next.js App Router است. این انتخاب deployment داخل شبکه را ساده نگه می‌دارد، ولی مرزهای domain به‌گونه‌ای تعریف می‌شوند که worker یا سرویس GPS واقعی در آینده جدا شود.

لایه‌ها:

1. Presentation: صفحات، componentها و map workspace
2. Application: use caseها و orchestration
3. Domain: قواعد مأموریت، مسیر، خودرو و مرسوله
4. Infrastructure: Prisma/PostgreSQL، auth، فایل، map provider، audit

Route handlerها فقط validation، auth context، فراخوانی service و mapping response را انجام می‌دهند.

## 2. اجزای runtime

- `web`: Next.js server و assetهای static
- `postgres`: منبع اصلی داده
- `worker`: در فازهای اولیه اختیاری/DB-backed برای کارهای زمان‌بندی، cleanup و materialized metrics؛ محاسبه markerها وابسته به worker نیست
- `internal-map-server`: خارج از این repo یا سرویس داخلی سازمان؛ از طریق URL تنظیم می‌شود
- reverse proxy داخلی برای TLS، compression و محدودیت upload

Redis/BullMQ تنها وقتی وارد می‌شود که نیاز واقعی queue اثبات شود؛ interface job queue از ابتدا وابستگی مستقیم domain را حذف می‌کند.

## 3. مدل‌های اصلی Prisma

نام‌ها پیشنهادی و binding هستند مگر محدودیت فنی مستند شود.

### User و RBAC

```text
User
Role
UserRole
Session / Account (بر اساس راهکار auth)
UserOrganizationScope (nullable/future-ready)
```

Role codeها: `MISSION_PLANNER`, `STATUS_VIEWER`, `ADMIN`.

### OrganizationUnit

```text
id UUID
code String unique
name String
level OrganizationLevel
parentId UUID nullable
latitude Decimal(9,6) nullable while draft
longitude Decimal(9,6) nullable while draft
address String nullable
iconAssetId UUID nullable
isActive Boolean
createdAt/updatedAt/deletedAt
createdById/updatedById
```

Constraint سطح parent در service و در صورت امکان database check/trigger enforce شود. unique پیشنهادی: `(parentId, code)` و یک code جهانی برای integration.

### VehicleType

```text
id, code nullable unique, name unique, description
iconAssetId, isActive, audit fields
```

هیچ seed مربوط به وانت/کامیونت ایجاد نشود.

### Vehicle

```text
id UUID
identifier String unique
plateNumber String nullable
vehicleTypeId UUID
fuelTankLiters Decimal(10,2)
avgConsumptionPer100Km Decimal(10,3)
avgSpeedKmh Decimal(10,2)
readiness VehicleReadiness
iconAssetId UUID nullable
notes String nullable
isActive Boolean
audit + soft delete
```

### CargoType

catalog بدون مقدار business پیش‌فرض: `id`, `code?`, `name`, `description?`, `isActive`.

### Shipment

```text
id UUID
trackingCode String unique
title String
cargoTypeId UUID
originWarehouseId UUID
destinationOrganizationUnitId UUID nullable
destinationTitle String
destinationLatitude Decimal(9,6)
destinationLongitude Decimal(9,6)
weightKg Decimal nullable
volumeM3 Decimal nullable
notes String nullable
status ShipmentStatus
audit + soft delete
```

مختصات مقصد snapshot می‌شوند حتی اگر مقصد organization unit باشد تا تاریخچه با جابه‌جایی بعدی دفتر تغییر نکند.

### Route و RoutePoint

```text
Route:
  id, code unique, name, description
  source RouteSource = CSV | MAP_DRAWING
  originLatitude/originLongitude
  destinationLatitude/destinationLongitude
  totalDistanceMeters BigInt
  pointCount Int
  checksum String
  version Int
  isActive, audit, soft delete

RoutePoint:
  id
  routeId
  sequence Int
  latitude Decimal(9,6)
  longitude Decimal(9,6)
  label String nullable
  cumulativeDistanceMeters BigInt
  unique(routeId, sequence)
```

ویرایش route استفاده‌شده، نسخه جدید می‌سازد تا تاریخچه مأموریت تغییر نکند.

### Mission و MissionShipment

```text
Mission:
  id UUID
  code String unique
  vehicleId UUID
  originWarehouseId UUID
  originTitle/latitude/longitude snapshot
  destinationOrganizationUnitId UUID nullable
  destinationTitle/latitude/longitude snapshot
  startAt DateTime UTC
  routeId UUID nullable
  routeVersion Int nullable
  speedSnapshotKmh Decimal
  distanceMeters BigInt
  estimatedDurationSeconds Int
  estimatedArrivalAt DateTime UTC
  persistedStatus MissionPersistedStatus
  notes String nullable
  publishedAt/cancelledAt nullable
  cancellationReason nullable
  audit + soft delete

MissionShipment:
  missionId
  shipmentId
  isActiveAssignment Boolean @default(true)
  createdAt
  partial unique index (shipmentId) WHERE isActiveAssignment = true  -- ADR-019, migration SQL دستی
```

طبق ADR-019، چون Prisma schema مستقیماً partial unique index تعریف نمی‌کند، این ایندکس با migration SQL دستی ساخته می‌شود. `isActiveAssignment` هنگام publish در transaction با `SELECT ... FOR UPDATE` روی shipment قفل و true می‌شود؛ هنگام cancel/complete/archive به false تغییر می‌کند تا مرسوله آزاد شود.

### MapProvider

```text
id, name
kind = INTERNAL_TMS | INTERNAL_XYZ | INTERNAL_WMTS | EXTERNAL_XYZ
urlTemplate
attribution nullable
minZoom/maxZoom
tileSize
subdomains JSON nullable
requiresApiKey Boolean
secretReference nullable (کلید خام در DB ساده ذخیره نشود)
isDefault/isEnabled
healthStatus/lastCheckedAt
createdBy/audit
```

Provider پیش‌فرض در production باید داخلی باشد.

### IconAsset

```text
id, name, category = VEHICLE | OFFICE | WAREHOUSE | DESTINATION | OTHER
mimeType = image/svg+xml | image/png
storagePath
width/height nullable
sha256
isActive
uploadedBy/audit
```

### AuditLog

```text
id, actorUserId, action, entityType, entityId
beforeJson, afterJson, metadataJson
ipAddress, userAgent, occurredAt
```

## 4. enumها

```text
OrganizationLevel: COUNTRY_OFFICE, GROUP_OFFICE, DISTRIBUTOR_OFFICE, WAREHOUSE
VehicleReadiness: READY, OUT_OF_SERVICE
ShipmentStatus: DRAFT, WAITING_FOR_DISPATCH, IN_TRANSIT, DELIVERED, CANCELLED
MissionPersistedStatus: DRAFT, SCHEDULED, CANCELLED, ARCHIVED
RouteSource: CSV, MAP_DRAWING
MapProviderKind: INTERNAL_TMS, INTERNAL_XYZ, INTERNAL_WMTS, EXTERNAL_XYZ
```

وضعیت `WAITING/IN_PROGRESS/ARRIVED` برای مأموریت در view time مشتق می‌شود و enum persisted نیست.

## 5. الگوریتم فاصله و موقعیت

### ورودی تابع pure

```ts
calculateMissionPosition({
  viewTime,
  startAt,
  speedKmh,
  origin,
  destination,
  routePoints?: readonly GeoPoint[],
}): MissionPositionResult
```

### آماده‌سازی مسیر

- اگر route حداقل دو نقطه معتبر دارد، polyline route استفاده شود.
- در غیر این صورت line مستقیم از origin به destination ساخته و `isFallbackDirect=true` شود.
- فاصله هر segment با Haversine/geodesic معتبر محاسبه شود.
- cumulative distance به متر محاسبه و در RoutePoint ذخیره شود.
- total distance صفر یا بسیار کم به‌عنوان مأموریت instant/invalid طبق validation مدیریت شود.

### فرمول

```text
elapsedSeconds = max(0, viewTime - startAt)
speedMetersPerSecond = speedKmh * 1000 / 3600
traveledMeters = min(totalDistanceMeters, elapsedSeconds * speedMetersPerSecond)
progress = totalDistanceMeters == 0 ? 1 : traveledMeters / totalDistanceMeters
ETA = startAt + totalDistanceMeters / speedMetersPerSecond
```

segment حاوی `traveledMeters` با binary search روی cumulative distances پیدا و مختصات داخل segment interpolate شود. برای فاصله‌های معمول interpolation خطی lat/lng پذیرفتنی است؛ Turf `along` یا interpolation geodesic ترجیح دارد.

### خروجی

```text
status: WAITING | IN_PROGRESS | ARRIVED | CANCELLED
position: {lat,lng}
progressRatio: 0..1
traveledMeters
remainingMeters
estimatedArrivalAt
remainingSeconds
isFallbackDirect
isEstimated: true
```

### قواعد مرزی

- `viewTime < startAt`: موقعیت مبدأ، progress صفر.
- `viewTime >= ETA`: موقعیت مقصد، progress یک.
- speed نامعتبر: مأموریت قابل انتشار نیست؛ API خطای domain برگرداند.
- route یک‌نقطه‌ای: invalid.
- تغییر ساعت سیستم: live time باید با response سرور همگام و drift مانیتور شود.
- مأموریت cancel شده: آخرین موقعیت تخمینی تا `cancelledAt` قابل محاسبه است ولی status و style لغوشده نمایش داده شود.

## 6. جلوگیری از write amplification

موقعیت‌ها در هر ثانیه persist نمی‌شوند. API نقشه داده ثابت مأموریت و route geometry فشرده را برای بازه می‌دهد و client در interval کنترل‌شده (پیشنهاد 5 ثانیه) موقعیت را محاسبه می‌کند. server همان تابع domain را برای export، SSR یا validation استفاده می‌کند تا اختلاف الگوریتم رخ ندهد.

در مقیاس بالا می‌توان snapshot cache کوتاه‌عمر ساخت، اما cache source of truth نیست.

## 7. Queryهای نقشه و performance

- فقط مأموریت‌های مرتبط با time window و فیلترها خوانده شوند.
- projection سبک شامل mission، vehicle، origin/destination و route summary باشد.
- geometry مسیر فقط برای مأموریت انتخاب‌شده یا routeهای لازم fetch شود.
- indexها: `Mission(startAt)`, `Mission(estimatedArrivalAt)`, `Mission(vehicleId,startAt)`, `Mission(originWarehouseId)`, destination، status و soft-delete.
- route points با `(routeId, sequence)` خوانده شوند.
- بیش از 500 marker clustering و virtualization جدول فعال شود.
- baseline طراحی: 10,000 خودرو، 100,000 مأموریت تاریخی، 2,000 مأموریت هم‌زمان قابل فیلتر. مقادیر واقعی در تست ظرفیت تأیید شوند.

## 8. تراکنش‌ها و concurrency

انتشار مأموریت در یک transaction:

1. re-read خودرو و readiness
2. بررسی overlap مأموریت خودرو
3. `SELECT ... FOR UPDATE` روی مرسوله‌ها و درج `MissionShipment` با `isActiveAssignment=true` (ADR-019)؛ نقض partial unique به خطای `SHIPMENT_ALREADY_ASSIGNED` نگاشت شود
4. snapshot مبدأ، مقصد، سرعت و route version
5. محاسبه distance/ETA
6. ذخیره مأموریت و link مرسوله‌ها
7. تغییر وضعیت مرسوله‌ها به waiting
8. ثبت audit

برای جلوگیری از double submit از idempotency key در mutationهای حساس یا token فرم استفاده شود.
