-- ADR-019: تضمین اینکه یک مرسوله در هر لحظه حداکثر در یک مأموریت "فعال" (isActiveAssignment = true) باشد.
-- Prisma schema مستقیماً partial unique index تعریف نمی‌کند؛ این ایندکس به‌صورت دستی نوشته می‌شود.
CREATE UNIQUE INDEX "MissionShipment_active_shipment_unique"
ON "MissionShipment" ("shipmentId")
WHERE "isActiveAssignment" = true;
