import { describe, expect, it } from "vitest";
import { shipmentCreateSchema, shipmentUpdateSchema } from "@/lib/validation/shipment";

const validOrgUnitDestinationBase = {
  title: "محموله تست",
  cargoTypeId: "11111111-1111-4111-8111-111111111111",
  originWarehouseId: "22222222-2222-4222-8222-222222222222",
  destinationMode: "ORGANIZATION_UNIT" as const,
  destinationOrganizationUnitId: "33333333-3333-4333-8333-333333333333",
};

const validCoordinatesDestinationBase = {
  title: "محموله تست",
  cargoTypeId: "11111111-1111-4111-8111-111111111111",
  originWarehouseId: "22222222-2222-4222-8222-222222222222",
  destinationMode: "COORDINATES" as const,
  destinationTitle: "انبار موقت",
  destinationLatitude: 35.6892,
  destinationLongitude: 51.389,
};

describe("shipmentCreateSchema", () => {
  it("accepts a valid organization-unit destination", () => {
    expect(shipmentCreateSchema.safeParse(validOrgUnitDestinationBase).success).toBe(true);
  });

  it("accepts a valid coordinates destination", () => {
    expect(shipmentCreateSchema.safeParse(validCoordinatesDestinationBase).success).toBe(true);
  });

  it("rejects organization-unit mode without an id", () => {
    const result = shipmentCreateSchema.safeParse({
      ...validOrgUnitDestinationBase,
      destinationOrganizationUnitId: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("destinationOrganizationUnitId"))).toBe(true);
    }
  });

  it("rejects coordinates mode missing latitude/longitude/title", () => {
    const result = shipmentCreateSchema.safeParse({
      title: "محموله تست",
      cargoTypeId: "11111111-1111-4111-8111-111111111111",
      originWarehouseId: "22222222-2222-4222-8222-222222222222",
      destinationMode: "COORDINATES",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("destinationTitle");
      expect(paths).toContain("destinationLatitude");
      expect(paths).toContain("destinationLongitude");
    }
  });

  it("rejects missing title, cargoTypeId or originWarehouseId", () => {
    expect(
      shipmentCreateSchema.safeParse({
        cargoTypeId: "11111111-1111-4111-8111-111111111111",
        originWarehouseId: "22222222-2222-4222-8222-222222222222",
        destinationMode: "ORGANIZATION_UNIT",
        destinationOrganizationUnitId: "33333333-3333-4333-8333-333333333333",
      }).success,
    ).toBe(false);
  });

  it("rejects out-of-range destination coordinates", () => {
    const result = shipmentCreateSchema.safeParse({
      ...validCoordinatesDestinationBase,
      destinationLatitude: 999,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative weight or volume", () => {
    expect(shipmentCreateSchema.safeParse({ ...validOrgUnitDestinationBase, weightKg: -5 }).success).toBe(false);
    expect(shipmentCreateSchema.safeParse({ ...validOrgUnitDestinationBase, volumeM3: -1 }).success).toBe(false);
  });
});

describe("shipmentUpdateSchema", () => {
  it("allows a partial update with no destination change", () => {
    expect(shipmentUpdateSchema.safeParse({ notes: "بروزرسانی شد" }).success).toBe(true);
  });

  it("still enforces destination completeness when destinationMode is included", () => {
    const result = shipmentUpdateSchema.safeParse({ destinationMode: "COORDINATES" });
    expect(result.success).toBe(false);
  });

  it("accepts a status transition", () => {
    expect(shipmentUpdateSchema.safeParse({ status: "IN_TRANSIT" }).success).toBe(true);
  });
});
