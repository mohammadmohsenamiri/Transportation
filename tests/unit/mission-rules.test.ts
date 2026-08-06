import { describe, expect, it } from "vitest";
import {
  areShipmentsCompatible,
  deriveMissionDisplayStatus,
  isMissionOperationallyLocked,
  missionTimeRangesOverlap,
  shipmentDestinationKey,
  shipmentMatchesDestinationPoint,
} from "@/lib/domain/mission-rules";

const warehouseA = "11111111-1111-4111-8111-111111111111";
const warehouseB = "22222222-2222-4222-8222-222222222222";
const orgUnitX = "33333333-3333-4333-8333-333333333333";

describe("shipmentDestinationKey / areShipmentsCompatible", () => {
  it("treats same organization-unit destination as compatible", () => {
    const shipments = [
      { originWarehouseId: warehouseA, destinationOrganizationUnitId: orgUnitX, destinationLatitude: 1, destinationLongitude: 1 },
      { originWarehouseId: warehouseA, destinationOrganizationUnitId: orgUnitX, destinationLatitude: 1, destinationLongitude: 1 },
    ];
    expect(areShipmentsCompatible(shipments)).toBe(true);
  });

  it("treats same free-coordinate destination as compatible", () => {
    const shipments = [
      { originWarehouseId: warehouseA, destinationOrganizationUnitId: null, destinationLatitude: 35.6892, destinationLongitude: 51.389 },
      { originWarehouseId: warehouseA, destinationOrganizationUnitId: null, destinationLatitude: 35.6892, destinationLongitude: 51.389 },
    ];
    expect(areShipmentsCompatible(shipments)).toBe(true);
  });

  it("rejects different origins", () => {
    const shipments = [
      { originWarehouseId: warehouseA, destinationOrganizationUnitId: orgUnitX, destinationLatitude: 1, destinationLongitude: 1 },
      { originWarehouseId: warehouseB, destinationOrganizationUnitId: orgUnitX, destinationLatitude: 1, destinationLongitude: 1 },
    ];
    expect(areShipmentsCompatible(shipments)).toBe(false);
  });

  it("rejects an organization-unit destination vs. a coordinate destination even if numerically close", () => {
    const shipments = [
      { originWarehouseId: warehouseA, destinationOrganizationUnitId: orgUnitX, destinationLatitude: 1, destinationLongitude: 1 },
      { originWarehouseId: warehouseA, destinationOrganizationUnitId: null, destinationLatitude: 1, destinationLongitude: 1 },
    ];
    expect(areShipmentsCompatible(shipments)).toBe(false);
  });

  it("a single shipment is always compatible", () => {
    expect(
      areShipmentsCompatible([{ originWarehouseId: warehouseA, destinationOrganizationUnitId: null, destinationLatitude: 1, destinationLongitude: 1 }]),
    ).toBe(true);
  });

  it("rounds coordinate keys to 6 decimal places", () => {
    const a = shipmentDestinationKey({ originWarehouseId: warehouseA, destinationOrganizationUnitId: null, destinationLatitude: 1.00000001, destinationLongitude: 1 });
    const b = shipmentDestinationKey({ originWarehouseId: warehouseA, destinationOrganizationUnitId: null, destinationLatitude: 1.00000004, destinationLongitude: 1 });
    expect(a).toBe(b); // هر دو در ۶ رقم اعشار به یک مقدار گرد می‌شوند

    const c = shipmentDestinationKey({ originWarehouseId: warehouseA, destinationOrganizationUnitId: null, destinationLatitude: 1.0000009, destinationLongitude: 1 });
    expect(a).not.toBe(c); // در ۶ رقم اعشار قابل‌تشخیص است
  });
});

describe("missionTimeRangesOverlap", () => {
  it("detects overlapping ranges", () => {
    const a = { startAt: new Date("2026-01-01T08:00:00Z"), estimatedArrivalAt: new Date("2026-01-01T12:00:00Z") };
    const b = { startAt: new Date("2026-01-01T10:00:00Z"), estimatedArrivalAt: new Date("2026-01-01T14:00:00Z") };
    expect(missionTimeRangesOverlap(a, b)).toBe(true);
  });

  it("does not flag back-to-back ranges (touching boundary) as overlapping", () => {
    const a = { startAt: new Date("2026-01-01T08:00:00Z"), estimatedArrivalAt: new Date("2026-01-01T12:00:00Z") };
    const b = { startAt: new Date("2026-01-01T12:00:00Z"), estimatedArrivalAt: new Date("2026-01-01T14:00:00Z") };
    expect(missionTimeRangesOverlap(a, b)).toBe(false);
  });

  it("does not flag fully separate ranges", () => {
    const a = { startAt: new Date("2026-01-01T08:00:00Z"), estimatedArrivalAt: new Date("2026-01-01T09:00:00Z") };
    const b = { startAt: new Date("2026-01-01T10:00:00Z"), estimatedArrivalAt: new Date("2026-01-01T11:00:00Z") };
    expect(missionTimeRangesOverlap(a, b)).toBe(false);
  });
});

