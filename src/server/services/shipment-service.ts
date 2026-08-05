import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors/domain-error";
import { logAudit } from "@/server/services/audit-service";
import type { ActorContext } from "@/server/services/permission-service";
import type { Prisma, ShipmentStatus } from "@/generated/prisma/client";
import type { ShipmentCreateInput, ShipmentUpdateInput } from "@/lib/validation/shipment";

export interface ShipmentDTO {
  id: string;
  trackingCode: string;
  title: string;
  cargoTypeId: string;
  cargoTypeName: string;
  originWarehouseId: string;
  originWarehouseName: string;
  originLatitude: number | null;
  originLongitude: number | null;
  destinationMode: "ORGANIZATION_UNIT" | "COORDINATES";
  destinationOrganizationUnitId: string | null;
  destinationOrganizationUnitName: string | null;
  destinationTitle: string;
  destinationLatitude: number;
  destinationLongitude: number;
  weightKg: number | null;
  volumeM3: number | null;
  notes: string | null;
  status: ShipmentStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type ShipmentWithRelations = Prisma.ShipmentGetPayload<{
  include: { cargoType: true; originWarehouse: true; destinationOrganizationUnit: true };
}>;

function toDTO(shipment: ShipmentWithRelations): ShipmentDTO {
  return {
    id: shipment.id,
    trackingCode: shipment.trackingCode,
    title: shipment.title,
    cargoTypeId: shipment.cargoTypeId,
    cargoTypeName: shipment.cargoType.name,
    originWarehouseId: shipment.originWarehouseId,
    originWarehouseName: shipment.originWarehouse.name,
    originLatitude: shipment.originWarehouse.latitude === null ? null : Number(shipment.originWarehouse.latitude),
    originLongitude: shipment.originWarehouse.longitude === null ? null : Number(shipment.originWarehouse.longitude),
    destinationMode: shipment.destinationOrganizationUnitId ? "ORGANIZATION_UNIT" : "COORDINATES",
    destinationOrganizationUnitId: shipment.destinationOrganizationUnitId,
    destinationOrganizationUnitName: shipment.destinationOrganizationUnit?.name ?? null,
    destinationTitle: shipment.destinationTitle,
    destinationLatitude: Number(shipment.destinationLatitude),
    destinationLongitude: Number(shipment.destinationLongitude),
    weightKg: shipment.weightKg === null ? null : Number(shipment.weightKg),
    volumeM3: shipment.volumeM3 === null ? null : Number(shipment.volumeM3),
    notes: shipment.notes,
    status: shipment.status,
    isActive: shipment.isActive,
    createdAt: shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt.toISOString(),
  };
}

const INCLUDE_RELATIONS = { cargoType: true, originWarehouse: true, destinationOrganizationUnit: true } as const;

function generateTrackingCode(): string {
  return `SH-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function assertCargoTypeExists(cargoTypeId: string): Promise<void> {
  const cargoType = await prisma.cargoType.findFirst({ where: { id: cargoTypeId, deletedAt: null } });
  if (!cargoType) {
    throw new DomainError("CARGO_TYPE_NOT_FOUND", "نوع بار انتخاب‌شده یافت نشد.", {
      cargoTypeId: "نوع بار انتخاب‌شده یافت نشد.",
    });
  }
}

async function assertOriginWarehouse(originWarehouseId: string): Promise<void> {
  const unit = await prisma.organizationUnit.findFirst({
    where: { id: originWarehouseId, deletedAt: null },
  });
  if (!unit) {
    throw new DomainError("SHIPMENT_ORIGIN_NOT_FOUND", "انبار مبدأ یافت نشد.", {
      originWarehouseId: "انبار مبدأ یافت نشد.",
    });
  }
  if (unit.level !== "WAREHOUSE") {
    throw new DomainError("SHIPMENT_ORIGIN_NOT_WAREHOUSE", "مبدأ باید یک انبار باشد.", {
      originWarehouseId: "مبدأ باید یک انبار باشد.",
    });
  }
}

interface DestinationSnapshot {
  destinationOrganizationUnitId: string | null;
  destinationTitle: string;
  destinationLatitude: number;
  destinationLongitude: number;
}

async function resolveDestinationSnapshot(input: {
  destinationMode?: "ORGANIZATION_UNIT" | "COORDINATES";
  destinationOrganizationUnitId?: string | null;
  destinationTitle?: string | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
}): Promise<DestinationSnapshot> {
  if (input.destinationMode === "ORGANIZATION_UNIT") {
    const unit = await prisma.organizationUnit.findFirst({
      where: { id: input.destinationOrganizationUnitId!, deletedAt: null },
    });
    if (!unit) {
      throw new DomainError("SHIPMENT_DESTINATION_NOT_FOUND", "گره سازمانی مقصد یافت نشد.", {
        destinationOrganizationUnitId: "گره سازمانی مقصد یافت نشد.",
      });
    }
    if (unit.latitude === null || unit.longitude === null) {
      throw new DomainError("SHIPMENT_DESTINATION_NO_COORDINATES", "گره سازمانی انتخاب‌شده مختصات ندارد.", {
        destinationOrganizationUnitId: "گره سازمانی انتخاب‌شده مختصات ندارد.",
      });
    }
    return {
      destinationOrganizationUnitId: unit.id,
      destinationTitle: unit.name,
      destinationLatitude: Number(unit.latitude),
      destinationLongitude: Number(unit.longitude),
    };
  }

  return {
    destinationOrganizationUnitId: null,
    destinationTitle: input.destinationTitle!.trim(),
    destinationLatitude: input.destinationLatitude!,
    destinationLongitude: input.destinationLongitude!,
  };
}

export async function listShipments(filters: {
  q?: string;
  status?: ShipmentStatus;
  cargoTypeId?: string;
  originWarehouseId?: string;
  /** فقط مرسوله‌های بدون تخصیص فعال (قابل انتخاب برای مأموریت جدید) — Phase 7. */
  availableForMission?: boolean;
}): Promise<ShipmentDTO[]> {
  const where: Prisma.ShipmentWhereInput = { deletedAt: null };
  if (filters.status) where.status = filters.status;
  if (filters.cargoTypeId) where.cargoTypeId = filters.cargoTypeId;
  if (filters.originWarehouseId) where.originWarehouseId = filters.originWarehouseId;
  if (filters.availableForMission) {
    where.isActive = true;
    where.status = { in: ["DRAFT", "WAITING_FOR_DISPATCH"] };
    where.missionLinks = { none: { isActiveAssignment: true } };
  }
  if (filters.q) {
    where.OR = [
      { trackingCode: { contains: filters.q, mode: "insensitive" } },
      { title: { contains: filters.q, mode: "insensitive" } },
      { destinationTitle: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const shipments = await prisma.shipment.findMany({
    where,
    include: INCLUDE_RELATIONS,
    orderBy: { createdAt: "desc" },
  });
  return shipments.map(toDTO);
}

export interface ShipmentSummary {
  total: number;
  waitingForDispatch: number;
  inTransit: number;
  delivered: number;
}

export async function getShipmentSummary(): Promise<ShipmentSummary> {
  const [total, waitingForDispatch, inTransit, delivered] = await Promise.all([
    prisma.shipment.count({ where: { deletedAt: null } }),
    prisma.shipment.count({ where: { deletedAt: null, status: "WAITING_FOR_DISPATCH" } }),
    prisma.shipment.count({ where: { deletedAt: null, status: "IN_TRANSIT" } }),
    prisma.shipment.count({ where: { deletedAt: null, status: "DELIVERED" } }),
  ]);
  return { total, waitingForDispatch, inTransit, delivered };
}

export async function getShipmentById(id: string): Promise<ShipmentDTO | null> {
  const shipment = await prisma.shipment.findFirst({
    where: { id, deletedAt: null },
    include: INCLUDE_RELATIONS,
  });
  return shipment ? toDTO(shipment) : null;
}

export async function getShipmentHistory(id: string) {
  return prisma.auditLog.findMany({
    where: { entityType: "Shipment", entityId: id },
    orderBy: { occurredAt: "desc" },
    take: 50,
  });
}

export async function createShipment(input: ShipmentCreateInput, actor: ActorContext): Promise<ShipmentDTO> {
  await assertCargoTypeExists(input.cargoTypeId);
  await assertOriginWarehouse(input.originWarehouseId);
  const destination = await resolveDestinationSnapshot(input);

  const baseData = {
    title: input.title,
    cargoTypeId: input.cargoTypeId,
    originWarehouseId: input.originWarehouseId,
    destinationOrganizationUnitId: destination.destinationOrganizationUnitId,
    destinationTitle: destination.destinationTitle,
    destinationLatitude: destination.destinationLatitude,
    destinationLongitude: destination.destinationLongitude,
    weightKg: input.weightKg ?? null,
    volumeM3: input.volumeM3 ?? null,
    notes: input.notes ?? null,
    createdById: actor.userId,
    updatedById: actor.userId,
  };

  const explicitCode = input.trackingCode?.trim() || null;
  const maxAttempts = explicitCode ? 1 : 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const trackingCode = explicitCode ?? generateTrackingCode();
    try {
      const created = await prisma.shipment.create({
        data: { ...baseData, trackingCode },
        include: INCLUDE_RELATIONS,
      });

      const dto = toDTO(created);
      await logAudit({
        actorUserId: actor.userId,
        action: "shipment.created",
        entityType: "Shipment",
        entityId: created.id,
        afterJson: dto as unknown as Prisma.InputJsonValue,
      });
      return dto;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        if (explicitCode) {
          throw new DomainError("SHIPMENT_TRACKING_CODE_DUPLICATE", "این کد رهگیری قبلاً استفاده شده است.", {
            trackingCode: "این کد رهگیری قبلاً استفاده شده است.",
          });
        }
        continue; // کد تولیدشده تصادفاً تکراری بود؛ تلاش دوباره
      }
      throw error;
    }
  }

  throw new DomainError("SHIPMENT_TRACKING_CODE_GENERATION_FAILED", "تولید کد رهگیری یکتا ناموفق بود؛ دوباره تلاش کنید.");
}

export async function updateShipment(
  id: string,
  input: ShipmentUpdateInput,
  actor: ActorContext,
): Promise<ShipmentDTO> {
  const existing = await prisma.shipment.findFirst({ where: { id, deletedAt: null }, include: INCLUDE_RELATIONS });
  if (!existing) {
    throw new DomainError("SHIPMENT_NOT_FOUND", "مرسوله یافت نشد.");
  }

  if (input.cargoTypeId) {
    await assertCargoTypeExists(input.cargoTypeId);
  }
  if (input.originWarehouseId) {
    await assertOriginWarehouse(input.originWarehouseId);
  }

  let destinationPatch: Partial<DestinationSnapshot> = {};
  if (input.destinationMode) {
    destinationPatch = await resolveDestinationSnapshot(input);
  }

  const updated = await prisma.shipment.update({
    where: { id },
    data: {
      title: input.title,
      cargoTypeId: input.cargoTypeId,
      originWarehouseId: input.originWarehouseId,
      ...destinationPatch,
      weightKg: input.weightKg,
      volumeM3: input.volumeM3,
      notes: input.notes,
      status: input.status,
      isActive: input.isActive,
      updatedById: actor.userId,
    },
    include: INCLUDE_RELATIONS,
  });

  const beforeDto = toDTO(existing);
  const afterDto = toDTO(updated);
  await logAudit({
    actorUserId: actor.userId,
    action: "shipment.updated",
    entityType: "Shipment",
    entityId: id,
    beforeJson: beforeDto as unknown as Prisma.InputJsonValue,
    afterJson: afterDto as unknown as Prisma.InputJsonValue,
  });

  return afterDto;
}

export async function softDeleteShipment(id: string, actor: ActorContext): Promise<void> {
  const existing = await prisma.shipment.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    throw new DomainError("SHIPMENT_NOT_FOUND", "مرسوله یافت نشد.");
  }

  await prisma.shipment.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false, updatedById: actor.userId },
  });

  await logAudit({
    actorUserId: actor.userId,
    action: "shipment.deleted",
    entityType: "Shipment",
    entityId: id,
  });
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
