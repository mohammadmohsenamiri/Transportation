import { describe, expect, it } from "vitest";
import { missionCancelSchema, missionCreateSchema, missionDuplicateSchema, missionEstimateSchema } from "@/lib/validation/mission";

const validShipmentId = "11111111-1111-4111-8111-111111111111";
const validVehicleId = "22222222-2222-4222-8222-222222222222";
const futureIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

describe("missionCreateSchema", () => {
  it("accepts a valid payload", () => {
    const result = missionCreateSchema.safeParse({
      shipmentIds: [validShipmentId],
      vehicleId: validVehicleId,
      startAt: futureIso,
      routeId: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty shipment list", () => {
    const result = missionCreateSchema.safeParse({
      shipmentIds: [],
      vehicleId: validVehicleId,
      startAt: futureIso,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid startAt string", () => {
    const result = missionCreateSchema.safeParse({
      shipmentIds: [validShipmentId],
      vehicleId: validVehicleId,
      startAt: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed vehicleId", () => {
    const result = missionCreateSchema.safeParse({
      shipmentIds: [validShipmentId],
      vehicleId: "not-a-uuid",
      startAt: futureIso,
    });
    expect(result.success).toBe(false);
  });
});

describe("missionCancelSchema", () => {
  it("requires a non-empty cancellation reason", () => {
    expect(missionCancelSchema.safeParse({ version: 0, cancellationReason: "" }).success).toBe(false);
    expect(missionCancelSchema.safeParse({ version: 0, cancellationReason: "تغییر برنامه" }).success).toBe(true);
  });

  /**
   * Phase 15 (V-03) — `version` اجباری شد؛ تغییر شکننده و عمدی در قرارداد (ADR-P15-05).
   * حذف آن باید ۴۲۲ بدهد، نه موفقیت بی‌صدا — چون همان حالت است که بازنویسی خاموش را ممکن می‌کرد.
   */
  it("رد می‌کند وقتی توکن نسخه ارسال نشده باشد", () => {
    expect(missionCancelSchema.safeParse({ cancellationReason: "تغییر برنامه" }).success).toBe(false);
    expect(missionCancelSchema.safeParse({ version: -1, cancellationReason: "تغییر برنامه" }).success).toBe(false);
  });
});

describe("missionDuplicateSchema", () => {
  it("requires a valid startAt", () => {
    expect(missionDuplicateSchema.safeParse({ startAt: futureIso }).success).toBe(true);
    expect(missionDuplicateSchema.safeParse({ startAt: "invalid" }).success).toBe(false);
    expect(missionDuplicateSchema.safeParse({}).success).toBe(false);
  });
});

describe("missionEstimateSchema", () => {
  it("accepts a valid estimate request", () => {
    const result = missionEstimateSchema.safeParse({
      originLatitude: 35.6892,
      originLongitude: 51.389,
      destinationLatitude: 36.297,
      destinationLongitude: 59.6062,
      speedKmh: 80,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-positive speed", () => {
    const result = missionEstimateSchema.safeParse({
      originLatitude: 35.6892,
      originLongitude: 51.389,
      destinationLatitude: 36.297,
      destinationLongitude: 59.6062,
      speedKmh: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range coordinates", () => {
    const result = missionEstimateSchema.safeParse({
      originLatitude: 999,
      originLongitude: 51.389,
      destinationLatitude: 36.297,
      destinationLongitude: 59.6062,
      speedKmh: 80,
    });
    expect(result.success).toBe(false);
  });
});
