import { describe, expect, it } from "vitest";
import { haversineDistanceMeters, type GeoPoint } from "@/lib/geo/distance";
import {
  calculateMissionGeometry,
  simulateMissionPosition,
  type MissionGeometryInput,
  type MissionSnapshot,
  type SimulationRoutePoint,
} from "@/lib/domain/mission-simulation";

const ORIGIN: GeoPoint = { latitude: 35.6892, longitude: 51.389 };
const DESTINATION: GeoPoint = { latitude: 35.84, longitude: 50.9391 };
const START_AT = new Date("2026-01-01T08:00:00.000Z");
const SPEED_KMH = 80;

function baseInput(overrides: Partial<MissionGeometryInput> = {}): MissionGeometryInput {
  return {
    viewTime: START_AT,
    startAt: START_AT,
    speedKmh: SPEED_KMH,
    origin: ORIGIN,
    destination: DESTINATION,
    ...overrides,
  };
}

function etaFor(input: MissionGeometryInput): Date {
  return calculateMissionGeometry({ ...input, viewTime: input.startAt }).estimatedArrivalAt;
}

function buildRoute(points: GeoPoint[]): SimulationRoutePoint[] {
  let cumulative = 0;
  return points.map((p, i) => {
    if (i > 0) cumulative += haversineDistanceMeters(points[i - 1], p);
    return { sequence: i, latitude: p.latitude, longitude: p.longitude, cumulativeDistanceMeters: cumulative };
  });
}

