-- CreateEnum
CREATE TYPE "MapProviderKind" AS ENUM ('INTERNAL_TMS', 'INTERNAL_XYZ', 'INTERNAL_WMTS', 'EXTERNAL_XYZ');

-- CreateEnum
CREATE TYPE "MapProviderHealthStatus" AS ENUM ('UNKNOWN', 'HEALTHY', 'UNHEALTHY');

-- CreateTable
CREATE TABLE "MapProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "MapProviderKind" NOT NULL,
    "urlTemplate" TEXT NOT NULL,
    "attribution" TEXT,
    "minZoom" INTEGER NOT NULL DEFAULT 0,
    "maxZoom" INTEGER NOT NULL DEFAULT 19,
    "tileSize" INTEGER NOT NULL DEFAULT 256,
    "subdomains" JSONB,
    "requiresApiKey" BOOLEAN NOT NULL DEFAULT false,
    "secretReference" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "healthStatus" "MapProviderHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "MapProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MapProvider_name_key" ON "MapProvider"("name");

-- CreateIndex
CREATE INDEX "MapProvider_isEnabled_idx" ON "MapProvider"("isEnabled");

-- CreateIndex
CREATE INDEX "MapProvider_isDefault_idx" ON "MapProvider"("isDefault");

-- AddForeignKey
ALTER TABLE "MapProvider" ADD CONSTRAINT "MapProvider_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapProvider" ADD CONSTRAINT "MapProvider_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
