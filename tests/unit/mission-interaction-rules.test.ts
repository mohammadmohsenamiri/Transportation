import { describe, expect, it } from "vitest";
import {
  EMPTY_MISSION_FILTER_STATE,
  isMissionFilterActive,
  isMissionOverdue,
  missionMatchesFilter,
  missionMatchesQuery,
  resolveTimePresetRange,
  selectVisibleMissions,
  sortMissionRows,
  type MissionFilterState,
} from "@/lib/domain/mission-interaction-rules";
import type { MapSceneMission } from "@/features/map/types";

const NOW = new Date("2026-03-10T08:00:00.000Z");

function mission(overrides: Partial<MapSceneMission> = {}): MapSceneMission {
  return {
    missionId: "m1",
    code: "MS-0001",
    vehicleId: "v1",
    vehicleIdentifier: "12-A-345",
    vehicleTypeName: "کامیونت",
    status: "IN_PROGRESS",
    position: { latitude: 35.7, longitude: 51.3 },
    bearingDegrees: 90,
    progressRatio: 0.4,
    isFallbackDirect: false,
    isEstimated: true,
    startAt: "2026-03-10T06:00:00.000Z",
    estimatedArrivalAt: "2026-03-10T10:00:00.000Z",
    remainingSeconds: 7200,
    originTitle: "انبار تهران",
    originLatitude: 35.6892,
    originLongitude: 51.389,
    destinationTitle: "انبار تبریز",
    destinationLatitude: 38.08,
    destinationLongitude: 46.29,
    routeId: null,
    cargoTypeNames: ["الکترونیک"],
    shipmentCount: 1,
    shipmentTrackingCodes: ["TRK-1001"],
    ...overrides,
  };
}

describe("isMissionFilterActive", () => {
  it("F1: empty filter state is not active", () => {
    expect(isMissionFilterActive(EMPTY_MISSION_FILTER_STATE)).toBe(false);
  });

  it("F2: any non-default field makes the filter active", () => {
    expect(isMissionFilterActive({ ...EMPTY_MISSION_FILTER_STATE, originQuery: "تهران" })).toBe(true);
    expect(isMissionFilterActive({ ...EMPTY_MISSION_FILTER_STATE, activeOnly: true })).toBe(true);
    expect(isMissionFilterActive({ ...EMPTY_MISSION_FILTER_STATE, status: "ARRIVED" })).toBe(true);
  });
});