describe("calculateMissionGeometry", () => {
  it("U1: before departure, position is origin and progress is zero", () => {
    const input = baseInput({ viewTime: new Date(START_AT.getTime() - 3600_000) });
    const result = calculateMissionGeometry(input);
    expect(result.traveledMeters).toBe(0);
    expect(result.progressRatio).toBe(0);
    expect(result.position.latitude).toBeCloseTo(ORIGIN.latitude, 6);
    expect(result.position.longitude).toBeCloseTo(ORIGIN.longitude, 6);
    expect(result.isFallbackDirect).toBe(true);
  });

  it("U2: exactly at startAt is treated as not yet departed", () => {
    const result = calculateMissionGeometry(baseInput({ viewTime: START_AT }));
    expect(result.traveledMeters).toBe(0);
    expect(result.progressRatio).toBe(0);
  });

  it("U3: midpoint of a direct trip has ~50% progress and a plausible position", () => {
    const eta = etaFor(baseInput());
    const midTime = new Date((START_AT.getTime() + eta.getTime()) / 2);
    const result = calculateMissionGeometry(baseInput({ viewTime: midTime }));
    expect(result.progressRatio).toBeCloseTo(0.5, 2);
    expect(result.position.latitude).toBeGreaterThan(Math.min(ORIGIN.latitude, DESTINATION.latitude));
    expect(result.position.latitude).toBeLessThan(Math.max(ORIGIN.latitude, DESTINATION.latitude));
  });

  it("U4: exactly at ETA, mission has arrived", () => {
    const eta = etaFor(baseInput());
    const result = calculateMissionGeometry(baseInput({ viewTime: eta }));
    // toBeCloseTo, not toBe: estimatedArrivalAt is reconstructed through a millisecond-precision
    // Date, which can lose sub-millisecond duration on the round trip (05-IMPLEMENTATION.md §11).
    expect(result.progressRatio).toBeCloseTo(1, 6);
    // meter-scale values, not ratios: sub-millisecond Date rounding can leave a few mm of slack
    expect(result.traveledMeters).toBeCloseTo(result.totalDistanceMeters, 1);
    expect(result.remainingMeters).toBeCloseTo(0, 1);
    expect(result.remainingSeconds).toBe(0);
    expect(result.position.latitude).toBeCloseTo(DESTINATION.latitude, 6);
    expect(result.position.longitude).toBeCloseTo(DESTINATION.longitude, 6);
  });

  it("U5: long after ETA stays clamped at arrival with no overflow", () => {
    const eta = etaFor(baseInput());
    const result = calculateMissionGeometry(baseInput({ viewTime: new Date(eta.getTime() + 10 * 24 * 3600_000) }));
    expect(result.progressRatio).toBe(1);
    expect(result.remainingMeters).toBeCloseTo(0, 6);
    expect(result.remainingSeconds).toBe(0);
  });

  it("U6: zero-distance mission always reports full progress and null bearing", () => {
    const result = calculateMissionGeometry(baseInput({ destination: ORIGIN, viewTime: new Date(START_AT.getTime() - 1000) }));
    expect(result.totalDistanceMeters).toBe(0);
    expect(result.progressRatio).toBe(1);
    expect(result.bearingDegrees).toBeNull();
    expect(result.position.latitude).toBeCloseTo(ORIGIN.latitude, 6);
  });

  it("U7: a real 2-point route matching origin/destination is not flagged as fallback", () => {
    const routePoints = buildRoute([ORIGIN, DESTINATION]);
    const result = calculateMissionGeometry(baseInput({ routePoints, viewTime: START_AT }));
    expect(result.isFallbackDirect).toBe(false);
  });

  it("U8: a route with exactly 1 point falls back to direct", () => {
    const routePoints: SimulationRoutePoint[] = [{ sequence: 0, latitude: 10, longitude: 10, cumulativeDistanceMeters: 0 }];
    const result = calculateMissionGeometry(baseInput({ routePoints }));
    expect(result.isFallbackDirect).toBe(true);
    expect(result.position.latitude).toBeCloseTo(ORIGIN.latitude, 6);
  });

  it("U9: an empty route array falls back to direct", () => {
    const result = calculateMissionGeometry(baseInput({ routePoints: [] }));
    expect(result.isFallbackDirect).toBe(true);
  });

  it("U10: position at an exact segment boundary matches that route point", () => {
    const waypoints: GeoPoint[] = [ORIGIN, { latitude: 35.75, longitude: 51.2 }, { latitude: 35.79, longitude: 51.0 }, DESTINATION];
    const routePoints = buildRoute(waypoints);
    const boundaryDistance = routePoints[2].cumulativeDistanceMeters;
    const speedMps = (SPEED_KMH * 1000) / 3600;
    const viewTime = new Date(START_AT.getTime() + (boundaryDistance / speedMps) * 1000);
    const result = calculateMissionGeometry(baseInput({ routePoints, viewTime }));
    expect(result.position.latitude).toBeCloseTo(waypoints[2].latitude, 5);
    expect(result.position.longitude).toBeCloseTo(waypoints[2].longitude, 5);
  });

  it("U11: position strictly inside a segment is linearly interpolated", () => {
    const waypoints: GeoPoint[] = [ORIGIN, { latitude: 35.75, longitude: 51.2 }, DESTINATION];
    const routePoints = buildRoute(waypoints);
    const segmentStart = routePoints[0].cumulativeDistanceMeters;
    const segmentEnd = routePoints[1].cumulativeDistanceMeters;
    const halfway = (segmentStart + segmentEnd) / 2;
    const speedMps = (SPEED_KMH * 1000) / 3600;
    const viewTime = new Date(START_AT.getTime() + (halfway / speedMps) * 1000);
    const result = calculateMissionGeometry(baseInput({ routePoints, viewTime }));
    expect(result.position.latitude).toBeCloseTo((waypoints[0].latitude + waypoints[1].latitude) / 2, 5);
    expect(result.position.longitude).toBeCloseTo((waypoints[0].longitude + waypoints[1].longitude) / 2, 5);
  });

  it("U12: bearing due north is ~0 degrees", () => {
    const routePoints = buildRoute([{ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 }]);
    const total = routePoints[1].cumulativeDistanceMeters;
    const speedMps = (SPEED_KMH * 1000) / 3600;
    const viewTime = new Date(START_AT.getTime() + ((total / 2) / speedMps) * 1000);
    const result = calculateMissionGeometry(baseInput({ routePoints, viewTime }));
    expect(result.bearingDegrees).toBeCloseTo(0, 0);
  });

  it("U13: bearing due east is ~90 degrees", () => {
    const routePoints = buildRoute([{ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }]);
    const total = routePoints[1].cumulativeDistanceMeters;
    const speedMps = (SPEED_KMH * 1000) / 3600;
    const viewTime = new Date(START_AT.getTime() + ((total / 2) / speedMps) * 1000);
    const result = calculateMissionGeometry(baseInput({ routePoints, viewTime }));
    expect(result.bearingDegrees).toBeCloseTo(90, 0);
  });

  it("U14: bearing due south is ~180 degrees", () => {
    const routePoints = buildRoute([{ latitude: 1, longitude: 0 }, { latitude: 0, longitude: 0 }]);
    const total = routePoints[1].cumulativeDistanceMeters;
    const speedMps = (SPEED_KMH * 1000) / 3600;
    const viewTime = new Date(START_AT.getTime() + ((total / 2) / speedMps) * 1000);
    const result = calculateMissionGeometry(baseInput({ routePoints, viewTime }));
    expect(result.bearingDegrees).toBeCloseTo(180, 0);
  });

  it("U15: bearing due west is ~270 degrees", () => {
    const routePoints = buildRoute([{ latitude: 0, longitude: 1 }, { latitude: 0, longitude: 0 }]);
    const total = routePoints[1].cumulativeDistanceMeters;
    const speedMps = (SPEED_KMH * 1000) / 3600;
    const viewTime = new Date(START_AT.getTime() + ((total / 2) / speedMps) * 1000);
    const result = calculateMissionGeometry(baseInput({ routePoints, viewTime }));
    expect(result.bearingDegrees).toBeCloseTo(270, 0);
  });

  it("U16: a duplicate mid-route point does not break bearing (resolves past the zero-length tie)", () => {
    const p0 = { latitude: 0, longitude: 0 };
    const p1 = { latitude: 0, longitude: 1 }; // cumulative 5-ish (real Haversine distance)
    const p2 = p1; // duplicate of p1 -> zero-length segment between index 1 and 2
    const p3 = { latitude: 0, longitude: 2 };
    const routePoints = buildRoute([p0, p1, p2, p3]);
    const boundaryDistance = routePoints[1].cumulativeDistanceMeters; // == routePoints[2].cumulativeDistanceMeters
    const speedMps = (SPEED_KMH * 1000) / 3600;
    const viewTime = new Date(START_AT.getTime() + (boundaryDistance / speedMps) * 1000);
    const result = calculateMissionGeometry(baseInput({ routePoints, viewTime }));
    expect(result.bearingDegrees).not.toBeNull();
    expect(result.bearingDegrees).toBeCloseTo(90, 0); // heading east, like U13
  });

  it("U17: arrival at a route whose final points are all coincident yields null bearing", () => {
    const p0 = { latitude: 0, longitude: 0 };
    const p1 = { latitude: 0, longitude: 1 };
    const p2 = p1;
    const routePoints = buildRoute([p0, p1, p2]);
    const total = routePoints[2].cumulativeDistanceMeters;
    const speedMps = (SPEED_KMH * 1000) / 3600;
    // 1s safely past the exact ETA so the traveled-distance clamp reliably engages regardless of
    // millisecond-rounding through the Date round trip (see U4's precision note).
    const viewTime = new Date(START_AT.getTime() + (total / speedMps) * 1000 + 1000);
    const result = calculateMissionGeometry(baseInput({ routePoints, viewTime }));
    expect(result.progressRatio).toBe(1);
    expect(result.bearingDegrees).toBeNull();
  });

  it("U18: zero speed with viewTime after start is treated as immediate arrival", () => {
    const result = calculateMissionGeometry(baseInput({ speedKmh: 0, viewTime: new Date(START_AT.getTime() + 1000) }));
    expect(result.estimatedArrivalAt.getTime()).toBe(START_AT.getTime());
    expect(result.progressRatio).toBe(1);
  });

  it("U19: zero speed with viewTime at or before start reports zero progress", () => {
    const result = calculateMissionGeometry(baseInput({ speedKmh: 0, viewTime: START_AT }));
    expect(result.progressRatio).toBe(0);
  });

  it("U20: determinism — repeated calls with equal input return deep-equal output", () => {
    const input = baseInput({ viewTime: new Date(START_AT.getTime() + 1800_000) });
    const a = calculateMissionGeometry({ ...input });
    const b = calculateMissionGeometry({ ...input });
    expect(a).toEqual(b);
  });

  it("U21: result depends only on explicit input, never on the ambient clock", () => {
    const input = baseInput({ viewTime: new Date(START_AT.getTime() + 1800_000) });
    const before = calculateMissionGeometry(input);
    // simulate "time passing" by simply calling again later in wall-clock terms — no ambient clock read exists
    const after = calculateMissionGeometry(input);
    expect(before).toEqual(after);
  });

  it("U22: traveledMeters + remainingMeters equals totalDistanceMeters", () => {
    const eta = etaFor(baseInput());
    const midTime = new Date((START_AT.getTime() + eta.getTime()) / 2);
    const result = calculateMissionGeometry(baseInput({ viewTime: midTime }));
    expect(result.traveledMeters + result.remainingMeters).toBeCloseTo(result.totalDistanceMeters, 6);
  });

  it("U23: a 10,000-point route resolves quickly and correctly", () => {
    const points: GeoPoint[] = [];
    for (let i = 0; i < 10_000; i += 1) {
      points.push({ latitude: 35 + i * 0.0001, longitude: 51 + i * 0.0001 });
    }
    const routePoints = buildRoute(points);
    const total = routePoints[routePoints.length - 1].cumulativeDistanceMeters;
    const speedMps = (SPEED_KMH * 1000) / 3600;
    const viewTime = new Date(START_AT.getTime() + ((total / 2) / speedMps) * 1000);

    const start = performance.now();
    const result = calculateMissionGeometry(baseInput({ routePoints, viewTime }));
    const elapsed = performance.now() - start;

    expect(result.progressRatio).toBeCloseTo(0.5, 2);
    expect(elapsed).toBeLessThan(5);
  });
});

