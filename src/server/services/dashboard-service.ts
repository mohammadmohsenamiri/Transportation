import { prisma } from "@/lib/db/prisma";
import {
  countMissionsByDisplayStatus,
  countMissionsStartingWithin,
  resolveDashboardRange,
  toDistribution,
  type DashboardRangePreset,
  type DistributionSlice,
  type MissionStatusCounters,
} from "@/lib/domain/dashboard-rules";
import { missionDisplayStatusLabel } from "@/lib/domain/mission-labels";
import type { MissionStatusInput } from "@/lib/domain/mission-rules";

/**
 * Phase 13 — سرویس واحد آمار «فرانمای وضعیت».
 *
 * تنها منبع اعداد داشبورد. طبق `IMPLEMENTATION_PLAN.md` فاز ۱۳ («query service واحد برای KPIها»)
 * هیچ KPI دیگری نباید در component یا route محاسبه شود.
 *
 * قاعده کلیدی: وضعیت مأموریت‌ها با `prisma.count({ persistedStatus })` شمرده *نمی‌شود*. یک مأموریت
 * `SCHEDULED` بسته به لحظه مشاهده «در انتظار حرکت»، «در حال حرکت» یا «رسیده» است و این گذار هیچ
 * نوشتنی در DB ندارد. بنابراین رکوردهای لازم با `select` باریک خوانده و همان تابع محض دامنه
 * (`deriveMissionDisplayStatus`، از طریق `countMissionsByDisplayStatus`) رویشان اجرا می‌شود — دقیقاً
 * همان تابعی که موتور فاز ۹ و صحنه نقشه فاز ۱۰ به‌کار می‌برند، تا عدد داشبورد و نقشه هرگز واگرا نشوند.
 */

export interface DashboardRangeDTO {
  preset: DashboardRangePreset;
  from: string | null;
  to: string | null;
}

export interface FleetCountersDTO {
  total: number;
  ready: number;
  outOfService: number;
}

export interface MissionCountersDTO extends MissionStatusCounters {
  /** مأموریت‌های منتشرشده‌ای که در ۲۴ ساعت پس از زمان مشاهده شروع می‌شوند (`PROJECT_SPEC.md` §۱۱). */
  startingNext24h: number;
}

export interface ShipmentCountersDTO {
  total: number;
  draft: number;
  waitingForDispatch: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
}

export interface OrganizationCountersDTO {
  countryOffices: number;
  groupOffices: number;
  distributorOffices: number;
  warehouses: number;
  /** جمع سه سطح دفتری (بدون انبار) — «خلاصه دفاتر» در فرانما. */
  totalOffices: number;
}

export interface DashboardSummaryDTO {
  /** لحظه‌ای که وضعیت‌های محاسباتی بر اساس آن مشتق شدند (زنده = اکنون سرور). */
  viewTime: string;
  /** لحظه پایان محاسبه — «آخرین به‌روزرسانی» در header فرانما (`PROJECT_SPEC.md` §۱۱). */
  computedAt: string;
  range: DashboardRangeDTO;
  fleet: FleetCountersDTO;
  missions: MissionCountersDTO;
  shipments: ShipmentCountersDTO;
  organization: OrganizationCountersDTO;
  missionStatusDistribution: DistributionSlice[];
  vehicleTypeDistribution: DistributionSlice[];
  missionsByVehicleType: DistributionSlice[];
}

export interface DashboardSummaryInput {
  viewTime: Date;
  range: DashboardRangePreset;
}

const NEXT_24H_MS = 24 * 60 * 60 * 1000;

type MissionRow = MissionStatusInput & { vehicleTypeId: string; vehicleTypeName: string };

