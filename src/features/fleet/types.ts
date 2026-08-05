export interface VehicleType {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  vehicleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CargoType {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type VehicleReadiness = "READY" | "OUT_OF_SERVICE";

export interface Vehicle {
  id: string;
  identifier: string;
  plateNumber: string | null;
  vehicleTypeId: string;
  vehicleTypeName: string;
  fuelTankLiters: number;
  avgConsumptionPer100Km: number;
  avgSpeedKmh: number;
  readiness: VehicleReadiness;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FleetSummary {
  total: number;
  ready: number;
  outOfService: number;
}
