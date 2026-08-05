-- CreateEnum
CREATE TYPE "VehicleReadiness" AS ENUM ('READY', 'OUT_OF_SERVICE');

-- CreateTable
CREATE TABLE "VehicleType" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VehicleType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargoType" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CargoType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "plateNumber" TEXT,
    "vehicleTypeId" TEXT NOT NULL,
    "fuelTankLiters" DECIMAL(10,2) NOT NULL,
    "avgConsumptionPer100Km" DECIMAL(10,3) NOT NULL,
    "avgSpeedKmh" DECIMAL(10,2) NOT NULL,
    "readiness" "VehicleReadiness" NOT NULL DEFAULT 'READY',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleType_code_key" ON "VehicleType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleType_name_key" ON "VehicleType"("name");

-- CreateIndex
CREATE INDEX "VehicleType_isActive_idx" ON "VehicleType"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CargoType_code_key" ON "CargoType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CargoType_name_key" ON "CargoType"("name");

-- CreateIndex
CREATE INDEX "CargoType_isActive_idx" ON "CargoType"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_identifier_key" ON "Vehicle"("identifier");

-- CreateIndex
CREATE INDEX "Vehicle_vehicleTypeId_idx" ON "Vehicle"("vehicleTypeId");

-- CreateIndex
CREATE INDEX "Vehicle_readiness_idx" ON "Vehicle"("readiness");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "VehicleType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