export async function getDashboardSummary(input: DashboardSummaryInput): Promise<DashboardSummaryDTO> {
  const { viewTime, range: preset } = input;
  const range = resolveDashboardRange(preset, viewTime);

  // فیلتر بازه فقط روی مأموریت‌ها اعمال می‌شود (بر اساس `startAt`). آمار ناوگان، مرسوله و ساختار
  // سازمانی «وضعیت جاری» هستند و مفهوم بازه ندارند — اندازه ناوگان تابع یک بازه تاریخی نیست.
  const missionWhere = {
    deletedAt: null,
    ...(range.from || range.to
      ? {
          startAt: {
            ...(range.from ? { gte: range.from } : {}),
            ...(range.to ? { lt: range.to } : {}),
          },
        }
      : {}),
  };

  const [missionRecords, vehicleGroups, vehicleTypes, shipmentGroups, orgGroups] = await Promise.all([
    prisma.mission.findMany({
      where: missionWhere,
      // `select` باریک عمدی: فقط سه فیلد لازم برای مشتق‌کردن وضعیت + نوع خودرو برای توزیع.
      // هیچ مختصات/مسیر/مرسوله‌ای خوانده نمی‌شود، پس این کوئری از `getMapScene` فاز ۱۰ سبک‌تر است.
      select: {
        persistedStatus: true,
        startAt: true,
        estimatedArrivalAt: true,
        vehicle: { select: { vehicleTypeId: true, vehicleType: { select: { name: true } } } },
      },
    }),
    prisma.vehicle.groupBy({
      by: ["vehicleTypeId", "readiness"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.vehicleType.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
    prisma.shipment.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.organizationUnit.groupBy({ by: ["level"], where: { deletedAt: null }, _count: { _all: true } }),
  ]);

  const missions: MissionRow[] = missionRecords.map((record) => ({
    persistedStatus: record.persistedStatus,
    startAt: record.startAt,
    estimatedArrivalAt: record.estimatedArrivalAt,
    vehicleTypeId: record.vehicle.vehicleTypeId,
    vehicleTypeName: record.vehicle.vehicleType.name,
  }));

  const missionCounters = countMissionsByDisplayStatus(missions, viewTime);
  const startingNext24h = countMissionsStartingWithin(
    missions,
    viewTime,
    new Date(viewTime.getTime() + NEXT_24H_MS),
  );

  return {
    viewTime: viewTime.toISOString(),
    computedAt: new Date().toISOString(),
    range: {
      preset,
      from: range.from ? range.from.toISOString() : null,
      to: range.to ? range.to.toISOString() : null,
    },
    fleet: buildFleetCounters(vehicleGroups),
    missions: { ...missionCounters, startingNext24h },
    shipments: buildShipmentCounters(shipmentGroups),
    organization: buildOrganizationCounters(orgGroups),
    missionStatusDistribution: buildMissionStatusDistribution(missionCounters),
    vehicleTypeDistribution: buildVehicleTypeDistribution(vehicleGroups, vehicleTypes),
    missionsByVehicleType: buildMissionsByVehicleType(missions),
  };
}

// ---------------------------------------------------------------------------
// تبدیل نتایج groupBy به DTO — بدون منطق کسب‌وکار، فقط جمع‌بندی
// ---------------------------------------------------------------------------

type VehicleGroup = { vehicleTypeId: string; readiness: "READY" | "OUT_OF_SERVICE"; _count: { _all: number } };
type ShipmentGroup = { status: "DRAFT" | "WAITING_FOR_DISPATCH" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED"; _count: { _all: number } };
type OrgGroup = { level: "COUNTRY_OFFICE" | "GROUP_OFFICE" | "DISTRIBUTOR_OFFICE" | "WAREHOUSE"; _count: { _all: number } };

function buildFleetCounters(groups: readonly VehicleGroup[]): FleetCountersDTO {
  let ready = 0;
  let outOfService = 0;
  for (const group of groups) {
    if (group.readiness === "READY") ready += group._count._all;
    else outOfService += group._count._all;
  }
  return { total: ready + outOfService, ready, outOfService };
}

function buildShipmentCounters(groups: readonly ShipmentGroup[]): ShipmentCountersDTO {
  const counters: ShipmentCountersDTO = {
    total: 0,
    draft: 0,
    waitingForDispatch: 0,
    inTransit: 0,
    delivered: 0,
    cancelled: 0,
  };
  for (const group of groups) {
    const count = group._count._all;
    counters.total += count;
    switch (group.status) {
      case "DRAFT":
        counters.draft += count;
        break;
      case "WAITING_FOR_DISPATCH":
        counters.waitingForDispatch += count;
        break;
      case "IN_TRANSIT":
        counters.inTransit += count;
        break;
      case "DELIVERED":
        counters.delivered += count;
        break;
      case "CANCELLED":
        counters.cancelled += count;
        break;
    }
  }
  return counters;
}

function buildOrganizationCounters(groups: readonly OrgGroup[]): OrganizationCountersDTO {
  const counters: OrganizationCountersDTO = {
    countryOffices: 0,
    groupOffices: 0,
    distributorOffices: 0,
    warehouses: 0,
    totalOffices: 0,
  };
  for (const group of groups) {
    const count = group._count._all;
    switch (group.level) {
      case "COUNTRY_OFFICE":
        counters.countryOffices += count;
        break;
      case "GROUP_OFFICE":
        counters.groupOffices += count;
        break;
      case "DISTRIBUTOR_OFFICE":
        counters.distributorOffices += count;
        break;
      case "WAREHOUSE":
        counters.warehouses += count;
        break;
    }
  }
  counters.totalOffices = counters.countryOffices + counters.groupOffices + counters.distributorOffices;
  return counters;
}

function buildMissionStatusDistribution(counters: MissionStatusCounters): DistributionSlice[] {
  return toDistribution([
    { key: "WAITING", label: missionDisplayStatusLabel.WAITING, value: counters.waiting },
    { key: "IN_PROGRESS", label: missionDisplayStatusLabel.IN_PROGRESS, value: counters.inProgress },
    { key: "ARRIVED", label: missionDisplayStatusLabel.ARRIVED, value: counters.arrived },
    { key: "DRAFT", label: missionDisplayStatusLabel.DRAFT, value: counters.draft },
    { key: "CANCELLED", label: missionDisplayStatusLabel.CANCELLED, value: counters.cancelled },
    { key: "ARCHIVED", label: missionDisplayStatusLabel.ARCHIVED, value: counters.archived },
  ]);
}

function buildVehicleTypeDistribution(
  groups: readonly VehicleGroup[],
  vehicleTypes: readonly { id: string; name: string }[],
): DistributionSlice[] {
  const totals = new Map<string, number>();
  for (const group of groups) {
    totals.set(group.vehicleTypeId, (totals.get(group.vehicleTypeId) ?? 0) + group._count._all);
  }
  // نوع‌های بدون خودرو عمداً حذف می‌شوند تا نمودار با قطاع‌های صفر شلوغ نشود.
  return toDistribution(
    vehicleTypes
      .filter((type) => (totals.get(type.id) ?? 0) > 0)
      .map((type) => ({ key: type.id, label: type.name, value: totals.get(type.id) ?? 0 })),
  );
}

function buildMissionsByVehicleType(missions: readonly MissionRow[]): DistributionSlice[] {
  const totals = new Map<string, { label: string; value: number }>();
  for (const mission of missions) {
    const existing = totals.get(mission.vehicleTypeId);
    if (existing) existing.value += 1;
    else totals.set(mission.vehicleTypeId, { label: mission.vehicleTypeName, value: 1 });
  }
  return toDistribution([...totals].map(([key, entry]) => ({ key, label: entry.label, value: entry.value })));
}
