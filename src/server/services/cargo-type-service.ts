import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors/domain-error";
import { logAudit } from "@/server/services/audit-service";
import type { ActorContext } from "@/server/services/permission-service";
import type { Prisma } from "@/generated/prisma/client";
import type { CargoTypeCreateInput, CargoTypeUpdateInput } from "@/lib/validation/vehicle";

export interface CargoTypeDTO {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function toDTO(cargoType: {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CargoTypeDTO {
  return {
    id: cargoType.id,
    code: cargoType.code,
    name: cargoType.name,
    description: cargoType.description,
    isActive: cargoType.isActive,
    createdAt: cargoType.createdAt.toISOString(),
    updatedAt: cargoType.updatedAt.toISOString(),
  };
}

export async function listCargoTypes(filters: { q?: string } = {}): Promise<CargoTypeDTO[]> {
  const where: Prisma.CargoTypeWhereInput = { deletedAt: null };
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { code: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const cargoTypes = await prisma.cargoType.findMany({ where, orderBy: { name: "asc" } });
  return cargoTypes.map(toDTO);
}

export async function createCargoType(
  input: CargoTypeCreateInput,
  actor: ActorContext,
): Promise<CargoTypeDTO> {
  try {
    const created = await prisma.cargoType.create({
      data: { code: input.code ?? null, name: input.name, description: input.description ?? null },
    });

    const dto = toDTO(created);
    await logAudit({
      actorUserId: actor.userId,
      action: "cargo_type.created",
      entityType: "CargoType",
      entityId: created.id,
      afterJson: dto as unknown as Prisma.InputJsonValue,
    });

    return dto;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new DomainError("CARGO_TYPE_DUPLICATE", "این نام یا کد قبلاً استفاده شده است.", {
        name: "این نام یا کد قبلاً استفاده شده است.",
      });
    }
    throw error;
  }
}

export async function updateCargoType(
  id: string,
  input: CargoTypeUpdateInput,
  actor: ActorContext,
): Promise<CargoTypeDTO> {
  const existing = await prisma.cargoType.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    throw new DomainError("CARGO_TYPE_NOT_FOUND", "نوع بار یافت نشد.");
  }

  try {
    const updated = await prisma.cargoType.update({
      where: { id },
      data: { name: input.name, description: input.description, isActive: input.isActive },
    });

    const afterDto = toDTO(updated);
    await logAudit({
      actorUserId: actor.userId,
      action: "cargo_type.updated",
      entityType: "CargoType",
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
      throw new DomainError("CARGO_TYPE_DUPLICATE", "این نام قبلاً استفاده شده است.", {
        name: "این نام قبلاً استفاده شده است.",
      });
    }
    throw error;
  }
}

export async function softDeleteCargoType(id: string, actor: ActorContext): Promise<void> {
  const existing = await prisma.cargoType.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    throw new DomainError("CARGO_TYPE_NOT_FOUND", "نوع بار یافت نشد.");
  }

  await prisma.cargoType.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

  await logAudit({
    actorUserId: actor.userId,
    action: "cargo_type.deleted",
    entityType: "CargoType",
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