describe("calculateMissionGeometry — boundary cases", () => {
  it("B1: exact cumulative-distance boundary yields exact point coordinates", () => {
    const waypoints: GeoPoint[] = [ORIGIN, { latitude: 35.75, longitude: 51.2 }, DESTINATION];
    const routePoints = buildRoute(waypoints);
    const boundary = routePoints[1].cumulativeDistanceMeters;
    const speedMps = (SPEED_KMH * 1000) / 3600;
    const viewTime = new Date(START_AT.getTime() + (boundary / speedMps) * 1000);
    const result = calculateMissionGeometry(baseInput({ routePoints, viewTime }));
    expect(result.position.latitude).toBeCloseTo(waypoints[1].latitude, 5);
    expect(result.position.longitude).toBeCloseTo(waypoints[1].longitude, 5);
  });

  it("B2: a genuine 2-point route is distinguished from the fallback case via isFallbackDirect", () => {
    const routePoints = buildRoute([ORIGIN, DESTINATION]);
    const real = calculateMissionGeometry(baseInput({ routePoints, viewTime: START_AT }));
    const fallback = calculateMissionGeometry(baseInput({ viewTime: START_AT }));
    expect(real.isFallbackDirect).toBe(false);
    expect(fallback.isFallbackDirect).toBe(true);
  });

  it("B3: progressRatio never leaves [0, 1] across a wide range of view times", () => {
    const eta = etaFor(baseInput());
    const samples = [
      new Date(START_AT.getTime() - 1000 * 24 * 3600_000),
      START_AT,
      new Date((START_AT.getTime() + eta.getTime()) / 2),
      eta,
      new Date(eta.getTime() + 1000 * 24 * 3600_000),
    ];
    for (const viewTime of samples) {
      const result = calculateMissionGeometry(baseInput({ viewTime }));
      expect(result.progressRatio).toBeGreaterThanOrEqual(0);
      expect(result.progressRatio).toBeLessThanOrEqual(1);
    }
  });
});

