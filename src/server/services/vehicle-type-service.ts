import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors/domain-error";
import { logAudit } from "@/server/services/audit-service";
import type { ActorContext } from "@/server/services/permission-service";
import type { Prisma } from "@/generated/prisma/client";
import type { VehicleTypeCreateInput, VehicleTypeUpdateInput } from "@/lib/validation/vehicle";

export interface VehicleTypeDTO {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  vehicleCount: number;
  createdAt: string;
  updatedAt: string;
}

type VehicleTypeWithCount = Prisma.VehicleTypeGetPayload<{
  include: { _count: { select: { vehicles: { where: { deletedAt: null } } } } };
}>;

function toDTO(vehicleType: VehicleTypeWithCount): VehicleTypeDTO {
  return {
    id: vehicleType.id,
    code: vehicleType.code,
    name: vehicleType.name,
    description: vehicleType.description,
    isActive: vehicleType.isActive,
    vehicleCount: vehicleType._count.vehicles,
    createdAt: vehicleType.createdAt.toISOString(),
    updatedAt: vehicleType.updatedAt.toISOString(),
  };
}

const withVehicleCount = {
  _count: { select: { vehicles: { where: { deletedAt: null } } } },
} satisfies Prisma.VehicleTypeInclude;

export async function listVehicleTypes(filters: { q?: string } = {}): Promise<VehicleTypeDTO[]> {
  const where: Prisma.VehicleTypeWhereInput = { deletedAt: null };
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { code: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const vehicleTypes = await prisma.vehicleType.findMany({
    where,
    include: withVehicleCount,
    orderBy: { name: "asc" },
  });

  return vehicleTypes.map(toDTO);
}

export async function createVehicleType(
  input: VehicleTypeCreateInput,
  actor: ActorContext,
): Promise<VehicleTypeDTO> {
  try {
    const created = await prisma.vehicleType.create({
      data: { code: input.code ?? null, name: input.name, description: input.description ?? null },
      include: withVehicleCount,
    });

    const dto = toDTO(created);
    await logAudit({
      actorUserId: actor.userId,
      action: "vehicle_type.created",
      entityType: "VehicleType",
      entityId: created.id,
      afterJson: dto as unknown as Prisma.InputJsonValue,
    });

    return dto;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new DomainError("VEHICLE_TYPE_DUPLICATE", "این نام یا کد قبلاً استفاده شده است.", {
        name: "این نام یا کد قبلاً استفاده شده است.",
      });
    }
    throw error;
  }
}

export async function updateVehicleType(
  id: string,
  input: VehicleTypeUpdateInput,
  actor: ActorContext,
): Promise<VehicleTypeDTO> {
  const existing = await prisma.vehicleType.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    throw new DomainError("VEHICLE_TYPE_NOT_FOUND", "نوع خودرو یافت نشد.");
  }

  try {
    const updated = await prisma.vehicleType.update({
      where: { id },
      data: { name: input.name, description: input.description, isActive: input.isActive },
      include: withVehicleCount,
    });

    const afterDto = toDTO(updated);
    await logAudit({
      actorUserId: actor.userId,
      action: "vehicle_type.updated",
      entityType: "VehicleType",
      entityId: id,
      beforeJson: {
        name: existing.name,
        description: existing.description,
        isActive: existing.isActive,
      } as Prisma.InputJsonValue,
      afterJson: afterDto as unknown as Prisma.InputJsonValue,
    });

    return afterDto;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new DomainError("VEHICLE_TYPE_DUPLICATE", "این نام قبلاً استفاده شده است.", {
        name: "این نام قبلاً استفاده شده است.",
      });
    }
    throw error;
  }
}

export async function softDeleteVehicleType(id: string, actor: ActorContext): Promise<void> {
  const existing = await prisma.vehicleType.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    throw new DomainError("VEHICLE_TYPE_NOT_FOUND", "نوع خودرو یافت نشد.");
  }

  const usedCount = await prisma.vehicle.count({ where: { vehicleTypeId: id, deletedAt: null } });
  if (usedCount > 0) {
    throw new DomainError(
      "VEHICLE_TYPE_IN_USE",
      "این نوع خودرو برای خودروهای ثبت‌شده استفاده می‌شود و قابل حذف نیست؛ می‌توانید آن را غیرفعال کنید.",
    );
  }

  await prisma.vehicleType.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

  await logAudit({
    actorUserId: actor.userId,
    action: "vehicle_type.deleted",
    entityType: "VehicleType",
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
