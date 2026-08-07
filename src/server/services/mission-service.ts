import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors/domain-error";
import { logAudit } from "@/server/services/audit-service";
import type { ActorContext } from "@/server/services/permission-service";
import type { Prisma, MissionPersistedStatus } from "@/generated/prisma/client";
import { estimateMission } from "@/lib/domain/mission-estimate";
import {
  areShipmentsCompatible,
  deriveMissionDisplayStatus,
  isMissionOperationallyLocked,
  missionTimeRangesOverlap,
  type MissionDisplayStatus,
} from "@/lib/domain/mission-rules";
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
}

const MISSION_INCLUDE = {
  vehicle: true,
  shipments: {
    include: { shipment: { include: { cargoType: true } } },
  },
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
async function commitMissionAssignment(missionId: string, resolved: ResolvedOperationalInputs, notes: string | null) {
  return prisma.$transaction(async (tx) => {
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
    const updated = await prisma.mission.update({ where: { id }, data: { notes, updatedById: actor.userId }, include: MISSION_INCLUDE });
    const dto = toDTO(updated);
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
    const updated = await commitMissionAssignment(id, resolved, notes ?? null);
    const dto = toDTO(updated);
    await logAudit({ actorUserId: actor.userId, action: "mission.updated", entityType: "Mission", entityId: id, afterJson: dto as unknown as Prisma.InputJsonValue });
    return dto;
  }

  // DRAFT: بدون قفل/بازبینی آمادگی — فقط جایگزینی ساده لینک‌های مرسوله و snapshot دوباره
  const updated = await prisma.$transaction(async (tx) => {
    await tx.missionShipment.deleteMany({ where: { missionId: id } });
    return tx.mission.update({
      where: { id },
      data: {
        ...missionCreateData(resolved, existing.code, notes ?? null),
        updatedById: actor.userId,
        shipments: { create: resolved.shipmentIds.map((shipmentId) => ({ shipmentId, isActiveAssignment: false })) },
      },
      include: MISSION_INCLUDE,
    });
  });

  const dto = toDTO(updated);
  await logAudit({
    actorUserId: actor.userId,
    action: "mission.updated",
    entityType: "Mission",
    entityId: id,
    afterJson: dto as unknown as Prisma.InputJsonValue,
  });
  return dto;
}

export async function cancelMission(id: string, cancellationReason: string, actor: ActorContext): Promise<MissionDTO> {
  const existing = await prisma.mission.findFirst({ where: { id, deletedAt: null }, include: { shipments: true } });
  if (!existing) {
    throw new DomainError("MISSION_NOT_FOUND", "مأموریت یافت نشد.");
  }
  if (existing.persistedStatus !== "SCHEDULED" && existing.persistedStatus !== "DRAFT") {
    throw new DomainError("MISSION_NOT_CANCELLABLE", "این مأموریت قابل لغو نیست.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const activeShipmentIds = existing.shipments.filter((s) => s.isActiveAssignment).map((s) => s.shipmentId);
    await tx.missionShipment.updateMany({ where: { missionId: id, isActiveAssignment: true }, data: { isActiveAssignment: false } });
    if (activeShipmentIds.length > 0) {
      await tx.shipment.updateMany({ where: { id: { in: activeShipmentIds } }, data: { status: "DRAFT" } });
    }
    return tx.mission.update({
      where: { id },
      data: { persistedStatus: "CANCELLED", cancelledAt: new Date(), cancellationReason, updatedById: actor.userId },
      include: MISSION_INCLUDE,
    });
  });

  const dto = toDTO(updated);
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

  const summary: MissionSummary = { total: 0, draft: 0, scheduled: 0, cancelled: 0, archived: 0 };

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
