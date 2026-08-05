-- CreateEnum
CREATE TYPE "MissionPersistedStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'CANCELLED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "originWarehouseId" TEXT NOT NULL,
    "originTitle" TEXT NOT NULL,
    "originLatitude" DECIMAL(9,6) NOT NULL,
    "originLongitude" DECIMAL(9,6) NOT NULL,
    "destinationOrganizationUnitId" TEXT,
    "destinationTitle" TEXT NOT NULL,
    "destinationLatitude" DECIMAL(9,6) NOT NULL,
    "destinationLongitude" DECIMAL(9,6) NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "routeId" TEXT,
    "routeVersion" INTEGER,
    "speedSnapshotKmh" DECIMAL(10,2) NOT NULL,
    "distanceMeters" BIGINT NOT NULL,
    "estimatedDurationSeconds" INTEGER NOT NULL,
    "estimatedArrivalAt" TIMESTAMP(3) NOT NULL,
    "persistedStatus" "MissionPersistedStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "publishedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "duplicatedFromMissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionShipment" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "isActiveAssignment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionShipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mission_code_key" ON "Mission"("code");

-- CreateIndex
CREATE INDEX "Mission_vehicleId_idx" ON "Mission"("vehicleId");

-- CreateIndex
CREATE INDEX "Mission_startAt_idx" ON "Mission"("startAt");

-- CreateIndex
CREATE INDEX "Mission_estimatedArrivalAt_idx" ON "Mission"("estimatedArrivalAt");

-- CreateIndex
CREATE INDEX "Mission_persistedStatus_idx" ON "Mission"("persistedStatus");

-- CreateIndex
CREATE INDEX "Mission_originWarehouseId_idx" ON "Mission"("originWarehouseId");

-- CreateIndex
CREATE INDEX "MissionShipment_shipmentId_idx" ON "MissionShipment"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionShipment_missionId_shipmentId_key" ON "MissionShipment"("missionId", "shipmentId");

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_originWarehouseId_fkey" FOREIGN KEY ("originWarehouseId") REFERENCES "OrganizationUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_destinationOrganizationUnitId_fkey" FOREIGN KEY ("destinationOrganizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionShipment" ADD CONSTRAINT "MissionShipment_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionShipment" ADD CONSTRAINT "MissionShipment_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
