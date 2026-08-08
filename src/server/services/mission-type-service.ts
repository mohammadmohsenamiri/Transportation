import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors/domain-error";
import { logAudit } from "@/server/services/audit-service";
import type { ActorContext } from "@/server/services/permission-service";
import type { Prisma } from "@/generated/prisma/client";
import type { MissionTypeCreateInput, MissionTypeUpdateInput } from "@/lib/validation/mission-lifecycle";

/**
 * Phase 15 — نوع مأموریت به‌عنوان داده مرجع (ADR-P15-08).
 *
 * الگو عمداً کپی دقیق `cargo-type-service` است: همان شکل DTO، همان قاعده یکتایی نام، همان
 * محافظ حذف. هیچ enum سخت‌کدشده‌ای در منطق کسب‌وکار ساخته نمی‌شود (`CLAUDE.md` §۵).
 */

export interface MissionTypeDTO {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  /** بیش از صفر یعنی حذف مجاز نیست — همان قاعده نوع خودرو و نوع بار. */
  missionCount: number;
  createdAt: string;
  updatedAt: string;
}

const TYPE_INCLUDE = {
  _count: { select: { missions: { where: { deletedAt: null } } } },
} satisfies Prisma.MissionTypeInclude;

type MissionTypeRow = Prisma.MissionTypeGetPayload<{ include: typeof TYPE_INCLUDE }>;

function toDTO(row: MissionTypeRow): MissionTypeDTO {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    missionCount: row._count.missions,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

export async function listMissionTypes(filters: { q?: string; activeOnly?: boolean } = {}): Promise<MissionTypeDTO[]> {
  const where: Prisma.MissionTypeWhereInput = { deletedAt: null };
  if (filters.activeOnly) where.isActive = true;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { code: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.missionType.findMany({ where, include: TYPE_INCLUDE, orderBy: { name: "asc" } });
  return rows.map(toDTO);
}

export async function createMissionType(input: MissionTypeCreateInput, actor: ActorContext): Promise<MissionTypeDTO> {
  try {
    const created = await prisma.missionType.create({
      data: {
        code: input.code ?? null,
        name: input.name,
        description: input.description ?? null,
        isActive: input.isActive ?? true,
      },
      include: TYPE_INCLUDE,
    });

    const dto = toDTO(created);
    await logAudit({
      actorUserId: actor.userId,
      action: "mission_type.created",
      entityType: "MissionType",
      entityId: created.id,
      afterJson: dto as unknown as Prisma.InputJsonValue,
    });
    return dto;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DomainError("MISSION_TYPE_NAME_TAKEN", "نوع مأموریتی با این نام یا کد از قبل وجود دارد.", {
        name: "این نام در دسترس نیست.",
      });
    }
    throw error;
  }
}

export async function updateMissionType(
  id: string,
  input: MissionTypeUpdateInput,
  actor: ActorContext,
): Promise<MissionTypeDTO> {
  const existing = await prisma.missionType.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new DomainError("MISSION_TYPE_NOT_FOUND", "نوع مأموریت یافت نشد.");

  try {
    const updated = await prisma.missionType.update({
      where: { id },
      data: {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: TYPE_INCLUDE,
    });

    const dto = toDTO(updated);
    await logAudit({
      actorUserId: actor.userId,
      action: "mission_type.updated",
      entityType: "MissionType",
      entityId: id,
      afterJson: dto as unknown as Prisma.InputJsonValue,
    });
    return dto;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DomainError("MISSION_TYPE_NAME_TAKEN", "نوع مأموریتی با این نام یا کد از قبل وجود دارد.", {
        name: "این نام در دسترس نیست.",
      });
    }
    throw error;
  }
}

/** حذف نرم؛ نوعی که مأموریتی از آن استفاده می‌کند حذف نمی‌شود — همان قاعده نوع خودرو/بار. */
export async function deleteMissionType(id: string, actor: ActorContext): Promise<void> {
  const existing = await prisma.missionType.findFirst({ where: { id, deletedAt: null }, include: TYPE_INCLUDE });
  if (!existing) throw new DomainError("MISSION_TYPE_NOT_FOUND", "نوع مأموریت یافت نشد.");

  if (existing._count.missions > 0) {
    throw new DomainError(
      "MISSION_TYPE_IN_USE",
      `این نوع مأموریت توسط ${existing._count.missions.toLocaleString("fa-IR")} مأموریت استفاده می‌شود و قابل حذف نیست.`,
    );
  }

  await prisma.missionType.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  await logAudit({
    actorUserId: actor.userId,
    action: "mission_type.deleted",
    entityType: "MissionType",
    entityId: id,
    beforeJson: toDTO(existing) as unknown as Prisma.InputJsonValue,
  });
}

/** V-09 — تأیید اینکه شناسه به یک نوع موجود، حذف‌نشده و فعال اشاره می‌کند. */
export async function assertMissionTypeUsable(missionTypeId: string): Promise<void> {
  const found = await prisma.missionType.findFirst({ where: { id: missionTypeId, deletedAt: null, isActive: true } });
  if (!found) {
    throw new DomainError("MISSION_TYPE_NOT_FOUND", "نوع مأموریت انتخاب‌شده معتبر نیست.", {
      missionTypeId: "نوع مأموریت انتخاب‌شده معتبر نیست.",
    });
  }
}
