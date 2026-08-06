import { describe, expect, it } from "vitest";
import {
  advanceBySpeed,
  clampToRange,
  defaultTimeRange,
  isWithinRange,
  percentForTime,
  stepMinutes,
  timeForPercent,
  type TimeRange,
} from "@/lib/domain/timeline-rules";

const RANGE: TimeRange = { from: new Date("2026-03-10T00:00:00.000Z"), to: new Date("2026-03-11T00:00:00.000Z") };

describe("defaultTimeRange", () => {
  it("T1: resolves to the Tehran calendar day containing the instant, spanning exactly 24h", () => {
    const range = defaultTimeRange(new Date("2026-03-10T08:00:00.000Z"));
    expect(range.to.getTime() - range.from.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(range.from.getTime()).toBeLessThanOrEqual(new Date("2026-03-10T08:00:00.000Z").getTime());
    expect(range.to.getTime()).toBeGreaterThan(new Date("2026-03-10T08:00:00.000Z").getTime());
  });
});

describe("clampToRange", () => {
  it("T2: leaves an in-range time unchanged", () => {
    const t = new Date("2026-03-10T12:00:00.000Z");
    expect(clampToRange(t, RANGE)).toEqual(t);
  });

  it("T3: clamps a time before the range to range.from", () => {
    expect(clampToRange(new Date("2026-03-09T23:00:00.000Z"), RANGE)).toEqual(RANGE.from);
  });

  it("T4: clamps a time after the range to range.to", () => {
    expect(clampToRange(new Date("2026-03-12T00:00:00.000Z"), RANGE)).toEqual(RANGE.to);
  });
});

describe("isWithinRange", () => {
  it("T5: true for a time inside the range, including both boundaries", () => {
    expect(isWithinRange(RANGE.from, RANGE)).toBe(true);
    expect(isWithinRange(RANGE.to, RANGE)).toBe(true);
    expect(isWithinRange(new Date("2026-03-10T12:00:00.000Z"), RANGE)).toBe(true);
  });

  it("T6: false for a time outside the range on either side", () => {
    expect(isWithinRange(new Date("2026-03-09T00:00:00.000Z"), RANGE)).toBe(false);
    expect(isWithinRange(new Date("2026-03-12T00:00:00.000Z"), RANGE)).toBe(false);
  });
});

describe("advanceBySpeed", () => {
  it("T7: advances by exactly elapsedRealMs at 1x speed", () => {
    const start = new Date("2026-03-10T12:00:00.000Z");
    expect(advanceBySpeed(start, 1000, 1)).toEqual(new Date("2026-03-10T12:00:01.000Z"));
  });

  it("T8: scales elapsed time linearly by speed", () => {
    const start = new Date("2026-03-10T12:00:00.000Z");
    expect(advanceBySpeed(start, 1000, 8)).toEqual(new Date("2026-03-10T12:00:08.000Z"));
    expect(advanceBySpeed(start, 1000, 0.25)).toEqual(new Date("2026-03-10T12:00:00.250Z"));
  });

  it("T9: does not clamp — advancing past a conceptual range is the caller's responsibility", () => {
    const start = RANGE.to;
    const advanced = advanceBySpeed(start, 60_000, 1);
    expect(advanced.getTime()).toBeGreaterThan(RANGE.to.getTime());
  });
});

describe("percentForTime / timeForPercent (inverse pair)", () => {
  it("T10: range.from is 0%, range.to is 100%", () => {
    expect(percentForTime(RANGE.from, RANGE)).toBe(0);
    expect(percentForTime(RANGE.to, RANGE)).toBe(100);
  });

  it("T11: the midpoint of the range is 50%", () => {
    const mid = new Date((RANGE.from.getTime() + RANGE.to.getTime()) / 2);
    expect(percentForTime(mid, RANGE)).toBeCloseTo(50, 6);
  });

  it("T12: percentForTime clamps out-of-range instants to 0 or 100", () => {
    expect(percentForTime(new Date("2026-03-09T00:00:00.000Z"), RANGE)).toBe(0);
    expect(percentForTime(new Date("2026-03-12T00:00:00.000Z"), RANGE)).toBe(100);
  });

  it("T13: timeForPercent is the inverse of percentForTime for interior points", () => {
    const t = new Date("2026-03-10T18:00:00.000Z");
    const percent = percentForTime(t, RANGE);
    expect(timeForPercent(percent, RANGE).getTime()).toBeCloseTo(t.getTime(), -1);
  });

  it("T14: timeForPercent clamps out-of-bounds percentages", () => {
    expect(timeForPercent(-10, RANGE)).toEqual(RANGE.from);
    expect(timeForPercent(150, RANGE)).toEqual(RANGE.to);
  });

  it("T15: a zero-length range never divides by zero — percentForTime returns 0", () => {
    const zero: TimeRange = { from: RANGE.from, to: RANGE.from };
    expect(percentForTime(RANGE.from, zero)).toBe(0);
  });
});

describe("stepMinutes", () => {
  it("T16: steps forward by the given number of minutes", () => {
    const t = new Date("2026-03-10T12:00:00.000Z");
    expect(stepMinutes(t, 5, RANGE)).toEqual(new Date("2026-03-10T12:05:00.000Z"));
    expect(stepMinutes(t, 15, RANGE)).toEqual(new Date("2026-03-10T12:15:00.000Z"));
  });

  it("T17: steps backward with a negative value", () => {
    const t = new Date("2026-03-10T12:00:00.000Z");
    expect(stepMinutes(t, -5, RANGE)).toEqual(new Date("2026-03-10T11:55:00.000Z"));
  });

  it("T18: clamps a step that would leave the range", () => {
    expect(stepMinutes(RANGE.to, 5, RANGE)).toEqual(RANGE.to);
    expect(stepMinutes(RANGE.from, -5, RANGE)).toEqual(RANGE.from);
  });
});
