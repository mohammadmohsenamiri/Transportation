import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors/domain-error";
import { isValidParentLevel } from "@/lib/domain/organization-rules";
import { logAudit } from "@/server/services/audit-service";
import type { ActorContext } from "@/server/services/permission-service";
import type { OrganizationLevel, Prisma } from "@/generated/prisma/client";
import type {
  OrganizationUnitCreateInput,
  OrganizationUnitUpdateInput,
} from "@/lib/validation/organization";

export interface OrganizationUnitDTO {
  id: string;
  code: string;
  name: string;
  level: OrganizationLevel;
  parentId: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  childCount: number;
}

type UnitWithCount = Prisma.OrganizationUnitGetPayload<{
  include: { _count: { select: { children: { where: { deletedAt: null } } } } };
}>;

function toDTO(unit: UnitWithCount): OrganizationUnitDTO {
  return {
    id: unit.id,
    code: unit.code,
    name: unit.name,
    level: unit.level,
    parentId: unit.parentId,
    latitude: unit.latitude === null ? null : Number(unit.latitude),
    longitude: unit.longitude === null ? null : Number(unit.longitude),
    address: unit.address,
    isActive: unit.isActive,
    createdAt: unit.createdAt.toISOString(),
    updatedAt: unit.updatedAt.toISOString(),
    childCount: unit._count.children,
  };
}

const withChildCount = {
  _count: { select: { children: { where: { deletedAt: null } } } },
} satisfies Prisma.OrganizationUnitInclude;

export async function listOrganizationUnits(filters: {
  level?: OrganizationLevel;
  parentId?: string | null;
  q?: string;
}): Promise<OrganizationUnitDTO[]> {
  const where: Prisma.OrganizationUnitWhereInput = { deletedAt: null };
  if (filters.level) where.level = filters.level;
  if (filters.parentId !== undefined) where.parentId = filters.parentId;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { code: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const units = await prisma.organizationUnit.findMany({
    where,
    include: withChildCount,
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });

  return units.map(toDTO);
}

export async function getOrganizationTree(): Promise<OrganizationUnitDTO[]> {
  return listOrganizationUnits({});
}

export async function getOrganizationUnitById(id: string): Promise<OrganizationUnitDTO | null> {
  const unit = await prisma.organizationUnit.findFirst({
    where: { id, deletedAt: null },
    include: withChildCount,
  });
  return unit ? toDTO(unit) : null;
}

async function assertParentValid(
  level: OrganizationLevel,
  parentId: string | null,
): Promise<void> {
  if (parentId === null) {
    if (!isValidParentLevel(level, null)) {
      throw new DomainError(
        "ORGANIZATION_PARENT_REQUIRED",
        "برای این سطح، انتخاب والد الزامی است.",
        { parentId: "برای این سطح، انتخاب والد الزامی است." },
      );
    }
    return;
  }

  const parent = await prisma.organizationUnit.findFirst({
    where: { id: parentId, deletedAt: null },
  });

  if (!parent) {
    throw new DomainError("ORGANIZATION_PARENT_NOT_FOUND", "والد انتخاب‌شده یافت نشد.", {
      parentId: "والد انتخاب‌شده یافت نشد.",
    });
  }

  if (!isValidParentLevel(level, parent.level)) {
    throw new DomainError(
      "ORGANIZATION_INVALID_PARENT_LEVEL",
      "سطح والد با سطح انتخاب‌شده سازگار نیست.",
      { parentId: "سطح والد با سطح انتخاب‌شده سازگار نیست." },
    );
  }
}

async function assertNoCycle(nodeId: string, newParentId: string): Promise<void> {
  let currentId: string | null = newParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === nodeId) {
      throw new DomainError(
        "ORGANIZATION_CYCLE_DETECTED",
        "جابه‌جایی به این والد باعث ایجاد چرخه در ساختار سازمانی می‌شود.",
        { parentId: "جابه‌جایی به این والد باعث ایجاد چرخه می‌شود." },
      );
    }
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const current: { parentId: string | null } | null = await prisma.organizationUnit.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = current?.parentId ?? null;
  }
}

