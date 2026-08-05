import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors/domain-error";
import { logAudit } from "@/server/services/audit-service";
import type { ActorContext } from "@/server/services/permission-service";
import type { Prisma, VehicleReadiness } from "@/generated/prisma/client";
import type { VehicleCreateInput, VehicleUpdateInput } from "@/lib/validation/vehicle";

export interface VehicleDTO {
  id: string;
  identifier: string;
  plateNumber: string | null;
  vehicleTypeId: string;
  vehicleTypeName: string;
  fuelTankLiters: number;
  avgConsumptionPer100Km: number;
  avgSpeedKmh: number;
  readiness: VehicleReadiness;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type VehicleWithType = Prisma.VehicleGetPayload<{ include: { vehicleType: true } }>;

function toDTO(vehicle: VehicleWithType): VehicleDTO {
  return {
    id: vehicle.id,
    identifier: vehicle.identifier,
    plateNumber: vehicle.plateNumber,
    vehicleTypeId: vehicle.vehicleTypeId,
    vehicleTypeName: vehicle.vehicleType.name,
    fuelTankLiters: Number(vehicle.fuelTankLiters),
    avgConsumptionPer100Km: Number(vehicle.avgConsumptionPer100Km),
    avgSpeedKmh: Number(vehicle.avgSpeedKmh),
    readiness: vehicle.readiness,
    notes: vehicle.notes,
    isActive: vehicle.isActive,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

export async function listVehicles(filters: {
  vehicleTypeId?: string;
  readiness?: VehicleReadiness;
  q?: string;
}): Promise<VehicleDTO[]> {
  const where: Prisma.VehicleWhereInput = { deletedAt: null };
  if (filters.vehicleTypeId) where.vehicleTypeId = filters.vehicleTypeId;
  if (filters.readiness) where.readiness = filters.readiness;
  if (filters.q) {
    where.OR = [
      { identifier: { contains: filters.q, mode: "insensitive" } },
      { plateNumber: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: { vehicleType: true },
    orderBy: { identifier: "asc" },
  });

  return vehicles.map(toDTO);
}

export async function getVehicleById(id: string): Promise<VehicleDTO | null> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, deletedAt: null },
    include: { vehicleType: true },
  });
  return vehicle ? toDTO(vehicle) : null;
}

export interface FleetSummary {
  total: number;
  ready: number;
  outOfService: number;
}

export async function getFleetSummary(): Promise<FleetSummary> {
  const [total, ready, outOfService] = await Promise.all([
    prisma.vehicle.count({ where: { deletedAt: null } }),
    prisma.vehicle.count({ where: { deletedAt: null, readiness: "READY" } }),
    prisma.vehicle.count({ where: { deletedAt: null, readiness: "OUT_OF_SERVICE" } }),
  ]);
  return { total, ready, outOfService };
}

async function assertVehicleTypeExists(vehicleTypeId: string): Promise<void> {
  const vehicleType = await prisma.vehicleType.findFirst({
    where: { id: vehicleTypeId, deletedAt: null },
  });
  if (!vehicleType) {
    throw new DomainError("VEHICLE_TYPE_NOT_FOUND", "نوع خودرو انتخاب‌شده یافت نشد.", {
      vehicleTypeId: "نوع خودرو انتخاب‌شده یافت نشد.",
    });
  }
}

export async function createVehicle(input: VehicleCreateInput, actor: ActorContext): Promise<VehicleDTO> {
  await assertVehicleTypeExists(input.vehicleTypeId);

  try {
    const created = await prisma.vehicle.create({
      data: {
        identifier: input.identifier,
        plateNumber: input.plateNumber ?? null,
        vehicleTypeId: input.vehicleTypeId,
        fuelTankLiters: input.fuelTankLiters,
        avgConsumptionPer100Km: input.avgConsumptionPer100Km,
        avgSpeedKmh: input.avgSpeedKmh,
        readiness: input.readiness ?? "READY",
        notes: input.notes ?? null,
      },
      include: { vehicleType: true },
    });

    const dto = toDTO(created);
    await logAudit({
      actorUserId: actor.userId,
      action: "vehicle.created",
      entityType: "Vehicle",
      entityId: created.id,
      afterJson: dto as unknown as Prisma.InputJsonValue,
    });

    return dto;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new DomainError("VEHICLE_IDENTIFIER_DUPLICATE", "این شناسه قبلاً استفاده شده است.", {
        identifier: "این شناسه قبلاً استفاده شده است.",
      });
    }
    throw error;
  }
}

export async function updateVehicle(
  id: string,
  input: VehicleUpdateInput,
  actor: ActorContext,
): Promise<VehicleDTO> {
  const existing = await prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    throw new DomainError("VEHICLE_NOT_FOUND", "خودرو یافت نشد.");
  }

  if (input.vehicleTypeId) {
    await assertVehicleTypeExists(input.vehicleTypeId);
  }

  const updated = await prisma.vehicle.update({
    where: { id },
    data: {
      plateNumber: input.plateNumber,
      vehicleTypeId: input.vehicleTypeId,
      fuelTankLiters: input.fuelTankLiters,
      avgConsumptionPer100Km: input.avgConsumptionPer100Km,
      avgSpeedKmh: input.avgSpeedKmh,
      readiness: input.readiness,
      notes: input.notes,
      isActive: input.isActive,
    },
    include: { vehicleType: true },
  });

  const afterDto = toDTO(updated);
  await logAudit({
    actorUserId: actor.userId,
    action: "vehicle.updated",
    entityType: "Vehicle",
    entityId: id,
    beforeJson: {
      plateNumber: existing.plateNumber,
      vehicleTypeId: existing.vehicleTypeId,
      fuelTankLiters: Number(existing.fuelTankLiters),
      avgConsumptionPer100Km: Number(existing.avgConsumptionPer100Km),
      avgSpeedKmh: Number(existing.avgSpeedKmh),
      readiness: existing.readiness,
      notes: existing.notes,
      isActive: existing.isActive,
    } as Prisma.InputJsonValue,
    afterJson: afterDto as unknown as Prisma.InputJsonValue,
  });

  return afterDto;
}

export async function softDeleteVehicle(id: string, actor: ActorContext): Promise<void> {
  const existing = await prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    throw new DomainError("VEHICLE_NOT_FOUND", "خودرو یافت نشد.");
  }

  await prisma.vehicle.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

  await logAudit({
    actorUserId: actor.userId,
    action: "vehicle.deleted",
    entityType: "Vehicle",
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
