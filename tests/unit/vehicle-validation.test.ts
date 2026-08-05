import { describe, expect, it } from "vitest";
import { vehicleCreateSchema, vehicleTypeCreateSchema } from "@/lib/validation/vehicle";

const baseVehicle = {
  identifier: "TR-001",
  vehicleTypeId: "11111111-1111-4111-8111-111111111111",
  fuelTankLiters: 80,
  avgConsumptionPer100Km: 25,
  avgSpeedKmh: 70,
};

describe("vehicleCreateSchema", () => {
  it("accepts positive numeric values", () => {
    expect(vehicleCreateSchema.safeParse(baseVehicle).success).toBe(true);
  });

  it("rejects negative fuel tank capacity", () => {
    const result = vehicleCreateSchema.safeParse({ ...baseVehicle, fuelTankLiters: -10 });
    expect(result.success).toBe(false);
  });

  it("rejects zero average speed", () => {
    const result = vehicleCreateSchema.safeParse({ ...baseVehicle, avgSpeedKmh: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative fuel consumption", () => {
    const result = vehicleCreateSchema.safeParse({ ...baseVehicle, avgConsumptionPer100Km: -5 });
    expect(result.success).toBe(false);
  });

  it("rejects a missing identifier", () => {
    const result = vehicleCreateSchema.safeParse({ ...baseVehicle, identifier: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid vehicleTypeId", () => {
    const result = vehicleCreateSchema.safeParse({ ...baseVehicle, vehicleTypeId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("vehicleTypeCreateSchema", () => {
  it("accepts a name-only payload (code optional)", () => {
    expect(vehicleTypeCreateSchema.safeParse({ name: "کامیونت" }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(vehicleTypeCreateSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a code with spaces or Persian characters", () => {
    const result = vehicleTypeCreateSchema.safeParse({ name: "وانت", code: "کد نامعتبر" });
    expect(result.success).toBe(false);
  });

  it("accepts an alphanumeric code with dashes/underscores", () => {
    const result = vehicleTypeCreateSchema.safeParse({ name: "وانت", code: "VT_01-a" });
    expect(result.success).toBe(true);
  });
});
