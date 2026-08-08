import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import type { IconCategory, Prisma } from "@/generated/prisma/client";
import { DomainError } from "@/lib/errors/domain-error";
import { logAudit } from "@/server/services/audit-service";
import type { ActorContext } from "@/server/services/permission-service";
import { extensionForMime, validateIconFile, validateIconName } from "@/lib/domain/icon-rules";
import { deleteIconFile, readIconFile, sha256Hex, writeIconFile } from "@/server/services/icon-storage";

/** Phase 14 — کتابخانه آیکن: آپلود، جایگزینی، حذف نرم و تخصیص. */

export interface IconAssetDTO {
  id: string;
  name: string;
  category: IconCategory;
  mimeType: string;
  sha256: string;
  width: number | null;
  height: number | null;
  fileSize: number;
  originalFilename: string | null;
  isActive: boolean;
  deletedAt: string | null;
  contentUrl: string;
  usageCount: number;
  uploadedById: string | null;
  createdAt: string;
  version: number;
}

type IconRow = Prisma.IconAssetGetPayload<{
  include: { _count: { select: { organizationUnits: true; vehicleTypes: true; vehicles: true } } };
}>;

const ICON_INCLUDE = {
  _count: { select: { organizationUnits: true, vehicleTypes: true, vehicles: true } },
} satisfies Prisma.IconAssetInclude;

function toDTO(row: IconRow): IconAssetDTO {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    mimeType: row.mimeType,
    sha256: row.sha256,
    width: row.width,
    height: row.height,
    fileSize: row.fileSize,
    originalFilename: row.originalFilename,
    isActive: row.isActive,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    contentUrl: `/api/v1/icons/${row.id}/content`,
    usageCount: row._count.organizationUnits + row._count.vehicleTypes + row._count.vehicles,
    uploadedById: row.uploadedById,
    createdAt: row.createdAt.toISOString(),
    version: row.version,
  };
}

async function assertNameAvailable(name: string, exceptId?: string): Promise<void> {
  // یکتایی فقط میان آیکن‌های حذف‌نشده — به همین دلیل ایندکس یکتای ساده روی ستون گذاشته نشده.
  const clash = await prisma.iconAsset.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, deletedAt: null, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
  });
  if (clash) {
    throw new DomainError("ICON_NAME_TAKEN", "آیکنی با این نام از قبل وجود دارد.", { name: "این نام در دسترس نیست." });
  }
}

export interface UploadIconInput {
  filename: string;
  declaredMimeType: string;
  size: number;
  bytes: Uint8Array;
  name: string;
  category: IconCategory;
}

/**
 * ترتیب اینجا عمدی است: اعتبارسنجی کامل ← نوشتن فایل ← ساخت رکورد ← جبران در صورت خطا.
 * ترتیب معکوس (اول رکورد) رکوردی می‌ساخت که به فایلی اشاره می‌کند که شاید هرگز نرسد.
 */
export async function uploadIcon(input: UploadIconInput, actor: ActorContext): Promise<IconAssetDTO> {
  const name = validateIconName(input.name);
  const validated = validateIconFile(
    { filename: input.filename, declaredMimeType: input.declaredMimeType, size: input.size },
    input.bytes,
  );
  await assertNameAvailable(name);

  const id = randomUUID();
  const storagePath = `${id}${extensionForMime(validated.mimeType)}`;
  const sha256 = sha256Hex(input.bytes);

  await writeIconFile(storagePath, input.bytes);

  try {
    const row = await prisma.iconAsset.create({
      data: {
        id,
        name,
        category: input.category,
        mimeType: validated.mimeType,
        storagePath,
        sha256,
        width: validated.width,
        height: validated.height,
        fileSize: input.bytes.length,
        originalFilename: input.filename.slice(0, 255),
        uploadedById: actor.userId,
      },
      include: ICON_INCLUDE,
    });

    await logAudit({
      actorUserId: actor.userId,
      action: "icon.uploaded",
      entityType: "IconAsset",
      entityId: id,
      afterJson: { name, category: input.category, mimeType: validated.mimeType, sha256, fileSize: input.bytes.length },
    });
    return toDTO(row);
  } catch (error) {
    // فایل یتیم را همان‌جا پاک می‌کنیم؛ اگر آن هم شکست بخورد فقط ثبت می‌شود — بایت‌های بی‌ارجاع
    // بی‌اثرند چون هیچ رکوردی به آن‌ها اشاره نمی‌کند.
    await deleteIconFile(storagePath).catch(() =>
      console.error(`[icons] فایل یتیم باقی ماند: ${storagePath}`),
    );
    throw error;
  }
}

