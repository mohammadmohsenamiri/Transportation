import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors/domain-error";
import { logAudit } from "@/server/services/audit-service";
import type { ActorContext } from "@/server/services/permission-service";
import { RoleCode } from "@/lib/permissions/roles";
import { validateNoteBody } from "@/lib/domain/mission-lifecycle";

/**
 * Phase 15 — رشته یادداشت‌های زمان‌دار و دارای نویسنده.
 *
 * یادداشت‌ها **از همروندی خوش‌بینانه معافند** (CC-04) و `Mission.version` را جابه‌جا نمی‌کنند:
 * append-only هستند و دو نفر که هم‌زمان یادداشت می‌نویسند، هیچ‌کدام نوشته دیگری را از دست
 * نمی‌دهند. اجبارِ توکن نسخه اینجا فقط بی‌دلیل کاربر را به تعارض می‌انداخت.
 *
 * `Mission.notes` قدیمی **جذب نمی‌شود** (ADR-P15-09): آن یادداشت اولیه برنامه‌ریز است بدون
 * نویسنده و زمان، و ساختن این دو برایش یعنی جعل داده ممیزی.
 */

export interface MissionNoteDTO {
  id: string;
  missionId: string;
  body: string;
  createdById: string;
  createdByUsername: string;
  createdAt: string;
  /** نویسنده یا مدیر — به‌ازای هر درخواست‌کننده محاسبه می‌شود، نه ذخیره. */
  canDelete: boolean;
}

export async function listMissionNotes(missionId: string, actor: ActorContext): Promise<MissionNoteDTO[]> {
  const rows = await prisma.missionNote.findMany({
    where: { missionId, deletedAt: null },
    include: { createdBy: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });

  const isAdmin = actor.roles.includes(RoleCode.ADMIN);
  return rows.map((row) => ({
    id: row.id,
    missionId: row.missionId,
    body: row.body,
    createdById: row.createdById,
    createdByUsername: row.createdBy.username,
    createdAt: row.createdAt.toISOString(),
    canDelete: isAdmin || row.createdById === actor.userId,
  }));
}

/** FR-08/E10 — یادداشت در هر وضعیتی مجاز است، حتی روی مأموریت بایگانی‌شده. */
export async function addMissionNote(missionId: string, rawBody: string, actor: ActorContext): Promise<MissionNoteDTO> {
  const mission = await prisma.mission.findFirst({ where: { id: missionId, deletedAt: null }, select: { id: true } });
  if (!mission) throw new DomainError("MISSION_NOT_FOUND", "مأموریت یافت نشد.");

  const body = validateNoteBody(rawBody);

  const created = await prisma.missionNote.create({
    data: { missionId, body, createdById: actor.userId },
    include: { createdBy: { select: { username: true } } },
  });

  await logAudit({
    actorUserId: actor.userId,
    action: "mission.note.added",
    entityType: "Mission",
    entityId: missionId,
    afterJson: { noteId: created.id },
  });

  return {
    id: created.id,
    missionId,
    body: created.body,
    createdById: created.createdById,
    createdByUsername: created.createdBy.username,
    createdAt: created.createdAt.toISOString(),
    canDelete: true,
  };
}

/** حذف نرم؛ فقط نویسنده یا مدیر. مجوز اینجا در لایه سرویس اجرا می‌شود، نه در UI. */
export async function deleteMissionNote(missionId: string, noteId: string, actor: ActorContext): Promise<void> {
  const note = await prisma.missionNote.findFirst({ where: { id: noteId, missionId, deletedAt: null } });
  if (!note) throw new DomainError("MISSION_NOTE_NOT_FOUND", "یادداشت یافت نشد.");

  const isAdmin = actor.roles.includes(RoleCode.ADMIN);
  if (!isAdmin && note.createdById !== actor.userId) {
    throw new DomainError("FORBIDDEN", "فقط نویسنده یادداشت یا مدیر سامانه می‌تواند آن را حذف کند.");
  }

  await prisma.missionNote.update({ where: { id: noteId }, data: { deletedAt: new Date() } });
  await logAudit({
    actorUserId: actor.userId,
    action: "mission.note.deleted",
    entityType: "Mission",
    entityId: missionId,
    beforeJson: { noteId },
  });
}