describe("deriveMissionDisplayStatus / isMissionOperationallyLocked", () => {
  const startAt = new Date("2026-01-01T08:00:00Z");
  const estimatedArrivalAt = new Date("2026-01-01T12:00:00Z");

  it("returns DRAFT/CANCELLED/ARCHIVED directly regardless of time", () => {
    expect(deriveMissionDisplayStatus({ persistedStatus: "DRAFT", startAt, estimatedArrivalAt }, new Date())).toBe("DRAFT");
    expect(deriveMissionDisplayStatus({ persistedStatus: "CANCELLED", startAt, estimatedArrivalAt }, new Date())).toBe("CANCELLED");
    expect(deriveMissionDisplayStatus({ persistedStatus: "ARCHIVED", startAt, estimatedArrivalAt }, new Date())).toBe("ARCHIVED");
  });

  it("derives WAITING before startAt, IN_PROGRESS between, ARRIVED at/after ETA", () => {
    const mission = { persistedStatus: "SCHEDULED" as const, startAt, estimatedArrivalAt };
    expect(deriveMissionDisplayStatus(mission, new Date("2026-01-01T07:00:00Z"))).toBe("WAITING");
    expect(deriveMissionDisplayStatus(mission, new Date("2026-01-01T10:00:00Z"))).toBe("IN_PROGRESS");
    expect(deriveMissionDisplayStatus(mission, new Date("2026-01-01T12:00:00Z"))).toBe("ARRIVED");
  });

  it("locks operational edits only once SCHEDULED and started", () => {
    const mission = { persistedStatus: "SCHEDULED" as const, startAt, estimatedArrivalAt };
    expect(isMissionOperationallyLocked(mission, new Date("2026-01-01T07:00:00Z"))).toBe(false);
    expect(isMissionOperationallyLocked(mission, new Date("2026-01-01T10:00:00Z"))).toBe(true);
    expect(isMissionOperationallyLocked(mission, new Date("2026-01-01T12:00:00Z"))).toBe(true);
  });

  it("never locks a DRAFT mission", () => {
    const mission = { persistedStatus: "DRAFT" as const, startAt, estimatedArrivalAt };
    expect(isMissionOperationallyLocked(mission, new Date("2026-01-01T10:00:00Z"))).toBe(false);
  });
});

describe("shipmentMatchesDestinationPoint", () => {
  const shipmentWithUnit = { destinationOrganizationUnitId: orgUnitX, destinationLatitude: 35.6892, destinationLongitude: 51.389 };
  const shipmentWithCoords = { destinationOrganizationUnitId: null, destinationLatitude: 35.6892, destinationLongitude: 51.389 };

  it("matches by organization-unit id regardless of coordinate distance", () => {
    const farPoint = { organizationUnitId: orgUnitX, latitude: 10, longitude: 10 };
    expect(shipmentMatchesDestinationPoint(shipmentWithUnit, farPoint, 1000)).toBe(true);
  });

  it("does not match a different organization-unit id even if coordinates happen to be far outside tolerance", () => {
    const otherUnitPoint = { organizationUnitId: "different-unit", latitude: 10, longitude: 10 };
    expect(shipmentMatchesDestinationPoint(shipmentWithUnit, otherUnitPoint, 1000)).toBe(false);
  });

  it("falls back to coordinate distance when no organization-unit id is provided", () => {
    const nearPoint = { organizationUnitId: null, latitude: 35.6893, longitude: 51.3891 };
    expect(shipmentMatchesDestinationPoint(shipmentWithCoords, nearPoint, 1000)).toBe(true);
  });

  it("rejects a coordinate point outside tolerance", () => {
    const farPoint = { organizationUnitId: null, latitude: 36.297, longitude: 59.6062 };
    expect(shipmentMatchesDestinationPoint(shipmentWithCoords, farPoint, 1000)).toBe(false);
  });

  it("still matches by nearby coordinates even when the tapped point has no organization-unit id and the shipment does", () => {
    const nearPoint = { organizationUnitId: null, latitude: 35.6893, longitude: 51.3891 };
    expect(shipmentMatchesDestinationPoint(shipmentWithUnit, nearPoint, 1000)).toBe(true);
  });
});
