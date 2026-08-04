import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface AuditEntry {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadataJson?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadataJson: entry.metadataJson,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    },
  });
}
