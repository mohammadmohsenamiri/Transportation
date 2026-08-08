import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors/domain-error";
import { logAudit } from "@/server/services/audit-service";
import type { ActorContext } from "@/server/services/permission-service";
import type { Prisma, MissionPersistedStatus, MissionFailureClassification } from "@/generated/prisma/client";
import { estimateMission } from "@/lib/domain/mission-estimate";
import {
  areShipmentsCompatible,
  deriveMissionDisplayStatus,
  isMissionOperationallyLocked,
  missionTimeRangesOverlap,
  type MissionDisplayStatus,
} from "@/lib/domain/mission-rules";
import {
  arrivalVarianceMinutes,
  assertTransitionAllowed,
  resolveTargetStatus,
  validateCompletionTimes,
  validateFailureInput,
  validateReopenReason,
} from "@/lib/domain/mission-lifecycle";
import type { MissionCreateInput, MissionUpdateInput } from "@/lib/validation/mission";

type TxClient = Prisma.TransactionClient;

export interface MissionShipmentSummary {
  id: string;
  trackingCode: string;
  title: string;
  cargoTypeName: string;
}

export interface MissionDTO {
  id: string;
  code: string;
  vehicleId: string;
  vehicleIdentifier: string;
  originWarehouseId: string;
  originTitle: string;
  originLatitude: number;
  originLongitude: number;
  destinationOrganizationUnitId: string | null;
  destinationTitle: string;
  destinationLatitude: number;
  destinationLongitude: number;
  startAt: string;
  routeId: string | null;
  routeVersion: number | null;
  speedSnapshotKmh: number;
  distanceMeters: number;
  estimatedDurationSeconds: number;
  estimatedArrivalAt: string;
  persistedStatus: MissionPersistedStatus;
  displayStatus: MissionDisplayStatus;
  notes: string | null;
  publishedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  duplicatedFromMissionId: string | null;
  shipments: MissionShipmentSummary[];
  createdAt: string;
  updatedAt: string;

  // — Phase 15 —
  /** ⚠️ توکن همروندی خوش‌بینانه؛ با `routeVersion` بالا اشتباه نشود. */
  version: number;
  actualDepartureAt: string | null;
  actualArrivalAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  failureClassification: MissionFailureClassification | null;
  archivedAt: string | null;
  statusBeforeArchive: MissionPersistedStatus | null;
  reopenCount: number;
  lastReopenedAt: string | null;
  missionType: { id: string; name: string } | null;
  noteCount: number;
  /** دقیقه اختلاف رسیدن واقعی از تخمین؛ مثبت = دیرکرد. روی هر خواندن محاسبه می‌شود، هرگز ذخیره نمی‌شود. */
  arrivalVarianceMinutes: number | null;
}

const MISSION_INCLUDE = {
  vehicle: true,
  shipments: {
    include: { shipment: { include: { cargoType: true } } },
  },
  missionType: true,
  _count: { select: { missionNotes: { where: { deletedAt: null } } } },
} satisfies Prisma.MissionInclude;

type MissionWithRelations = Prisma.MissionGetPayload<{ include: typeof MISSION_INCLUDE }>;

function toDTO(mission: MissionWithRelations): MissionDTO {
  return {
    id: mission.id,
    code: mission.code,
    vehicleId: mission.vehicleId,
    vehicleIdentifier: mission.vehicle.identifier,
    originWarehouseId: mission.originWarehouseId,
    originTitle: mission.originTitle,
    originLatitude: Number(mission.originLatitude),
    originLongitude: Number(mission.originLongitude),
    destinationOrganizationUnitId: mission.destinationOrganizationUnitId,
    destinationTitle: mission.destinationTitle,
    destinationLatitude: Number(mission.destinationLatitude),
    destinationLongitude: Number(mission.destinationLongitude),
    startAt: mission.startAt.toISOString(),
    routeId: mission.routeId,
    routeVersion: mission.routeVersion,
    speedSnapshotKmh: Number(mission.speedSnapshotKmh),
    distanceMeters: Number(mission.distanceMeters),
    estimatedDurationSeconds: mission.estimatedDurationSeconds,
    estimatedArrivalAt: mission.estimatedArrivalAt.toISOString(),
    persistedStatus: mission.persistedStatus,
    displayStatus: deriveMissionDisplayStatus(
      { persistedStatus: mission.persistedStatus, startAt: mission.startAt, estimatedArrivalAt: mission.estimatedArrivalAt },
      new Date(),
    ),
    notes: mission.notes,
    publishedAt: mission.publishedAt?.toISOString() ?? null,
    cancelledAt: mission.cancelledAt?.toISOString() ?? null,
    cancellationReason: mission.cancellationReason,
    duplicatedFromMissionId: mission.duplicatedFromMissionId,
    shipments: mission.shipments
      .filter((link) => link.isActiveAssignment || mission.persistedStatus === "DRAFT")
      .map((link) => ({
        id: link.shipment.id,
        trackingCode: link.shipment.trackingCode,
        title: link.shipment.title,
        cargoTypeName: link.shipment.cargoType.name,
      })),
    createdAt: mission.createdAt.toISOString(),
    updatedAt: mission.updatedAt.toISOString(),

    version: mission.version,
    actualDepartureAt: mission.actualDepartureAt?.toISOString() ?? null,
    actualArrivalAt: mission.actualArrivalAt?.toISOString() ?? null,
    failedAt: mission.failedAt?.toISOString() ?? null,
    failureReason: mission.failureReason,
    failureClassification: mission.failureClassification,
    archivedAt: mission.archivedAt?.toISOString() ?? null,
    statusBeforeArchive: mission.statusBeforeArchive,
    reopenCount: mission.reopenCount,
    lastReopenedAt: mission.lastReopenedAt?.toISOString() ?? null,
    missionType: mission.missionType ? { id: mission.missionType.id, name: mission.missionType.name } : null,
    noteCount: mission._count.missionNotes,
    arrivalVarianceMinutes: arrivalVarianceMinutes({
      estimatedArrivalAt: mission.estimatedArrivalAt,
      actualArrivalAt: mission.actualArrivalAt,
    }),
  };
}

