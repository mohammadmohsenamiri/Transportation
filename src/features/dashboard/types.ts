import type { DashboardRangePreset, DistributionSlice } from "@/lib/domain/dashboard-rules";

export type { DashboardRangePreset, DistributionSlice };

export interface DashboardRange {
  preset: DashboardRangePreset;
  from: string | null;
  to: string | null;
}

export interface FleetCounters {
  total: number;
  ready: number;
  outOfService: number;
}

export interface MissionCounters {
  total: number;
  draft: number;
  waiting: number;
  inProgress: number;
  arrived: number;
  cancelled: number;
  archived: number;
  startingNext24h: number;
}

export interface ShipmentCounters {
  total: number;
  draft: number;
  waitingForDispatch: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
}

export interface OrganizationCounters {
  countryOffices: number;
  groupOffices: number;
  distributorOffices: number;
  warehouses: number;
  totalOffices: number;
}

/** آینه سمت‌کلاینت `DashboardSummaryDTO` سرور (`src/server/services/dashboard-service.ts`). */
export interface DashboardSummary {
  viewTime: string;
  computedAt: string;
  range: DashboardRange;
  fleet: FleetCounters;
  missions: MissionCounters;
  shipments: ShipmentCounters;
  organization: OrganizationCounters;
  missionStatusDistribution: DistributionSlice[];
  vehicleTypeDistribution: DistributionSlice[];
  missionsByVehicleType: DistributionSlice[];
}
