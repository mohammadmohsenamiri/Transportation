-- CreateEnum
CREATE TYPE "MissionFailureClassification" AS ENUM ('VEHICLE_BREAKDOWN', 'ACCIDENT', 'CARGO_ISSUE', 'ROUTE_BLOCKED', 'WEATHER', 'DRIVER_UNAVAILABLE', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MissionPersistedStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "MissionPersistedStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "actualArrivalAt" TIMESTAMP(3),
ADD COLUMN     "actualDepartureAt" TIMESTAMP(3),
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "failureClassification" "MissionFailureClassification",
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "lastReopenedAt" TIMESTAMP(3),
ADD COLUMN     "missionTypeId" TEXT,
ADD COLUMN     "reopenCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "statusBeforeArchive" "MissionPersistedStatus",
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MissionType" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MissionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionNote" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MissionNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MissionType_code_key" ON "MissionType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MissionType_name_key" ON "MissionType"("name");

-- CreateIndex
CREATE INDEX "MissionType_isActive_idx" ON "MissionType"("isActive");

-- CreateIndex
CREATE INDEX "MissionNote_missionId_createdAt_idx" ON "MissionNote"("missionId", "createdAt");

-- CreateIndex
CREATE INDEX "MissionNote_createdById_idx" ON "MissionNote"("createdById");

-- CreateIndex
CREATE INDEX "Mission_missionTypeId_idx" ON "Mission"("missionTypeId");

-- CreateIndex
CREATE INDEX "Mission_persistedStatus_startAt_idx" ON "Mission"("persistedStatus", "startAt");

-- CreateIndex
CREATE INDEX "Mission_actualArrivalAt_idx" ON "Mission"("actualArrivalAt");

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_missionTypeId_fkey" FOREIGN KEY ("missionTypeId") REFERENCES "MissionType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionNote" ADD CONSTRAINT "MissionNote_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionNote" ADD CONSTRAINT "MissionNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