export async function replaceIconFile(
  id: string,
  input: Omit<UploadIconInput, "name" | "category"> & { version: number },
  actor: ActorContext,
): Promise<IconAssetDTO> {
  const existing = await prisma.iconAsset.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new DomainError("ICON_NOT_FOUND", "آیکن یافت نشد.");

  const validated = validateIconFile(
    { filename: input.filename, declaredMimeType: input.declaredMimeType, size: input.size },
    input.bytes,
  );

  const newStoragePath = `${id}${extensionForMime(validated.mimeType)}`;
  const sha256 = sha256Hex(input.bytes);
  await writeIconFile(newStoragePath, input.bytes);

  const updated = await prisma.iconAsset.updateMany({
    where: { id, version: input.version, deletedAt: null },
    data: {
      mimeType: validated.mimeType,
      storagePath: newStoragePath,
      sha256,
      width: validated.width,
      height: validated.height,
      fileSize: input.bytes.length,
      originalFilename: input.filename.slice(0, 255),
      version: { increment: 1 },
    },
  });
  if (updated.count === 0) {
    throw new DomainError("ICON_VERSION_CONFLICT", "این آیکن توسط کاربر دیگری تغییر کرده است.");
  }

  // اگر پسوند عوض شده باشد فایل قدیمی دیگر ارجاعی ندارد.
  if (existing.storagePath !== newStoragePath) {
    await deleteIconFile(existing.storagePath).catch(() => undefined);
  }

  await logAudit({
    actorUserId: actor.userId,
    action: "icon.replaced",
    entityType: "IconAsset",
    entityId: id,
    beforeJson: { sha256: existing.sha256, fileSize: existing.fileSize },
    afterJson: { sha256, fileSize: input.bytes.length },
  });

  return toDTO(await prisma.iconAsset.findFirstOrThrow({ where: { id }, include: ICON_INCLUDE }));
}

export async function listIcons(filters: {
  category?: IconCategory;
  q?: string;
  includeDeleted?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ items: IconAssetDTO[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));

  const where: Prisma.IconAssetWhereInput = {
    ...(filters.includeDeleted ? {} : { deletedAt: null }),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.q ? { name: { contains: filters.q, mode: "insensitive" } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.iconAsset.findMany({
      where,
      include: ICON_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.iconAsset.count({ where }),
  ]);

  return { items: rows.map(toDTO), total, page, pageSize };
}

export async function getIconBytes(
  id: string,
): Promise<{ bytes: Buffer; mimeType: string; sha256: string } | null> {
  const row = await prisma.iconAsset.findFirst({ where: { id, deletedAt: null } });
  if (!row) return null;
  const bytes = await readIconFile(row.storagePath);
  if (!bytes) {
    console.error(`[icons] رکورد موجود ولی فایل غایب: ${row.storagePath}`);
    return null;
  }
  return { bytes, mimeType: row.mimeType, sha256: row.sha256 };
}

export async function setIconDeleted(
  id: string,
  deleted: boolean,
  version: number,
  actor: ActorContext,
): Promise<IconAssetDTO> {
  const updated = await prisma.iconAsset.updateMany({
    where: { id, version },
    data: { deletedAt: deleted ? new Date() : null, version: { increment: 1 } },
  });
  if (updated.count === 0) {
    const exists = await prisma.iconAsset.findUnique({ where: { id } });
    if (!exists) throw new DomainError("ICON_NOT_FOUND", "آیکن یافت نشد.");
    throw new DomainError("ICON_VERSION_CONFLICT", "این آیکن توسط کاربر دیگری تغییر کرده است.");
  }

  // تخصیص‌ها عمداً پاک نمی‌شوند: تعیین آیکن به‌طور خودکار به پیش‌فرض می‌افتد و بازگردانی،
  // تخصیص‌ها را دوباره برقرار می‌کند.
  await logAudit({
    actorUserId: actor.userId,
    action: deleted ? "icon.deleted" : "icon.restored",
    entityType: "IconAsset",
    entityId: id,
  });

  return toDTO(await prisma.iconAsset.findFirstOrThrow({ where: { id }, include: ICON_INCLUDE }));
}

// ---------------------------------------------------------------------------
// تخصیص
// ---------------------------------------------------------------------------

export type AssignmentTarget = "ORGANIZATION_UNIT" | "VEHICLE_TYPE" | "VEHICLE";

export async function assignIcon(
  input: { targetType: AssignmentTarget; targetId: string; iconAssetId: string | null },
  actor: ActorContext,
): Promise<void> {
  if (input.iconAssetId) {
    const icon = await prisma.iconAsset.findFirst({ where: { id: input.iconAssetId, deletedAt: null } });
    if (!icon) throw new DomainError("ICON_NOT_FOUND", "آیکن یافت نشد.");
  }

  const data = { iconAssetId: input.iconAssetId };
  let affected = 0;

  if (input.targetType === "ORGANIZATION_UNIT") {
    affected = (await prisma.organizationUnit.updateMany({ where: { id: input.targetId, deletedAt: null }, data })).count;
  } else if (input.targetType === "VEHICLE_TYPE") {
    affected = (await prisma.vehicleType.updateMany({ where: { id: input.targetId, deletedAt: null }, data })).count;
  } else {
    affected = (await prisma.vehicle.updateMany({ where: { id: input.targetId, deletedAt: null }, data })).count;
  }

  if (affected === 0) {
    throw new DomainError("ASSIGNMENT_TARGET_NOT_FOUND", "موجودیت مقصد یافت نشد.");
  }

  await logAudit({
    actorUserId: actor.userId,
    action: input.iconAssetId ? "icon.assigned" : "icon.unassigned",
    entityType: input.targetType,
    entityId: input.targetId,
    afterJson: { iconAssetId: input.iconAssetId },
  });
}

/** شناسه آیکن‌های قابل استفاده — ورودی تابع محض `resolveIcon`. */
export async function usableIconIds(): Promise<Set<string>> {
  const rows = await prisma.iconAsset.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true },
  });
  return new Set(rows.map((row) => row.id));
}
