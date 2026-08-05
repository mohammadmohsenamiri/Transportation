import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors/domain-error";
import { logAudit } from "@/server/services/audit-service";
import type { ActorContext } from "@/server/services/permission-service";
import type { Prisma, Route, RouteSource } from "@/generated/prisma/client";
import { computeRouteDistances } from "@/lib/geo/distance";
import { computePointsChecksum } from "@/lib/security/route-preview-token";
import { parseCsv, sanitizeCsvInjection, stringifyCsv } from "@/lib/csv/csv";
import { validateRouteCsvRows } from "@/lib/domain/route-csv";
import type {
  RouteCreateInput,
  RouteDuplicateInput,
  RouteNewVersionInput,
  RoutePatchInput,
  RoutePointInput,
} from "@/lib/validation/route";

export interface RouteDTO {
  id: string;
  code: string;
  name: string;
  description: string | null;
  source: RouteSource;
  version: number;
  isActive: boolean;
  pointCount: number;
  totalDistanceMeters: number;
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoutePointDTO {
  sequence: number;
  latitude: number;
  longitude: number;
  label: string | null;
  cumulativeDistanceMeters: number;
}

export interface RouteDetailDTO extends RouteDTO {
  points: RoutePointDTO[];
}

type RouteRow = Route;
type RouteRowWithPoints = Prisma.RouteGetPayload<{ include: { points: true } }>;

function toDTO(route: RouteRow): RouteDTO {
  return {
    id: route.id,
    code: route.code,
    name: route.name,
    description: route.description,
    source: route.source,
    version: route.version,
    isActive: route.isActive,
    pointCount: route.pointCount,
    totalDistanceMeters: Number(route.totalDistanceMeters),
    originLatitude: Number(route.originLatitude),
    originLongitude: Number(route.originLongitude),
    destinationLatitude: Number(route.destinationLatitude),
    destinationLongitude: Number(route.destinationLongitude),
    createdAt: route.createdAt.toISOString(),
    updatedAt: route.updatedAt.toISOString(),
  };
}

function toDetailDTO(route: RouteRowWithPoints): RouteDetailDTO {
  return {
    ...toDTO(route),
    points: route.points
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((point) => ({
        sequence: point.sequence,
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        label: point.label,
        cumulativeDistanceMeters: Number(point.cumulativeDistanceMeters),
      })),
  };
}

async function assertCodeAvailable(code: string): Promise<void> {
  const existing = await prisma.route.findFirst({ where: { code } });
  if (existing) {
    throw new DomainError("ROUTE_CODE_DUPLICATE", "این شناسه مسیر قبلاً استفاده شده است.", {
      code: "این شناسه مسیر قبلاً استفاده شده است.",
    });
  }
}

interface BuildRouteRecordArgs {
  code: string;
  name: string;
  description: string | null;
  source: RouteSource;
  points: RoutePointInput[];
  version: number;
}

function buildRouteCreateData(args: BuildRouteRecordArgs): Prisma.RouteCreateInput {
  const sortedPoints = [...args.points].sort((a, b) => a.sequence - b.sequence);
  const { cumulativeDistancesMeters, totalDistanceMeters } = computeRouteDistances(
    sortedPoints.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
  );
  const origin = sortedPoints[0];
  const destination = sortedPoints[sortedPoints.length - 1];

  return {
    code: args.code,
    name: args.name,
    description: args.description,
    source: args.source,
    version: args.version,
    originLatitude: origin.latitude,
    originLongitude: origin.longitude,
    destinationLatitude: destination.latitude,
    destinationLongitude: destination.longitude,
    totalDistanceMeters: BigInt(Math.round(totalDistanceMeters)),
    pointCount: sortedPoints.length,
    checksum: computePointsChecksum(sortedPoints),
    points: {
      create: sortedPoints.map((point, index) => ({
        sequence: point.sequence,
        latitude: point.latitude,
        longitude: point.longitude,
        label: point.label ?? null,
        cumulativeDistanceMeters: BigInt(Math.round(cumulativeDistancesMeters[index])),
      })),
    },
  };
}

export async function listRoutes(filters: { q?: string; isActive?: boolean }): Promise<RouteDTO[]> {
  const allRoutes = await prisma.route.findMany({
    where: { deletedAt: null },
    orderBy: [{ code: "asc" }, { version: "desc" }],
  });

  const latestByCode = new Map<string, RouteRow>();
  for (const route of allRoutes) {
    if (!latestByCode.has(route.code)) {
      latestByCode.set(route.code, route);
    }
  }

  let latest = [...latestByCode.values()];
  if (filters.isActive !== undefined) {
    latest = latest.filter((route) => route.isActive === filters.isActive);
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    latest = latest.filter(
      (route) => route.name.toLowerCase().includes(q) || route.code.toLowerCase().includes(q),
    );
  }

  latest.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return latest.map(toDTO);
}

export interface RouteSummary {
  total: number;
  active: number;
  inactive: number;
  avgDistanceMeters: number;
}

export async function getRouteSummary(): Promise<RouteSummary> {
  const routes = await listRoutes({});
  const active = routes.filter((route) => route.isActive).length;
  const avgDistanceMeters =
    routes.length === 0 ? 0 : Math.round(routes.reduce((sum, r) => sum + r.totalDistanceMeters, 0) / routes.length);
  return { total: routes.length, active, inactive: routes.length - active, avgDistanceMeters };
}

export async function getRouteById(id: string): Promise<RouteDetailDTO | null> {
  const route = await prisma.route.findFirst({
    where: { id, deletedAt: null },
    include: { points: true },
  });
  return route ? toDetailDTO(route) : null;
}

export async function createRoute(input: RouteCreateInput, actor: ActorContext): Promise<RouteDetailDTO> {
  await assertCodeAvailable(input.code);

  const created = await prisma.route.create({
    data: buildRouteCreateData({
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      source: input.source,
      points: input.points,
      version: 1,
    }),
    include: { points: true },
  });

  const dto = toDetailDTO(created);
  await logAudit({
    actorUserId: actor.userId,
    action: "route.created",
    entityType: "Route",
    entityId: created.id,
    afterJson: dto as unknown as Prisma.InputJsonValue,
  });

  return dto;
}

export async function createRouteNewVersion(
  id: string,
  input: RouteNewVersionInput,
  actor: ActorContext,
): Promise<RouteDetailDTO> {
  const current = await prisma.route.findFirst({ where: { id, deletedAt: null } });
  if (!current) {
    throw new DomainError("ROUTE_NOT_FOUND", "مسیر یافت نشد.");
  }

  const created = await prisma.$transaction(async (tx) => {
    await tx.route.update({ where: { id: current.id }, data: { isActive: false } });
    return tx.route.create({
      data: buildRouteCreateData({
        code: current.code,
        name: current.name,
        description: current.description,
        source: input.source,
        points: input.points,
        version: current.version + 1,
      }),
      include: { points: true },
    });
  });

  const dto = toDetailDTO(created);
  await logAudit({
    actorUserId: actor.userId,
    action: "route.new_version",
    entityType: "Route",
    entityId: created.id,
    beforeJson: { previousRouteId: current.id, previousVersion: current.version } as Prisma.InputJsonValue,
    afterJson: dto as unknown as Prisma.InputJsonValue,
  });

  return dto;
}

export async function duplicateRoute(
  id: string,
  input: RouteDuplicateInput,
  actor: ActorContext,
): Promise<RouteDetailDTO> {
  const source = await prisma.route.findFirst({ where: { id, deletedAt: null }, include: { points: true } });
  if (!source) {
    throw new DomainError("ROUTE_NOT_FOUND", "مسیر یافت نشد.");
  }
  await assertCodeAvailable(input.code);

  const points: RoutePointInput[] = source.points.map((point) => ({
    sequence: point.sequence,
    latitude: Number(point.latitude),
    longitude: Number(point.longitude),
    label: point.label,
  }));

  const created = await prisma.route.create({
    data: buildRouteCreateData({
      code: input.code,
      name: input.name,
      description: source.description,
      source: source.source,
      points,
      version: 1,
    }),
    include: { points: true },
  });

  const dto = toDetailDTO(created);
  await logAudit({
    actorUserId: actor.userId,
    action: "route.duplicated",
    entityType: "Route",
    entityId: created.id,
    beforeJson: { duplicatedFromRouteId: source.id } as Prisma.InputJsonValue,
    afterJson: dto as unknown as Prisma.InputJsonValue,
  });

  return dto;
}

export async function patchRoute(id: string, input: RoutePatchInput, actor: ActorContext): Promise<RouteDTO> {
  const existing = await prisma.route.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    throw new DomainError("ROUTE_NOT_FOUND", "مسیر یافت نشد.");
  }