export async function createOrganizationUnit(
  input: OrganizationUnitCreateInput,
  actor: ActorContext,
): Promise<OrganizationUnitDTO> {
  await assertParentValid(input.level, input.parentId);

  try {
    const created = await prisma.organizationUnit.create({
      data: {
        code: input.code,
        name: input.name,
        level: input.level,
        parentId: input.parentId,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        address: input.address ?? null,
        createdById: actor.userId,
        updatedById: actor.userId,
      },
      include: withChildCount,
    });

    const dto = toDTO(created);

    await logAudit({
      actorUserId: actor.userId,
      action: "organization_unit.created",
      entityType: "OrganizationUnit",
      entityId: created.id,
      afterJson: dto as unknown as Prisma.InputJsonValue,
    });

    return dto;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new DomainError("ORGANIZATION_CODE_DUPLICATE", "این کد قبلاً استفاده شده است.", {
        code: "این کد قبلاً استفاده شده است.",
      });
    }
    throw error;
  }
}

export async function updateOrganizationUnit(
  id: string,
  input: OrganizationUnitUpdateInput,
  actor: ActorContext,
): Promise<OrganizationUnitDTO> {
  const existing = await prisma.organizationUnit.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    throw new DomainError("ORGANIZATION_NOT_FOUND", "گره سازمانی یافت نشد.");
  }

  if (input.parentId !== undefined && input.parentId !== existing.parentId) {
    if (input.parentId === null) {
      await assertParentValid(existing.level, null);
    } else {
      await assertParentValid(existing.level, input.parentId);
      await assertNoCycle(id, input.parentId);
    }
  }

  try {
    const updated = await prisma.organizationUnit.update({
      where: { id },
      data: {
        name: input.name,
        parentId: input.parentId,
        latitude: input.latitude,
        longitude: input.longitude,
        address: input.address,
        isActive: input.isActive,
        updatedById: actor.userId,
      },
      include: withChildCount,
    });

    const beforeSnapshot = {
      name: existing.name,
      parentId: existing.parentId,
      latitude: existing.latitude === null ? null : Number(existing.latitude),
      longitude: existing.longitude === null ? null : Number(existing.longitude),
      address: existing.address,
      isActive: existing.isActive,
    };
    const afterDto = toDTO(updated);

    await logAudit({
      actorUserId: actor.userId,
      action: "organization_unit.updated",
      entityType: "OrganizationUnit",
      entityId: id,
      beforeJson: beforeSnapshot as Prisma.InputJsonValue,
      afterJson: afterDto as unknown as Prisma.InputJsonValue,
    });

    return afterDto;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new DomainError("ORGANIZATION_CODE_DUPLICATE", "این کد قبلاً استفاده شده است.", {
        code: "این کد قبلاً استفاده شده است.",
      });
    }
    throw error;
  }
}

export async function softDeleteOrganizationUnit(id: string, actor: ActorContext): Promise<void> {
  const existing = await prisma.organizationUnit.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    throw new DomainError("ORGANIZATION_NOT_FOUND", "گره سازمانی یافت نشد.");
  }

  const activeChildCount = await prisma.organizationUnit.count({
    where: { parentId: id, deletedAt: null },
  });

  if (activeChildCount > 0) {
    throw new DomainError(
      "ORGANIZATION_HAS_CHILDREN",
      "این گره دارای زیرمجموعه است و قابل حذف نیست؛ ابتدا زیرمجموعه‌ها را جابه‌جا یا حذف کنید.",
    );
  }

  await prisma.organizationUnit.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false, updatedById: actor.userId },
  });

  await logAudit({
    actorUserId: actor.userId,
    action: "organization_unit.deleted",
    entityType: "OrganizationUnit",
    entityId: id,
  });
}

export async function getOrganizationUnitHistory(id: string) {
  return prisma.auditLog.findMany({
    where: { entityType: "OrganizationUnit", entityId: id },
    orderBy: { occurredAt: "desc" },
    take: 50,
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