describe("calculateMissionGeometry — negative / invalid input", () => {
  it("N1: unsorted routePoints is an undefined-behavior precondition, not a thrown error", () => {
    const routePoints: SimulationRoutePoint[] = [
      { sequence: 1, latitude: 1, longitude: 1, cumulativeDistanceMeters: 500 },
      { sequence: 0, latitude: 0, longitude: 0, cumulativeDistanceMeters: 0 },
    ];
    expect(() => calculateMissionGeometry(baseInput({ routePoints, viewTime: START_AT }))).not.toThrow();
  });

  it("N2: negative speed is treated the same as zero speed", () => {
    const zero = calculateMissionGeometry(baseInput({ speedKmh: 0, viewTime: new Date(START_AT.getTime() + 1000) }));
    const negative = calculateMissionGeometry(baseInput({ speedKmh: -10, viewTime: new Date(START_AT.getTime() + 1000) }));
    expect(negative).toEqual(zero);
  });
});

function baseSnapshot(overrides: Partial<MissionSnapshot> = {}): MissionSnapshot {
  const eta = etaFor(baseInput());
  return {
    startAt: START_AT,
    estimatedArrivalAt: eta,
    speedKmh: SPEED_KMH,
    persistedStatus: "SCHEDULED",
    cancelledAt: null,
    origin: ORIGIN,
    destination: DESTINATION,
    ...overrides,
  };
}