describe("resolveTimePresetRange", () => {
  it("F3: ALL has no bounds", () => {
    expect(resolveTimePresetRange("ALL", NOW)).toEqual({ from: null, to: null });
  });

  it("F4: NEXT_24H is [now, now+24h)", () => {
    const { from, to } = resolveTimePresetRange("NEXT_24H", NOW);
    expect(from).toEqual(NOW);
    expect(to).toEqual(new Date(NOW.getTime() + 24 * 60 * 60 * 1000));
  });

  it("F5: TODAY resolves to the Tehran calendar day containing `now`, not the UTC day", () => {
    // 2026-03-10T08:00:00Z + 3:30 تهران = 2026-03-10 11:30 محلی؛ همان روز شمسی
    const { from, to } = resolveTimePresetRange("TODAY", NOW);
    expect(from!.getTime()).toBeLessThanOrEqual(NOW.getTime());
    expect(to!.getTime()).toBeGreaterThan(NOW.getTime());
    expect(to!.getTime() - from!.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe("isMissionOverdue", () => {
  it("F6: IN_PROGRESS mission with ETA in the past is overdue", () => {
    const m = mission({ status: "IN_PROGRESS", estimatedArrivalAt: "2026-03-10T07:00:00.000Z" });
    expect(isMissionOverdue(m, NOW)).toBe(true);
  });

  it("F7: WAITING mission with future ETA is not overdue", () => {
    const m = mission({ status: "WAITING", estimatedArrivalAt: "2026-03-10T09:00:00.000Z" });
    expect(isMissionOverdue(m, NOW)).toBe(false);
  });

  it("F8: ARRIVED mission is never overdue even if ETA is in the past", () => {
    const m = mission({ status: "ARRIVED", estimatedArrivalAt: "2026-03-10T07:00:00.000Z" });
    expect(isMissionOverdue(m, NOW)).toBe(false);
  });

  it("F9: CANCELLED mission is never overdue", () => {
    const m = mission({ status: "CANCELLED", estimatedArrivalAt: "2026-03-10T07:00:00.000Z" });
    expect(isMissionOverdue(m, NOW)).toBe(false);
  });
});

describe("missionMatchesFilter", () => {
  it("F10: origin query matches case-insensitively and by substring", () => {
    const m = mission({ originTitle: "انبار مرکزی تهران" });
    expect(missionMatchesFilter(m, { ...EMPTY_MISSION_FILTER_STATE, originQuery: "تهران" }, NOW)).toBe(true);
    expect(missionMatchesFilter(m, { ...EMPTY_MISSION_FILTER_STATE, originQuery: "شیراز" }, NOW)).toBe(false);
  });

  it("F11: destination query filters independently of origin query", () => {
    const m = mission({ destinationTitle: "انبار تبریز" });
    expect(missionMatchesFilter(m, { ...EMPTY_MISSION_FILTER_STATE, destinationQuery: "تبریز" }, NOW)).toBe(true);
    expect(missionMatchesFilter(m, { ...EMPTY_MISSION_FILTER_STATE, destinationQuery: "اصفهان" }, NOW)).toBe(false);
  });

  it("F12: vehicle type filter is an exact match", () => {
    const m = mission({ vehicleTypeName: "کامیونت" });
    expect(missionMatchesFilter(m, { ...EMPTY_MISSION_FILTER_STATE, vehicleTypeName: "کامیونت" }, NOW)).toBe(true);
    expect(missionMatchesFilter(m, { ...EMPTY_MISSION_FILTER_STATE, vehicleTypeName: "وانت" }, NOW)).toBe(false);
  });

  it("F13: status filter is an exact match against display status", () => {
    const m = mission({ status: "WAITING" });
    expect(missionMatchesFilter(m, { ...EMPTY_MISSION_FILTER_STATE, status: "WAITING" }, NOW)).toBe(true);
    expect(missionMatchesFilter(m, { ...EMPTY_MISSION_FILTER_STATE, status: "ARRIVED" }, NOW)).toBe(false);
  });

  it("F14: activeOnly keeps only IN_PROGRESS missions", () => {
    expect(missionMatchesFilter(mission({ status: "IN_PROGRESS" }), { ...EMPTY_MISSION_FILTER_STATE, activeOnly: true }, NOW)).toBe(true);
    expect(missionMatchesFilter(mission({ status: "WAITING" }), { ...EMPTY_MISSION_FILTER_STATE, activeOnly: true }, NOW)).toBe(false);
  });

  it("F15: startAt preset excludes missions starting outside the window", () => {
    const soon = mission({ startAt: new Date(NOW.getTime() + 60 * 60 * 1000).toISOString() });
    const later = mission({ startAt: new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() });
    const filter: MissionFilterState = { ...EMPTY_MISSION_FILTER_STATE, startAtPreset: "NEXT_24H" };
    expect(missionMatchesFilter(soon, filter, NOW)).toBe(true);
    expect(missionMatchesFilter(later, filter, NOW)).toBe(false);
  });

  it("F16: OVERDUE eta preset matches only overdue missions", () => {
    const overdue = mission({ status: "IN_PROGRESS", estimatedArrivalAt: "2026-03-10T07:00:00.000Z" });
    const onTime = mission({ status: "IN_PROGRESS", estimatedArrivalAt: "2026-03-10T09:00:00.000Z" });
    const filter: MissionFilterState = { ...EMPTY_MISSION_FILTER_STATE, etaPreset: "OVERDUE" };
    expect(missionMatchesFilter(overdue, filter, NOW)).toBe(true);
    expect(missionMatchesFilter(onTime, filter, NOW)).toBe(false);
  });

  it("F17: multiple filters combine with AND — all must match", () => {
    const m = mission({ originTitle: "انبار تهران", vehicleTypeName: "کامیونت", status: "IN_PROGRESS" });
    const filter: MissionFilterState = { ...EMPTY_MISSION_FILTER_STATE, originQuery: "تهران", vehicleTypeName: "وانت" };
    expect(missionMatchesFilter(m, filter, NOW)).toBe(false); // مبدأ درست، نوع خودرو غلط → کل فیلتر رد می‌شود
  });
});

describe("missionMatchesQuery", () => {
  it("F18: empty query matches everything", () => {
    expect(missionMatchesQuery(mission(), "")).toBe(true);
    expect(missionMatchesQuery(mission(), "   ")).toBe(true);
  });

  it("F19: matches by mission code", () => {
    expect(missionMatchesQuery(mission({ code: "MS-0042" }), "0042")).toBe(true);
  });

  it("F20: matches by vehicle identifier", () => {
    expect(missionMatchesQuery(mission({ vehicleIdentifier: "77-B-900" }), "77-b")).toBe(true);
  });

  it("F21: matches by shipment tracking code", () => {
    expect(missionMatchesQuery(mission({ shipmentTrackingCodes: ["TRK-9001", "TRK-9002"] }), "9002")).toBe(true);
  });

  it("F22: no match returns false", () => {
    expect(missionMatchesQuery(mission({ code: "MS-0001", vehicleIdentifier: "12-A-345", shipmentTrackingCodes: ["TRK-1"] }), "zzz")).toBe(false);
  });
});

describe("sortMissionRows", () => {
  it("F23: sorts ascending by the given field", () => {
    const rows = [mission({ code: "A", startAt: "2026-03-10T09:00:00.000Z" }), mission({ code: "B", startAt: "2026-03-10T06:00:00.000Z" })];
    const sorted = sortMissionRows(rows, "startAt", "asc");
    expect(sorted.map((m) => m.code)).toEqual(["B", "A"]);
  });

  it("F24: sorts descending when requested", () => {
    const rows = [mission({ code: "A", progressRatio: 0.2 }), mission({ code: "B", progressRatio: 0.8 })];
    const sorted = sortMissionRows(rows, "progressRatio", "desc");
    expect(sorted.map((m) => m.code)).toEqual(["B", "A"]);
  });

  it("F25: ties break by mission code ascending, deterministically", () => {
    const rows = [
      mission({ code: "ZZZ", status: "WAITING" }),
      mission({ code: "AAA", status: "WAITING" }),
      mission({ code: "MMM", status: "WAITING" }),
    ];
    const sorted1 = sortMissionRows(rows, "status", "asc");
    const sorted2 = sortMissionRows([...rows].reverse(), "status", "asc");
    expect(sorted1.map((m) => m.code)).toEqual(["AAA", "MMM", "ZZZ"]);
    expect(sorted2.map((m) => m.code)).toEqual(["AAA", "MMM", "ZZZ"]);
  });

  it("F26: does not mutate the input array", () => {
    const rows = [mission({ code: "B" }), mission({ code: "A" })];
    const original = [...rows];
    sortMissionRows(rows, "vehicleIdentifier", "asc");
    expect(rows).toEqual(original);
  });
});

describe("selectVisibleMissions (full pipeline)", () => {
  it("F27: filter, search, and sort compose in order", () => {
    const rows = [
      mission({ code: "MS-3", vehicleTypeName: "کامیونت", status: "IN_PROGRESS", startAt: "2026-03-10T05:00:00.000Z" }),
      mission({ code: "MS-1", vehicleTypeName: "کامیونت", status: "IN_PROGRESS", startAt: "2026-03-10T02:00:00.000Z" }),
      mission({ code: "MS-2", vehicleTypeName: "وانت", status: "IN_PROGRESS", startAt: "2026-03-10T01:00:00.000Z" }),
    ];
    const filter: MissionFilterState = { ...EMPTY_MISSION_FILTER_STATE, vehicleTypeName: "کامیونت" };
    const result = selectVisibleMissions(rows, filter, "", "startAt", "asc", NOW);
    expect(result.map((m) => m.code)).toEqual(["MS-1", "MS-3"]);
  });

  it("F28: is deterministic — same input always yields the same output", () => {
    const rows = [mission({ code: "MS-1" }), mission({ code: "MS-2" }), mission({ code: "MS-3" })];
    const a = selectVisibleMissions(rows, EMPTY_MISSION_FILTER_STATE, "", "code" as never, "asc", NOW).map((m) => m.code);
    const b = selectVisibleMissions(rows, EMPTY_MISSION_FILTER_STATE, "", "vehicleIdentifier", "asc", NOW).map((m) => m.code);
    const c = selectVisibleMissions(rows, EMPTY_MISSION_FILTER_STATE, "", "vehicleIdentifier", "asc", NOW).map((m) => m.code);
    expect(b).toEqual(c);
    expect(a.length).toBe(3);
  });
});
