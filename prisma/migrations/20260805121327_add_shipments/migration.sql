-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'WAITING_FOR_DISPATCH', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cargoTypeId" TEXT NOT NULL,
    "originWarehouseId" TEXT NOT NULL,
    "destinationOrganizationUnitId" TEXT,
    "destinationTitle" TEXT NOT NULL,
    "destinationLatitude" DECIMAL(9,6) NOT NULL,
    "destinationLongitude" DECIMAL(9,6) NOT NULL,
    "weightKg" DECIMAL(10,2),
    "volumeM3" DECIMAL(10,3),
    "notes" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_trackingCode_key" ON "Shipment"("trackingCode");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "Shipment_originWarehouseId_idx" ON "Shipment"("originWarehouseId");

-- CreateIndex
CREATE INDEX "Shipment_cargoTypeId_idx" ON "Shipment"("cargoTypeId");

-- CreateIndex
CREATE INDEX "Shipment_isActive_idx" ON "Shipment"("isActive");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_cargoTypeId_fkey" FOREIGN KEY ("cargoTypeId") REFERENCES "CargoType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_originWarehouseId_fkey" FOREIGN KEY ("originWarehouseId") REFERENCES "OrganizationUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_destinationOrganizationUnitId_fkey" FOREIGN KEY ("destinationOrganizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
