import { describe, expect, it } from "vitest";
import { estimateMission } from "@/lib/domain/mission-estimate";

const tehran = { latitude: 35.6892, longitude: 51.389 };
const mashhad = { latitude: 36.297, longitude: 59.6062 };

describe("estimateMission", () => {
  it("falls back to direct geodesic distance when no route is given", () => {
    const result = estimateMission({ origin: tehran, destination: mashhad, speedKmh: 80 });
    expect(result.isFallbackDirect).toBe(true);
    expect(result.distanceMeters).toBeGreaterThan(700_000);
    expect(result.durationSeconds).toBeCloseTo(result.distanceMeters / ((80 * 1000) / 3600), 3);
  });

  it("uses the route polyline distance when route points are given", () => {
    const routePoints = [tehran, { latitude: 35.9, longitude: 55 }, mashhad];
    const result = estimateMission({ origin: tehran, destination: mashhad, speedKmh: 80, routePoints });
    expect(result.isFallbackDirect).toBe(false);
    const direct = estimateMission({ origin: tehran, destination: mashhad, speedKmh: 80 });
    // مسیر با نقطه میانی باید حداقل به‌اندازه خط مستقیم طول بکشد
    expect(result.distanceMeters).toBeGreaterThanOrEqual(direct.distanceMeters);
  });

  it("computes zero duration for zero speed without throwing", () => {
    const result = estimateMission({ origin: tehran, destination: mashhad, speedKmh: 0 });
    expect(result.durationSeconds).toBe(0);
  });

  it("computes fuel estimate only when consumption is provided", () => {
    const withFuel = estimateMission({ origin: tehran, destination: mashhad, speedKmh: 80, fuelConsumptionPer100Km: 25 });
    expect(withFuel.estimatedFuelLiters).not.toBeNull();
    expect(withFuel.estimatedFuelLiters).toBeCloseTo((withFuel.distanceMeters / 1000) * 0.25, 3);

    const withoutFuel = estimateMission({ origin: tehran, destination: mashhad, speedKmh: 80 });
    expect(withoutFuel.estimatedFuelLiters).toBeNull();
  });

  it("is deterministic for identical inputs", () => {
    const input = { origin: tehran, destination: mashhad, speedKmh: 70 };
    expect(estimateMission(input)).toEqual(estimateMission(input));
  });
});