function generateMissionCode(): string {
  return `MS-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

/**
 * برخورد partial unique index دستی `MissionShipment_active_shipment_unique` (ADR-019) — چون در
 * schema.prisma تعریف نشده، Prisma آن را به‌عنوان یک نقض یکتایی عمومی postgres (P2002) گزارش
 * می‌کند؛ متن خطا هم برای اطمینان بررسی می‌شود.
 */
function isPostgresUniqueViolation(error: unknown): boolean {
  if (isUniqueConstraintError(error)) return true;
  const message = error instanceof Error ? error.message : "";
  return message.includes("MissionShipment_active_shipment_unique") || message.includes("23505");
}

interface ResolvedShipment {
  id: string;
  originWarehouseId: string;
  destinationOrganizationUnitId: string | null;
  destinationLatitude: number;
  destinationLongitude: number;
}

async function resolveShipments(shipmentIds: string[]): Promise<ResolvedShipment[]> {
  const shipments = await prisma.shipment.findMany({
    where: { id: { in: shipmentIds }, deletedAt: null, isActive: true },
  });

  if (shipments.length !== shipmentIds.length) {
    throw new DomainError("MISSION_SHIPMENT_NOT_FOUND", "یک یا چند مرسوله انتخاب‌شده یافت نشد.", {
      shipmentIds: "یک یا چند مرسوله انتخاب‌شده یافت نشد.",
    });
  }

  const resolved: ResolvedShipment[] = shipments.map((s) => ({
    id: s.id,
    originWarehouseId: s.originWarehouseId,
    destinationOrganizationUnitId: s.destinationOrganizationUnitId,
    destinationLatitude: Number(s.destinationLatitude),
    destinationLongitude: Number(s.destinationLongitude),
  }));

  if (!areShipmentsCompatible(resolved)) {
    throw new DomainError(
      "MISSION_SHIPMENTS_INCOMPATIBLE",
      "مرسوله‌های انتخاب‌شده باید مبدأ و مقصد یکسان داشته باشند.",
      { shipmentIds: "مرسوله‌های انتخاب‌شده باید مبدأ و مقصد یکسان داشته باشند." },
    );
  }

  return resolved;
}

async function resolveOrigin(originWarehouseId: string) {
  const unit = await prisma.organizationUnit.findFirst({ where: { id: originWarehouseId, deletedAt: null } });
  if (!unit) {
    throw new DomainError("MISSION_ORIGIN_NOT_FOUND", "انبار مبدأ یافت نشد.");
  }
  if (unit.latitude === null || unit.longitude === null) {
    throw new DomainError("MISSION_ORIGIN_NO_COORDINATES", "انبار مبدأ فاقد مختصات جغرافیایی است.");
  }
  return { id: unit.id, title: unit.name, latitude: Number(unit.latitude), longitude: Number(unit.longitude) };
}

async function resolveVehicle(vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
  if (!vehicle) {
    throw new DomainError("MISSION_VEHICLE_NOT_FOUND", "خودرو یافت نشد.", { vehicleId: "خودرو یافت نشد." });
  }
  return vehicle;
}

async function resolveRoute(routeId: string | null | undefined) {
  if (!routeId) return null;
  const route = await prisma.route.findFirst({ where: { id: routeId, deletedAt: null }, include: { points: true } });
  if (!route) {
    throw new DomainError("MISSION_ROUTE_NOT_FOUND", "مسیر یافت نشد.", { routeId: "مسیر یافت نشد." });
  }
  return route;
}

function assertValidStartAt(startAtIso: string): Date {
  const startAt = new Date(startAtIso);
  if (Number.isNaN(startAt.getTime())) {
    throw new DomainError("MISSION_INVALID_START_TIME", "زمان شروع نامعتبر است.", { startAt: "زمان شروع نامعتبر است." });
  }
  if (startAt.getTime() <= Date.now()) {
    throw new DomainError("MISSION_INVALID_START_TIME", "زمان شروع باید در آینده باشد.", {
      startAt: "زمان شروع باید در آینده باشد.",
    });
  }
  return startAt;
}

interface ResolvedOperationalInputs {
  shipmentIds: string[];
  vehicleId: string;
  vehicleSpeedKmh: number;
  origin: { id: string; title: string; latitude: number; longitude: number };
  destination: { organizationUnitId: string | null; title: string; latitude: number; longitude: number };
  startAt: Date;
  routeId: string | null;
  routeVersion: number | null;
  distanceMeters: number;
  estimatedDurationSeconds: number;
  estimatedArrivalAt: Date;
}

async function resolveOperationalInputs(args: {
  shipmentIds: string[];
  vehicleId: string;
  startAtIso: string;
  routeId: string | null | undefined;
}): Promise<ResolvedOperationalInputs> {
  const startAt = assertValidStartAt(args.startAtIso);
  const shipments = await resolveShipments(args.shipmentIds);
  const origin = await resolveOrigin(shipments[0].originWarehouseId);
  const firstShipment = shipments[0];

  let destination: ResolvedOperationalInputs["destination"];
  if (firstShipment.destinationOrganizationUnitId) {
    const unit = await prisma.organizationUnit.findFirst({ where: { id: firstShipment.destinationOrganizationUnitId } });
    destination = {
      organizationUnitId: firstShipment.destinationOrganizationUnitId,
      title: unit?.name ?? "",
      latitude: firstShipment.destinationLatitude,
      longitude: firstShipment.destinationLongitude,
    };
  } else {
    // عنوان مقصد آزاد از خود مرسوله (fetch کامل برای گرفتن destinationTitle که در ResolvedShipment نبود)
    const full = await prisma.shipment.findUniqueOrThrow({ where: { id: firstShipment.id } });
    destination = {
      organizationUnitId: null,
      title: full.destinationTitle,
      latitude: firstShipment.destinationLatitude,
      longitude: firstShipment.destinationLongitude,
    };
  }

  const vehicle = await resolveVehicle(args.vehicleId);
  const route = await resolveRoute(args.routeId);

  const routePoints = route
    ? route.points
        .slice()
        .sort((a, b) => a.sequence - b.sequence)
        .map((p) => ({ latitude: Number(p.latitude), longitude: Number(p.longitude) }))
    : undefined;

  const estimate = estimateMission({
    origin: { latitude: origin.latitude, longitude: origin.longitude },
    destination: { latitude: destination.latitude, longitude: destination.longitude },
    speedKmh: Number(vehicle.avgSpeedKmh),
    routePoints,
  });

  const estimatedArrivalAt = new Date(startAt.getTime() + estimate.durationSeconds * 1000);

  return {
    shipmentIds: args.shipmentIds,
    vehicleId: vehicle.id,
    vehicleSpeedKmh: Number(vehicle.avgSpeedKmh),
    origin,
    destination,
    startAt,
    routeId: route?.id ?? null,
    routeVersion: route?.version ?? null,
    distanceMeters: Math.round(estimate.distanceMeters),
    estimatedDurationSeconds: Math.round(estimate.durationSeconds),
    estimatedArrivalAt,
  };
}

function missionCreateData(resolved: ResolvedOperationalInputs, code: string, notes: string | null): Prisma.MissionUncheckedCreateInput {
  return {
    code,
    vehicleId: resolved.vehicleId,
    originWarehouseId: resolved.origin.id,
    originTitle: resolved.origin.title,
    originLatitude: resolved.origin.latitude,
    originLongitude: resolved.origin.longitude,
    destinationOrganizationUnitId: resolved.destination.organizationUnitId,
    destinationTitle: resolved.destination.title,
    destinationLatitude: resolved.destination.latitude,
    destinationLongitude: resolved.destination.longitude,
    startAt: resolved.startAt,
    routeId: resolved.routeId,
    routeVersion: resolved.routeVersion,
    speedSnapshotKmh: resolved.vehicleSpeedKmh,
    distanceMeters: BigInt(resolved.distanceMeters),
    estimatedDurationSeconds: resolved.estimatedDurationSeconds,
    estimatedArrivalAt: resolved.estimatedArrivalAt,
    notes,
  };
}

export async function createMissionDraft(input: MissionCreateInput, actor: ActorContext): Promise<MissionDTO> {
  const resolved = await resolveOperationalInputs({
    shipmentIds: input.shipmentIds,
    vehicleId: input.vehicleId,
    startAtIso: input.startAt,
    routeId: input.routeId,
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateMissionCode();
    try {
      const created = await prisma.mission.create({
        data: {
          ...missionCreateData(resolved, code, input.notes ?? null),
          createdById: actor.userId,
          updatedById: actor.userId,
          shipments: { create: resolved.shipmentIds.map((shipmentId) => ({ shipmentId, isActiveAssignment: false })) },
        },
        include: MISSION_INCLUDE,
      });

      const dto = toDTO(created);
      await logAudit({
        actorUserId: actor.userId,
        action: "mission.created",
        entityType: "Mission",
        entityId: created.id,
        afterJson: dto as unknown as Prisma.InputJsonValue,
      });
      return dto;
    } catch (error) {
      if (isUniqueConstraintError(error)) continue; // برخورد کد مأموریت تصادفی؛ تلاش دوباره
      throw error;
    }
  }

  throw new DomainError("MISSION_CODE_GENERATION_FAILED", "تولید کد مأموریت یکتا ناموفق بود؛ دوباره تلاش کنید.");
}

async function assertVehicleAvailability(
  tx: TxClient,
  vehicleId: string,
  startAt: Date,
  estimatedArrivalAt: Date,
  excludeMissionId: string | null,
): Promise<void> {
  const vehicle = await tx.vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
  if (!vehicle) {
    throw new DomainError("MISSION_VEHICLE_NOT_FOUND", "خودرو یافت نشد.");
  }
  if (vehicle.readiness !== "READY") {
    throw new DomainError("MISSION_VEHICLE_NOT_READY", "خودرو خارج از سرویس است و قابل انتشار نیست.", {
      vehicleId: "خودرو خارج از سرویس است.",
    });
  }

  const candidates = await tx.mission.findMany({
    where: {
      vehicleId,
      persistedStatus: "SCHEDULED",
      deletedAt: null,
      ...(excludeMissionId ? { id: { not: excludeMissionId } } : {}),
    },
    select: { startAt: true, estimatedArrivalAt: true },
  });

  const hasOverlap = candidates.some((m) =>
    missionTimeRangesOverlap({ startAt, estimatedArrivalAt }, { startAt: m.startAt, estimatedArrivalAt: m.estimatedArrivalAt }),
  );
  if (hasOverlap) {
    throw new DomainError("MISSION_VEHICLE_TIME_CONFLICT", "خودرو در بازه انتخاب‌شده مأموریت دیگری دارد.", {
      vehicleId: "خودرو در بازه انتخاب‌شده مأموریت دیگری دارد.",
    });
  }
}

/**
 * هسته تراکنشی commit (انتشار یا بازانتشار مأموریت SCHEDULED): بازبینی آمادگی خودرو، بررسی
 * تداخل زمانی، آزادسازی تخصیص‌های قبلی، قفل و تخصیص مرسوله‌های جدید (ADR-019)، به‌روزرسانی
 * وضعیت مرسوله‌ها و خود مأموریت — دقیقاً طبق ARCHITECTURE_AND_DATA_MODEL.md بخش ۸.
 */
/**
 * `expectedVersion` اختیاری است چون این تابع دو فراخوان با شرایط متفاوت دارد:
 * `publishMission` هیچ توکنی از کلاینت نمی‌گیرد (انتشار از روی خود مأموریت تصمیم می‌گیرد)، ولی
 * `updateMission` توکن دارد و باید مشروط به آن بنویسد (FR-10).
 */
async function commitMissionAssignment(
  missionId: string,
  resolved: ResolvedOperationalInputs,
  notes: string | null,
  expectedVersion?: number,
) {
  return prisma.$transaction(async (tx) => {
    if (expectedVersion !== undefined) {
      // خواندنِ قفل‌دار به‌جای نوشتن مشروط: مسیر پایین خودش نسخه را یک واحد بالا می‌برد و یک
      // نوشتن اضافه اینجا آن را دو واحد می‌کرد و CC-01 را می‌شکست. قفل `FOR UPDATE` تا commit
      // نگه داشته می‌شود، پس بین این بررسی و آن نوشتن کسی نمی‌تواند ردیف را عوض کند.
      const rows = await tx.$queryRaw<{ version: number }[]>`
        SELECT version FROM "Mission" WHERE id = ${missionId} AND "deletedAt" IS NULL FOR UPDATE
      `;
      if (rows.length === 0) throw new DomainError("MISSION_NOT_FOUND", "مأموریت یافت نشد.");
      if (rows[0].version !== expectedVersion) {
        throw new DomainError(
          "MISSION_VERSION_CONFLICT",
          "این مأموریت توسط کاربر دیگری تغییر کرده است. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.",
        );
      }
    }

    await assertVehicleAvailability(tx, resolved.vehicleId, resolved.startAt, resolved.estimatedArrivalAt, missionId);

    const previousActiveLinks = await tx.missionShipment.findMany({
      where: { missionId, isActiveAssignment: true },
      select: { shipmentId: true },
    });
    const previousActiveShipmentIds = previousActiveLinks.map((l) => l.shipmentId);

    await tx.missionShipment.updateMany({ where: { missionId, isActiveAssignment: true }, data: { isActiveAssignment: false } });

    for (const shipmentId of resolved.shipmentIds) {
      // ستون id از نوع TEXT است (نه uuid بومی postgres)؛ بدون cast مقایسه شود
      await tx.$queryRaw`SELECT id FROM "Shipment" WHERE id = ${shipmentId} FOR UPDATE`;
    }

    try {
      for (const shipmentId of resolved.shipmentIds) {
        await tx.missionShipment.upsert({
          where: { missionId_shipmentId: { missionId, shipmentId } },
          create: { missionId, shipmentId, isActiveAssignment: true },
          update: { isActiveAssignment: true },
        });
      }
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new DomainError("SHIPMENT_ALREADY_ASSIGNED", "یک یا چند مرسوله در حال حاضر به مأموریت فعال دیگری متصل هستند.", {
          shipmentIds: "یک یا چند مرسوله در حال حاضر به مأموریت فعال دیگری متصل هستند.",
        });
      }
      throw error;
    }

    await tx.shipment.updateMany({
      where: { id: { in: resolved.shipmentIds } },
      data: { status: "WAITING_FOR_DISPATCH" },
    });

    const releasedShipmentIds = previousActiveShipmentIds.filter((id) => !resolved.shipmentIds.includes(id));
    if (releasedShipmentIds.length > 0) {
      await tx.shipment.updateMany({ where: { id: { in: releasedShipmentIds } }, data: { status: "DRAFT" } });
    }

    const existing = await tx.mission.findUniqueOrThrow({ where: { id: missionId } });
    const updated = await tx.mission.update({
      where: { id: missionId },
      data: {
        ...missionCreateData(resolved, existing.code, notes),
        persistedStatus: "SCHEDULED",
        publishedAt: existing.publishedAt ?? new Date(),
        // CC-01 — *هر* عملیات تغییردهنده نسخه را یک واحد بالا می‌برد، نه فقط گذارهای فاز ۱۵.
        // بدون این، انتشار یا ویرایش می‌توانست مأموریت را عوض کند و توکن کهنه کلاینت همچنان
        // معتبر بماند.
        version: { increment: 1 },
      },
      include: MISSION_INCLUDE,
    });

    return updated;
  });
}

export async function publishMission(id: string, actor: ActorContext): Promise<MissionDTO> {
  const existing = await prisma.mission.findFirst({ where: { id, deletedAt: null }, include: { shipments: true } });
  if (!existing) {
    throw new DomainError("MISSION_NOT_FOUND", "مأموریت یافت نشد.");
  }
  if (existing.persistedStatus !== "DRAFT") {
    throw new DomainError("MISSION_NOT_DRAFT", "فقط مأموریت پیش‌نویس قابل انتشار است.");
  }

  const shipmentIds = existing.shipments.map((s) => s.shipmentId);
  const resolved = await resolveOperationalInputs({
    shipmentIds,
    vehicleId: existing.vehicleId,
    startAtIso: existing.startAt.toISOString(),
    routeId: existing.routeId,
  });

  const updated = await commitMissionAssignment(id, resolved, existing.notes);

  const dto = toDTO(updated);
  await logAudit({
    actorUserId: actor.userId,
    action: "mission.published",
    entityType: "Mission",
    entityId: id,
    afterJson: dto as unknown as Prisma.InputJsonValue,
  });
  return dto;
}

export async function updateMission(id: string, input: MissionUpdateInput, actor: ActorContext): Promise<MissionDTO> {
  const existing = await prisma.mission.findFirst({ where: { id, deletedAt: null }, include: { shipments: true } });
  if (!existing) {
    throw new DomainError("MISSION_NOT_FOUND", "مأموریت یافت نشد.");
  }
  if (existing.persistedStatus === "CANCELLED" || existing.persistedStatus === "ARCHIVED") {
    throw new DomainError("MISSION_NOT_EDITABLE", "مأموریت لغوشده یا بایگانی‌شده قابل ویرایش نیست.");
  }

  const touchesOperationalFields =
    input.shipmentIds !== undefined || input.vehicleId !== undefined || input.startAt !== undefined || "routeId" in input;

  const now = new Date();
  if (
    touchesOperationalFields &&
    isMissionOperationallyLocked(
      { persistedStatus: existing.persistedStatus, startAt: existing.startAt, estimatedArrivalAt: existing.estimatedArrivalAt },
      now,
    )
  ) {
    throw new DomainError(
      "MISSION_ALREADY_STARTED",
      "مأموریت شروع شده است؛ فقط توضیحات قابل ویرایش است. برای تغییر خودرو/مسیر/زمان، مأموریت را لغو و تکثیر کنید.",
    );
  }

  const notes = input.notes !== undefined ? input.notes : existing.notes;

  if (!touchesOperationalFields) {
    await prisma.$transaction(async (tx) => {
      await updateMissionGuarded(tx, id, input.version, { notes, updatedById: actor.userId });
    });
    const dto = await reloadMissionDTO(id);
    await logAudit({ actorUserId: actor.userId, action: "mission.updated", entityType: "Mission", entityId: id, afterJson: dto as unknown as Prisma.InputJsonValue });
    return dto;
  }

  const currentShipmentIds = existing.shipments.filter((s) => s.isActiveAssignment || existing.persistedStatus === "DRAFT").map((s) => s.shipmentId);
  const resolved = await resolveOperationalInputs({
    shipmentIds: input.shipmentIds ?? currentShipmentIds,
    vehicleId: input.vehicleId ?? existing.vehicleId,
    startAtIso: input.startAt ?? existing.startAt.toISOString(),
    routeId: "routeId" in input ? input.routeId : existing.routeId,
  });

  if (existing.persistedStatus === "SCHEDULED") {
    const updated = await commitMissionAssignment(id, resolved, notes ?? null, input.version);
    const dto = toDTO(updated);
    await logAudit({ actorUserId: actor.userId, action: "mission.updated", entityType: "Mission", entityId: id, afterJson: dto as unknown as Prisma.InputJsonValue });
    return dto;
  }

  // DRAFT: بدون قفل/بازبینی آمادگی — فقط جایگزینی ساده لینک‌های مرسوله و snapshot دوباره
  await prisma.$transaction(async (tx) => {
    // نوشتن مشروط به نسخه پیش از حذف لینک‌ها، تا یک توکن کهنه هیچ عوارض جانبی‌ای نگذارد.
    await updateMissionGuarded(tx, id, input.version, {
      ...missionCreateData(resolved, existing.code, notes ?? null),
      updatedById: actor.userId,
    });
    await tx.missionShipment.deleteMany({ where: { missionId: id } });
    await tx.missionShipment.createMany({
      data: resolved.shipmentIds.map((shipmentId) => ({ missionId: id, shipmentId, isActiveAssignment: false })),
    });
  });

  const dto = await reloadMissionDTO(id);
  await logAudit({
    actorUserId: actor.userId,
    action: "mission.updated",
    entityType: "Mission",
    entityId: id,
    afterJson: dto as unknown as Prisma.InputJsonValue,
  });
  return dto;
}

/**
 * Phase 15 — `version` اکنون اجباری است (ADR-P15-05). این یک تغییر شکننده در قرارداد است، ولی
 * تنها مصرف‌کننده این endpoint رابط کاربری مأموریت است که در همین فاز به‌روزرسانی می‌شود.
 */
export async function cancelMission(
  id: string,
  cancellationReason: string,
  version: number,
  actor: ActorContext,
): Promise<MissionDTO> {
  const existing = await prisma.mission.findFirst({ where: { id, deletedAt: null }, include: { shipments: true } });
  if (!existing) {
    throw new DomainError("MISSION_NOT_FOUND", "مأموریت یافت نشد.");
  }
  if (existing.persistedStatus !== "SCHEDULED" && existing.persistedStatus !== "DRAFT") {
    throw new DomainError("MISSION_NOT_CANCELLABLE", "این مأموریت قابل لغو نیست.");
  }

  await prisma.$transaction(async (tx) => {
    const activeShipmentIds = existing.shipments.filter((s) => s.isActiveAssignment).map((s) => s.shipmentId);
    await tx.missionShipment.updateMany({ where: { missionId: id, isActiveAssignment: true }, data: { isActiveAssignment: false } });
    if (activeShipmentIds.length > 0) {
      await tx.shipment.updateMany({ where: { id: { in: activeShipmentIds } }, data: { status: "DRAFT" } });
    }
    await updateMissionGuarded(tx, id, version, {
      persistedStatus: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason,
      updatedById: actor.userId,
    });
  });

  const dto = await reloadMissionDTO(id);
  await logAudit({
    actorUserId: actor.userId,
    action: "mission.cancelled",
    entityType: "Mission",
    entityId: id,
    afterJson: dto as unknown as Prisma.InputJsonValue,
  });
  return dto;
}

export async function duplicateMission(id: string, startAtIso: string, actor: ActorContext): Promise<MissionDTO> {
  const source = await prisma.mission.findFirst({ where: { id, deletedAt: null }, include: { shipments: true } });
  if (!source) {
    throw new DomainError("MISSION_NOT_FOUND", "مأموریت یافت نشد.");
  }

  const shipmentIds = source.shipments.map((s) => s.shipmentId);
  const resolved = await resolveOperationalInputs({
    shipmentIds,
    vehicleId: source.vehicleId,
    startAtIso,
    routeId: source.routeId,
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateMissionCode();
    try {
      const created = await prisma.mission.create({
        data: {
          ...missionCreateData(resolved, code, source.notes),
          createdById: actor.userId,
          updatedById: actor.userId,
          duplicatedFromMissionId: source.id,
          shipments: { create: resolved.shipmentIds.map((shipmentId) => ({ shipmentId, isActiveAssignment: false })) },
        },
        include: MISSION_INCLUDE,
      });

      const dto = toDTO(created);
      await logAudit({
        actorUserId: actor.userId,
        action: "mission.duplicated",
        entityType: "Mission",
        entityId: created.id,
        beforeJson: { duplicatedFromMissionId: source.id } as Prisma.InputJsonValue,
        afterJson: dto as unknown as Prisma.InputJsonValue,
      });
      return dto;
    } catch (error) {
      if (isUniqueConstraintError(error)) continue;
      throw error;
    }
  }

  throw new DomainError("MISSION_CODE_GENERATION_FAILED", "تولید کد مأموریت یکتا ناموفق بود؛ دوباره تلاش کنید.");
}

export async function softDeleteDraftMission(id: string, actor: ActorContext): Promise<void> {
  const existing = await prisma.mission.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    throw new DomainError("MISSION_NOT_FOUND", "مأموریت یافت نشد.");
  }
  if (existing.persistedStatus !== "DRAFT") {
    throw new DomainError("MISSION_NOT_DRAFT", "فقط مأموریت پیش‌نویس مستقیماً قابل حذف است؛ برای مأموریت منتشرشده از لغو استفاده کنید.");
  }

  await prisma.mission.update({ where: { id }, data: { deletedAt: new Date(), updatedById: actor.userId } });
  await logAudit({ actorUserId: actor.userId, action: "mission.deleted", entityType: "Mission", entityId: id });
}

export async function listMissions(filters: {
  q?: string;
  persistedStatus?: MissionPersistedStatus;
  vehicleId?: string;
  originWarehouseId?: string;
}): Promise<MissionDTO[]> {
  const where: Prisma.MissionWhereInput = { deletedAt: null };
  if (filters.persistedStatus) where.persistedStatus = filters.persistedStatus;
  if (filters.vehicleId) where.vehicleId = filters.vehicleId;
  if (filters.originWarehouseId) where.originWarehouseId = filters.originWarehouseId;
  if (filters.q) {
    where.OR = [
      { code: { contains: filters.q, mode: "insensitive" } },
      { originTitle: { contains: filters.q, mode: "insensitive" } },
      { destinationTitle: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const missions = await prisma.mission.findMany({ where, include: MISSION_INCLUDE, orderBy: { startAt: "desc" } });
  return missions.map(toDTO);
}

/**
 * خلاصه مأموریت بر اساس وضعیت *ثبت‌شده* (نه وضعیت محاسباتی — آن کار فرانمای وضعیت فاز ۱۳ است).
 *
 * هر چهار وضعیت enum شمرده می‌شوند. پیش‌تر `ARCHIVED` شمرده نمی‌شد و اعداد فقط به این دلیل جمع
 * می‌شدند که هیچ کدی آن مقدار را نمی‌نوشت — یک تعادل تصادفی، نه تضمین‌شده. با شمارش همه وضعیت‌ها
 * در یک groupBy، ثابت `draft + scheduled + cancelled + archived === total` ساختاری می‌شود و
 * افزودن وضعیت‌های پایانی در فاز ۱۵ نمی‌تواند بی‌صدا آن را بشکند.
 */
export interface MissionSummary {
  total: number;
  draft: number;
  scheduled: number;
  completed: number;
  failed: number;
  cancelled: number;
  archived: number;
}

export async function getMissionSummary(): Promise<MissionSummary> {
  // یک groupBy به‌جای چهار count موازی: یک رفت‌وبرگشت کمتر، و مهم‌تر اینکه همه سطل‌ها از یک
  // اسکن می‌آیند پس جمعشان ذاتاً برابر total است.
  const groups = await prisma.mission.groupBy({
    by: ["persistedStatus"],
    where: { deletedAt: null },
    _count: { _all: true },
  });

  const summary: MissionSummary = { total: 0, draft: 0, scheduled: 0, completed: 0, failed: 0, cancelled: 0, archived: 0 };

  for (const group of groups) {
    const count = group._count._all;
    summary.total += count;
    switch (group.persistedStatus) {
      case "DRAFT":
        summary.draft += count;
        break;
      case "SCHEDULED":
        summary.scheduled += count;
        break;
      case "COMPLETED":
        summary.completed += count;
        break;
      case "FAILED":
        summary.failed += count;
        break;
      case "CANCELLED":
        summary.cancelled += count;
        break;
      case "ARCHIVED":
        summary.archived += count;
        break;
    }
  }

  return summary;
}

export async function getMissionById(id: string): Promise<MissionDTO | null> {
  const mission = await prisma.mission.findFirst({ where: { id, deletedAt: null }, include: MISSION_INCLUDE });
  return mission ? toDTO(mission) : null;
}

export async function getMissionHistory(id: string) {
  return prisma.auditLog.findMany({ where: { entityType: "Mission", entityId: id }, orderBy: { occurredAt: "desc" }, take: 50 });
}

// ---------------------------------------------------------------------------
// Phase 15 — تکمیل چرخه عمر مأموریت
// ---------------------------------------------------------------------------

/**
 * به‌روزرسانی مشروط به نسخه (CC-02).
 *
 * `updateMany` اجباری است، نه یک انتخاب سلیقه‌ای: `update` در Prisma فقط روی یک فیلد یکتا کار
 * می‌کند و نمی‌تواند شرط ترکیبی `id + version` را بیان کند. `count === 0` سیگنال تعارض است و
 * هم وقتی نسخه عوض شده باشد فعال می‌شود و هم وقتی رکورد حذف نرم شده باشد — از دید فراخوان هر دو
 * تعارض‌اند و پیام یکسانی می‌گیرند.
 */
async function updateMissionGuarded(
  tx: TxClient,
  id: string,
  expectedVersion: number,
  // `Unchecked…` لازم است چون کلیدهای خارجی اسکالر مثل `updatedById` در نوع checked وجود ندارند.
  data: Prisma.MissionUncheckedUpdateManyInput,
): Promise<void> {
  const result = await tx.mission.updateMany({
    where: { id, version: expectedVersion, deletedAt: null },
    data: { ...data, version: { increment: 1 } },
  });

  if (result.count === 0) {
    throw new DomainError(
      "MISSION_VERSION_CONFLICT",
      "این مأموریت توسط کاربر دیگری تغییر کرده است. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.",
    );
  }
}

/**
 * TX-02 — گارد باید **درون** تراکنش و روی داده تازه‌خوانده ارزیابی شود، نه روی داده‌ای که پیش از
 * شروع تراکنش خوانده شده. توکن نسخه به‌تنهایی کافی نیست: هر مسیر نوشتنی باید نسخه را بالا ببرد
 * تا این استدلال برقرار بماند، و تکیه‌کردن بر آن یعنی یک `publish` که یادش رفته نسخه را افزایش
 * دهد، بی‌صدا این ضمانت را می‌شکند. خواندن دوباره درون تراکنش، این وابستگی را حذف می‌کند.
 */
async function loadMissionInTx(tx: TxClient, id: string) {
  const mission = await tx.mission.findFirst({ where: { id, deletedAt: null }, include: { shipments: true } });
  if (!mission) throw new DomainError("MISSION_NOT_FOUND", "مأموریت یافت نشد.");
  return mission;
}

/** خواندن پیش از تراکنش فقط برای شکست سریع با پیام دقیق است؛ حکم نهایی درون تراکنش صادر می‌شود. */
async function loadMissionForTransition(id: string) {
  const mission = await prisma.mission.findFirst({ where: { id, deletedAt: null }, include: { shipments: true } });
  if (!mission) throw new DomainError("MISSION_NOT_FOUND", "مأموریت یافت نشد.");
  return mission;
}

async function reloadMissionDTO(id: string): Promise<MissionDTO> {
  return toDTO(await prisma.mission.findFirstOrThrow({ where: { id }, include: MISSION_INCLUDE }));
}

/**
 * `logAudit` عمداً *پس از* commit تراکنش اجرا می‌شود (TX-03) — همان الگویی که `cancelMission`
 * شیپ‌شده دارد. شکست نوشتن ممیزی نباید یک واقعیت کسب‌وکاریِ commit‌شده را برگرداند.
 */
async function auditTransition(action: string, id: string, dto: MissionDTO, actor: ActorContext, extra?: Record<string, unknown>) {
  await logAudit({
    actorUserId: actor.userId,
    action,
    entityType: "Mission",
    entityId: id,
    afterJson: { ...(dto as unknown as Record<string, unknown>), ...(extra ?? {}) } as Prisma.InputJsonValue,
  });
}

export interface CompleteMissionInput {
  version: number;
  actualArrivalAt: Date;
  actualDepartureAt?: Date | null;
}

/** T3 — ثبت رسیدن واقعی. مرسوله‌های فعال تحویل‌شده و آزاد می‌شوند (LR-05). */
export async function completeMission(
  id: string,
  input: CompleteMissionInput,
  actor: ActorContext,
): Promise<MissionDTO> {
  // شکست سریع پیش از باز کردن تراکنش؛ حکم نهایی درون تراکنش تکرار می‌شود.
  assertTransitionAllowed((await loadMissionForTransition(id)).persistedStatus, "complete");

  await prisma.$transaction(async (tx) => {
    const existing = await loadMissionInTx(tx, id);
    assertTransitionAllowed(existing.persistedStatus, "complete");
    validateCompletionTimes(existing, input, new Date());

    const activeShipmentIds = existing.shipments.filter((link) => link.isActiveAssignment).map((link) => link.shipmentId);

    await updateMissionGuarded(tx, id, input.version, {
      persistedStatus: "COMPLETED",
      actualArrivalAt: input.actualArrivalAt,
      actualDepartureAt: input.actualDepartureAt ?? null,
      updatedById: actor.userId,
    });

    await tx.missionShipment.updateMany({ where: { missionId: id, isActiveAssignment: true }, data: { isActiveAssignment: false } });
    if (activeShipmentIds.length > 0) {
      // مجموعه‌ای، نه حلقه‌ای — P-02 صراحتاً N+1 را ممنوع می‌کند.
      await tx.shipment.updateMany({ where: { id: { in: activeShipmentIds } }, data: { status: "DELIVERED" } });
    }
  });

  const dto = await reloadMissionDTO(id);
  await auditTransition("mission.completed", id, dto, actor);
  return dto;
}

export interface FailMissionInput {
  version: number;
  failedAt: Date;
  failureReason: string;
  failureClassification: MissionFailureClassification;
}

/**
 * T4 — ثبت شکست. مرسوله‌ها به `WAITING_FOR_DISPATCH` برمی‌گردند نه `DRAFT` (LR-08):
 * باری که فرستاده شده و مأموریتش شکست خورده، عملیاتاً با باری که هرگز فرستاده نشده فرق دارد —
 * وجود دارد، حمل می‌خواهد، و الان مأموریتی ندارد.
 */
export async function failMission(id: string, input: FailMissionInput, actor: ActorContext): Promise<MissionDTO> {
  assertTransitionAllowed((await loadMissionForTransition(id)).persistedStatus, "fail");

  await prisma.$transaction(async (tx) => {
    const existing = await loadMissionInTx(tx, id);
    assertTransitionAllowed(existing.persistedStatus, "fail");
    const failureReason = validateFailureInput(existing, input, new Date());

    const activeShipmentIds = existing.shipments.filter((link) => link.isActiveAssignment).map((link) => link.shipmentId);

    await updateMissionGuarded(tx, id, input.version, {
      persistedStatus: "FAILED",
      failedAt: input.failedAt,
      failureReason,
      failureClassification: input.failureClassification,
      updatedById: actor.userId,
    });

    await tx.missionShipment.updateMany({ where: { missionId: id, isActiveAssignment: true }, data: { isActiveAssignment: false } });
    if (activeShipmentIds.length > 0) {
      await tx.shipment.updateMany({ where: { id: { in: activeShipmentIds } }, data: { status: "WAITING_FOR_DISPATCH" } });
    }
  });

  const dto = await reloadMissionDTO(id);
  await auditTransition("mission.failed", id, dto, actor);
  return dto;
}

/** T5 — بایگانی. هیچ اثری روی مرسوله ندارد: بایگانی یک عمل بایگانی‌کردن است، نه عملیاتی. */
export async function archiveMission(id: string, version: number, actor: ActorContext): Promise<MissionDTO> {
  assertTransitionAllowed((await loadMissionForTransition(id)).persistedStatus, "archive");

  await prisma.$transaction(async (tx) => {
    const existing = await loadMissionInTx(tx, id);
    assertTransitionAllowed(existing.persistedStatus, "archive");

    await updateMissionGuarded(tx, id, version, {
      persistedStatus: "ARCHIVED",
      archivedAt: new Date(),
      // LR-09 — بدون این، خروج از بایگانی نمی‌داند به کجا برگردد.
      statusBeforeArchive: existing.persistedStatus,
      updatedById: actor.userId,
    });
  });

  const dto = await reloadMissionDTO(id);
  await auditTransition("mission.archived", id, dto, actor);
  return dto;
}

/** T6 — خروج از بایگانی؛ دقیقاً به همان وضعیت پایانی پیشین برمی‌گردد (LR-10). */
export async function unarchiveMission(id: string, version: number, actor: ActorContext): Promise<MissionDTO> {
  assertTransitionAllowed((await loadMissionForTransition(id)).persistedStatus, "unarchive");

  await prisma.$transaction(async (tx) => {
    const existing = await loadMissionInTx(tx, id);
    assertTransitionAllowed(existing.persistedStatus, "unarchive");
    const target = resolveTargetStatus("unarchive", existing);

    await updateMissionGuarded(tx, id, version, {
      persistedStatus: target,
      archivedAt: null,
      statusBeforeArchive: null,
      updatedById: actor.userId,
    });
  });

  const dto = await reloadMissionDTO(id);
  await auditTransition("mission.unarchived", id, dto, actor);
  return dto;
}

export interface ReopenMissionInput {
  version: number;
  reopenReason: string;
}

/**
 * T7 — بازگشایی یک مأموریت پایانی به `SCHEDULED`.
 *
 * سخت‌ترین گذار این فاز، چون تنها گذاری است که چیزی را *پس می‌گیرد*: مرسوله‌ها باید دوباره
 * تصاحب شوند. اگر در این فاصله مرسوله‌ای به مأموریت دیگری تخصیص یافته باشد، بازگشایی رد می‌شود
 * (LR-13) — دزدیدن بی‌صدای مرسوله از مأموریت دیگر، ADR-019 را نقض می‌کرد.
 */
export async function reopenMission(id: string, input: ReopenMissionInput, actor: ActorContext): Promise<MissionDTO> {
  assertTransitionAllowed((await loadMissionForTransition(id)).persistedStatus, "reopen");
  const reopenReason = validateReopenReason(input.reopenReason);

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await loadMissionInTx(tx, id);
      assertTransitionAllowed(existing.persistedStatus, "reopen");

      const shipmentIds = existing.shipments.map((link) => link.shipmentId);

      await updateMissionGuarded(tx, id, input.version, {
        persistedStatus: "SCHEDULED",
        // LR-12 — واقعیت‌هایی که این گذار برمی‌گرداند باید پاک شوند، وگرنه I-12 می‌شکند.
        actualArrivalAt: null,
        actualDepartureAt: null,
        failedAt: null,
        failureReason: null,
        failureClassification: null,
        reopenCount: { increment: 1 },
        lastReopenedAt: new Date(),
        updatedById: actor.userId,
      });

      if (shipmentIds.length > 0) {
        // قفل بدبینانه ADR-019 روی همان ردیف‌ها، پیش از تلاش برای تصاحب دوباره (TX-04).
        // ستون id از نوع TEXT است (نه uuid بومی postgres)؛ بدون cast مقایسه شود.
        for (const shipmentId of shipmentIds) {
          await tx.$queryRaw`SELECT id FROM "Shipment" WHERE id = ${shipmentId} FOR UPDATE`;
        }
        await tx.missionShipment.updateMany({ where: { missionId: id }, data: { isActiveAssignment: true } });
        await tx.shipment.updateMany({ where: { id: { in: shipmentIds } }, data: { status: "IN_TRANSIT" } });
      }
    });
  } catch (error) {
    // ایندکس یکتای جزئی ADR-019 اینجا شلیک می‌کند: مرسوله در این فاصله جای دیگری رفته است.
    if (isPostgresUniqueViolation(error)) {
      throw new DomainError(
        "SHIPMENT_ALREADY_ASSIGNED",
        "یک یا چند مرسوله این مأموریت در این فاصله به مأموریت دیگری تخصیص یافته‌اند؛ بازگشایی ممکن نیست.",
      );
    }
    throw error;
  }

  const dto = await reloadMissionDTO(id);
  await auditTransition("mission.reopened", id, dto, actor, { reopenReason });
  return dto;
}

export interface MissionEstimatePreviewInput {
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  speedKmh: number;
  routeId?: string | null;
  fuelConsumptionPer100Km?: number | null;
}

export async function estimateMissionPreview(input: MissionEstimatePreviewInput) {
  const route = await resolveRoute(input.routeId);
  const routePoints = route
    ? route.points
        .slice()
        .sort((a, b) => a.sequence - b.sequence)
        .map((p) => ({ latitude: Number(p.latitude), longitude: Number(p.longitude) }))
    : undefined;

  return estimateMission({
    origin: { latitude: input.originLatitude, longitude: input.originLongitude },
    destination: { latitude: input.destinationLatitude, longitude: input.destinationLongitude },
    speedKmh: input.speedKmh,
    routePoints,
    fuelConsumptionPer100Km: input.fuelConsumptionPer100Km ?? null,
  });
}