  const updated = await prisma.route.update({
    where: { id },
    data: { name: input.name, description: input.description, isActive: input.isActive },
  });

  const dto = toDTO(updated);
  await logAudit({
    actorUserId: actor.userId,
    action: "route.updated",
    entityType: "Route",
    entityId: id,
    beforeJson: { name: existing.name, description: existing.description, isActive: existing.isActive } as Prisma.InputJsonValue,
    afterJson: dto as unknown as Prisma.InputJsonValue,
  });

  return dto;
}

export async function exportRouteCsv(id: string): Promise<{ filename: string; content: string } | null> {
  const route = await getRouteById(id);
  if (!route) return null;

  const rows: string[][] = [
    ["sequence", "latitude", "longitude", "label"],
    ...route.points.map((point) => [
      String(point.sequence),
      String(point.latitude),
      String(point.longitude),
      sanitizeCsvInjection(point.label ?? ""),
    ]),
  ];

  return { filename: `${route.code}-v${route.version}.csv`, content: stringifyCsv(rows) };
}

export interface RouteCsvPreviewResult {
  previewToken: string | null;
  points: RoutePointInput[];
  pointCount: number;
  totalDistanceMeters: number;
  headerError: string | null;
  rowErrors: { row: number; message: string }[];
  canConfirm: boolean;
}

export function parseRouteCsvPreview(
  csvText: string,
  actor: ActorContext,
  createToken: (actorUserId: string, points: RoutePointInput[]) => string,
): RouteCsvPreviewResult {
  const rows = parseCsv(csvText);
  const validation = validateRouteCsvRows(rows);

  if (validation.headerError || validation.rowErrors.length > 0) {
    return {
      previewToken: null,
      points: validation.points,
      pointCount: validation.points.length,
      totalDistanceMeters: 0,
      headerError: validation.headerError,
      rowErrors: validation.rowErrors,
      canConfirm: false,
    };
  }

  const { totalDistanceMeters } = computeRouteDistances(
    validation.points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
  );

  return {
    previewToken: createToken(actor.userId, validation.points),
    points: validation.points,
    pointCount: validation.points.length,
    totalDistanceMeters: Math.round(totalDistanceMeters),
    headerError: null,
    rowErrors: [],
    canConfirm: true,
  };
}

export async function confirmRouteCsvImport(
  args: { code: string; name: string; description: string | null; points: RoutePointInput[] },
  actor: ActorContext,
): Promise<RouteDetailDTO> {
  return createRoute(
    { code: args.code, name: args.name, description: args.description, source: "CSV", points: args.points },
    actor,
  );
}
