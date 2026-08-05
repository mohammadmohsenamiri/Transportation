import { describe, expect, it } from "vitest";
import { computeRouteDistances, haversineDistanceMeters } from "@/lib/geo/distance";

describe("haversineDistanceMeters", () => {
  it("returns zero for identical points", () => {
    expect(haversineDistanceMeters({ latitude: 35.6892, longitude: 51.389 }, { latitude: 35.6892, longitude: 51.389 })).toBe(0);
  });

  it("is symmetric", () => {
    const a = { latitude: 35.6892, longitude: 51.389 };
    const b = { latitude: 35.72, longitude: 51.35 };
    expect(haversineDistanceMeters(a, b)).toBeCloseTo(haversineDistanceMeters(b, a), 6);
  });

  it("approximates ~111.2km for one degree of latitude at the equator", () => {
    const distance = haversineDistanceMeters({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    expect(distance).toBeGreaterThan(110500);
    expect(distance).toBeLessThan(111500);
  });

  it("matches known Tehran-Mashhad approximate great-circle distance", () => {
    const tehran = { latitude: 35.6892, longitude: 51.389 };
    const mashhad = { latitude: 36.297, longitude: 59.6062 };
    const distance = haversineDistanceMeters(tehran, mashhad);
    // فاصله واقعی geodesic حدود ۷۴۰ کیلومتر است؛ tolerance برای تقریب کروی زمین
    expect(distance).toBeGreaterThan(700_000);
    expect(distance).toBeLessThan(780_000);
  });
});

describe("computeRouteDistances", () => {
  it("returns empty result for no points", () => {
    expect(computeRouteDistances([])).toEqual({ cumulativeDistancesMeters: [], totalDistanceMeters: 0 });
  });

  it("returns a single zero cumulative entry for one point", () => {
    const result = computeRouteDistances([{ latitude: 35.6892, longitude: 51.389 }]);
    expect(result.cumulativeDistancesMeters).toEqual([0]);
    expect(result.totalDistanceMeters).toBe(0);
  });

  it("accumulates distance monotonically across segments", () => {
    const points = [
      { latitude: 35.6892, longitude: 51.389 },
      { latitude: 35.7219, longitude: 51.3347 },
      { latitude: 35.84, longitude: 50.9391 },
    ];
    const result = computeRouteDistances(points);
    expect(result.cumulativeDistancesMeters).toHaveLength(3);
    expect(result.cumulativeDistancesMeters[0]).toBe(0);
    expect(result.cumulativeDistancesMeters[1]).toBeGreaterThan(0);
    expect(result.cumulativeDistancesMeters[2]).toBeGreaterThan(result.cumulativeDistancesMeters[1]);
    expect(result.totalDistanceMeters).toBe(result.cumulativeDistancesMeters[2]);
  });
});
