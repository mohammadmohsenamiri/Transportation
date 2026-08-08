import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Phase 14 — خواندن ممیزی به‌صورت میان‌موجودیتی.
 *
 * فقط-خواندنی: هیچ تابعی برای ویرایش یا حذف رکورد ممیزی وجود ندارد و هیچ route ای هم ساخته
 * نمی‌شود (I-14). `AuditLog` یک لاگ افزودنی است.
 */

export interface AuditEntryDTO {
  id: string;
  actorUserId: string | null;
  actorUsername: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  ipAddress: string | null;
  occurredAt: string;
}

export interface AuditFilters {
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export async function listAuditEntries(
  filters: AuditFilters,
): Promise<{ items: AuditEntryDTO[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 50));

  const where: Prisma.AuditLogWhereInput = {
    ...(filters.actorUserId ? { actorUserId: filters.actorUserId } : {}),
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.entityId ? { entityId: filters.entityId } : {}),
    ...(filters.action ? { action: { contains: filters.action, mode: "insensitive" } } : {}),
    ...(filters.from || filters.to
      ? { occurredAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lt: filters.to } : {}) } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  // نام کاربری بازیگران در یک کوئری جدا خوانده می‌شود (نه join در حلقه) تا N+1 نسازد.
  const actorIds = [...new Set(rows.map((row) => row.actorUserId).filter((id): id is string => Boolean(id)))];
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, username: true } })
    : [];
  const usernameById = new Map(actors.map((actor) => [actor.id, actor.username]));

  return {
    items: rows.map((row) => ({
      id: row.id,
      actorUserId: row.actorUserId,
      actorUsername: row.actorUserId ? (usernameById.get(row.actorUserId) ?? null) : null,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      beforeJson: row.beforeJson,
      afterJson: row.afterJson,
      ipAddress: row.ipAddress,
      occurredAt: row.occurredAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

/** مقادیر متمایز `action` برای پرکردن فیلتر — از خود داده می‌آید، نه یک فهرست hardcode. */
export async function listAuditActions(): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } });
  return rows.map((row) => row.action);
}