describe("simulateMissionPosition", () => {
  it("S1: DRAFT mission reports DRAFT status while still computing geometry", () => {
    const snapshot = baseSnapshot({ persistedStatus: "DRAFT" });
    const result = simulateMissionPosition(snapshot, new Date(START_AT.getTime() + 1800_000));
    expect(result.status).toBe("DRAFT");
    expect(result.progressRatio).toBeGreaterThan(0);
  });

  it("S2: SCHEDULED before start reports WAITING", () => {
    const snapshot = baseSnapshot();
    const result = simulateMissionPosition(snapshot, new Date(START_AT.getTime() - 1000));
    expect(result.status).toBe("WAITING");
  });

  it("S3: SCHEDULED mid-trip reports IN_PROGRESS", () => {
    const snapshot = baseSnapshot();
    const midTime = new Date((START_AT.getTime() + snapshot.estimatedArrivalAt.getTime()) / 2);
    const result = simulateMissionPosition(snapshot, midTime);
    expect(result.status).toBe("IN_PROGRESS");
  });

  it("S4: SCHEDULED at/after ETA reports ARRIVED", () => {
    const snapshot = baseSnapshot();
    const result = simulateMissionPosition(snapshot, snapshot.estimatedArrivalAt);
    expect(result.status).toBe("ARRIVED");
  });

  it("S5: CANCELLED after cancellation freezes geometry at the cancellation instant", () => {
    const snapshot = baseSnapshot();
    const cancelledAt = new Date((START_AT.getTime() + snapshot.estimatedArrivalAt.getTime()) / 2);
    const cancelled = baseSnapshot({ persistedStatus: "CANCELLED", cancelledAt });
    const atCancellation = simulateMissionPosition({ ...cancelled, persistedStatus: "SCHEDULED" }, cancelledAt);
    const wellAfter = simulateMissionPosition(cancelled, new Date(cancelledAt.getTime() + 3600_000));

    expect(wellAfter.status).toBe("CANCELLED");
    expect(wellAfter.progressRatio).toBeCloseTo(atCancellation.progressRatio, 6);
    expect(wellAfter.traveledMeters).toBeCloseTo(atCancellation.traveledMeters, 6);
  });

  it("S6: CANCELLED before the cancellation instant computes geometry at viewTime directly", () => {
    const snapshot = baseSnapshot();
    const cancelledAt = new Date(snapshot.estimatedArrivalAt.getTime() - 1000);
    const cancelled = baseSnapshot({ persistedStatus: "CANCELLED", cancelledAt });
    const beforeCancellation = new Date((START_AT.getTime() + cancelledAt.getTime()) / 2);
    const result = simulateMissionPosition(cancelled, beforeCancellation);
    expect(result.status).toBe("CANCELLED");
    expect(result.progressRatio).toBeGreaterThan(0);
    expect(result.progressRatio).toBeLessThan(1);
  });

  it("S7: CANCELLED with cancelledAt null applies no clamping (defensive path)", () => {
    const snapshot = baseSnapshot({ persistedStatus: "CANCELLED", cancelledAt: null });
    const viewTime = new Date((START_AT.getTime() + snapshot.estimatedArrivalAt.getTime()) / 2);
    const result = simulateMissionPosition(snapshot, viewTime);
    expect(result.status).toBe("CANCELLED");
    expect(result.progressRatio).toBeCloseTo(0.5, 2);
  });

  it("S8: ARCHIVED freezes geometry at arrival regardless of requested viewTime", () => {
    const snapshot = baseSnapshot({ persistedStatus: "ARCHIVED" });
    const result = simulateMissionPosition(snapshot, START_AT);
    expect(result.status).toBe("ARCHIVED");
    expect(result.progressRatio).toBeCloseTo(1, 6);
  });

  it("S9: isEstimated is always the literal true", () => {
    const result = simulateMissionPosition(baseSnapshot(), START_AT);
    expect(result.isEstimated).toBe(true);
  });

  it("S10: status derivation matches an independent call to deriveMissionDisplayStatus semantics", async () => {
    const { deriveMissionDisplayStatus } = await import("@/lib/domain/mission-rules");
    const snapshot = baseSnapshot();
    const viewTime = new Date((START_AT.getTime() + snapshot.estimatedArrivalAt.getTime()) / 2);
    const expected = deriveMissionDisplayStatus(
      { persistedStatus: snapshot.persistedStatus, startAt: snapshot.startAt, estimatedArrivalAt: snapshot.estimatedArrivalAt },
      viewTime,
    );
    const result = simulateMissionPosition(snapshot, viewTime);
    expect(result.status).toBe(expected);
  });
});

describe("calculateMissionGeometry — memory", () => {
  it("M1: repeated calls do not retain state across invocations", () => {
    const input = baseInput({ viewTime: new Date(START_AT.getTime() + 1800_000) });
    const first = calculateMissionGeometry({ ...input });
    for (let i = 0; i < 100_000; i += 1) {
      calculateMissionGeometry({ ...input, viewTime: new Date(START_AT.getTime() + i) });
    }
    const last = calculateMissionGeometry({ ...input });
    expect(last).toEqual(first);
  });
});

describe("calculateMissionGeometry — concurrency", () => {
  it("C1: interleaved calls with different inputs do not interfere with each other", async () => {
    const eta = etaFor(baseInput());
    const inputs = Array.from({ length: 50 }, (_, i) =>
      baseInput({ viewTime: new Date(START_AT.getTime() + (i / 50) * (eta.getTime() - START_AT.getTime())) }),
    );
    const concurrent = await Promise.all(inputs.map((input) => Promise.resolve(calculateMissionGeometry(input))));
    const sequential = inputs.map((input) => calculateMissionGeometry(input));
    expect(concurrent).toEqual(sequential);
  });
});
