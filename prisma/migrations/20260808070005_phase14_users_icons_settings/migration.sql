-- CreateEnum
CREATE TYPE "IconCategory" AS ENUM ('VEHICLE', 'OFFICE', 'WAREHOUSE', 'DESTINATION', 'OTHER');

-- AlterTable
ALTER TABLE "OrganizationUnit" ADD COLUMN     "iconAssetId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "iconAssetId" TEXT;

-- AlterTable
ALTER TABLE "VehicleType" ADD COLUMN     "iconAssetId" TEXT;

-- CreateTable
CREATE TABLE "IconAsset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "IconCategory" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER NOT NULL,
    "originalFilename" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "uploadedById" TEXT,

    CONSTRAINT "IconAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "IconAsset_category_isActive_idx" ON "IconAsset"("category", "isActive");

-- CreateIndex
CREATE INDEX "IconAsset_deletedAt_idx" ON "IconAsset"("deletedAt");

-- CreateIndex
CREATE INDEX "IconAsset_sha256_idx" ON "IconAsset"("sha256");

-- CreateIndex
CREATE INDEX "OrganizationUnit_iconAssetId_idx" ON "OrganizationUnit"("iconAssetId");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "User_isActive_deletedAt_idx" ON "User"("isActive", "deletedAt");

-- CreateIndex
CREATE INDEX "Vehicle_iconAssetId_idx" ON "Vehicle"("iconAssetId");

-- CreateIndex
CREATE INDEX "VehicleType_iconAssetId_idx" ON "VehicleType"("iconAssetId");

-- AddForeignKey
ALTER TABLE "OrganizationUnit" ADD CONSTRAINT "OrganizationUnit_iconAssetId_fkey" FOREIGN KEY ("iconAssetId") REFERENCES "IconAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleType" ADD CONSTRAINT "VehicleType_iconAssetId_fkey" FOREIGN KEY ("iconAssetId") REFERENCES "IconAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_iconAssetId_fkey" FOREIGN KEY ("iconAssetId") REFERENCES "IconAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IconAsset" ADD CONSTRAINT "IconAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
