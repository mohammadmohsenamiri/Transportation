import { describe, expect, it } from "vitest";
import {
  EMPTY_MISSION_STATUS_COUNTERS,
  countMissionsByDisplayStatus,
  countMissionsStartingWithin,
  isWithinOpenRange,
  resolveDashboardRange,
  toDistribution,
  toDonutSegments,
} from "@/lib/domain/dashboard-rules";
import type { MissionStatusInput } from "@/lib/domain/mission-rules";

function mission(
  persistedStatus: MissionStatusInput["persistedStatus"],
  startAtIso: string,
  estimatedArrivalAtIso: string,
): MissionStatusInput {
  return {
    persistedStatus,
    startAt: new Date(startAtIso),
    estimatedArrivalAt: new Date(estimatedArrivalAtIso),
  };
}

const NOON = new Date("2026-08-07T12:00:00.000Z");

describe("countMissionsByDisplayStatus", () => {
  it("D1: فهرست خالی همه شمارنده‌ها را صفر برمی‌گرداند", () => {
    expect(countMissionsByDisplayStatus([], NOON)).toEqual(EMPTY_MISSION_STATUS_COUNTERS);
  });

  it("D2: مأموریت SCHEDULED پیش از startAt در انتظار حرکت شمرده می‌شود", () => {
    const missions = [mission("SCHEDULED", "2026-08-07T14:00:00Z", "2026-08-07T18:00:00Z")];
    const counters = countMissionsByDisplayStatus(missions, NOON);
    expect(counters.waiting).toBe(1);
    expect(counters.inProgress).toBe(0);
    expect(counters.arrived).toBe(0);
    expect(counters.total).toBe(1);
  });

  it("D3: مأموریت SCHEDULED میان startAt و ETA در حال حرکت شمرده می‌شود", () => {
    const missions = [mission("SCHEDULED", "2026-08-07T10:00:00Z", "2026-08-07T18:00:00Z")];
    expect(countMissionsByDisplayStatus(missions, NOON).inProgress).toBe(1);
  });

  it("D4: مأموریت SCHEDULED پس از ETA رسیده شمرده می‌شود", () => {
    const missions = [mission("SCHEDULED", "2026-08-07T06:00:00Z", "2026-08-07T09:00:00Z")];
    expect(countMissionsByDisplayStatus(missions, NOON).arrived).toBe(1);
  });

  it("D5: مرز دقیق startAt به «در حال حرکت» تعلق دارد (بازه شمول ابتدا)", () => {
    const missions = [mission("SCHEDULED", "2026-08-07T12:00:00Z", "2026-08-07T18:00:00Z")];
    const counters = countMissionsByDisplayStatus(missions, NOON);
    expect(counters.inProgress).toBe(1);
    expect(counters.waiting).toBe(0);
  });

  it("D6: مرز دقیق ETA به «رسیده» تعلق دارد (بازه شمول انتها)", () => {
    const missions = [mission("SCHEDULED", "2026-08-07T06:00:00Z", "2026-08-07T12:00:00Z")];
    const counters = countMissionsByDisplayStatus(missions, NOON);
    expect(counters.arrived).toBe(1);
    expect(counters.inProgress).toBe(0);
  });

  it("D7: DRAFT / CANCELLED / ARCHIVED مستقل از زمان مشاهده ثابت می‌مانند", () => {
    const missions = [
      mission("DRAFT", "2026-08-07T06:00:00Z", "2026-08-07T09:00:00Z"),
      mission("CANCELLED", "2026-08-07T06:00:00Z", "2026-08-07T09:00:00Z"),
      mission("ARCHIVED", "2026-08-07T06:00:00Z", "2026-08-07T09:00:00Z"),
    ];
    const counters = countMissionsByDisplayStatus(missions, NOON);
    expect(counters).toMatchObject({ draft: 1, cancelled: 1, archived: 1, waiting: 0, inProgress: 0, arrived: 0 });

    const muchLater = countMissionsByDisplayStatus(missions, new Date("2027-01-01T00:00:00Z"));
    expect(muchLater).toEqual(counters);
  });

  it("D8: همان مأموریت با تغییر زمان مشاهده در سطل متفاوتی شمرده می‌شود", () => {
    const missions = [mission("SCHEDULED", "2026-08-07T10:00:00Z", "2026-08-07T14:00:00Z")];
    expect(countMissionsByDisplayStatus(missions, new Date("2026-08-07T09:00:00Z")).waiting).toBe(1);
    expect(countMissionsByDisplayStatus(missions, new Date("2026-08-07T12:00:00Z")).inProgress).toBe(1);
    expect(countMissionsByDisplayStatus(missions, new Date("2026-08-07T15:00:00Z")).arrived).toBe(1);
  });

  it("D9: total همیشه برابر جمع سطل‌هاست", () => {
    const missions = [
      mission("DRAFT", "2026-08-07T06:00:00Z", "2026-08-07T09:00:00Z"),
      mission("SCHEDULED", "2026-08-07T14:00:00Z", "2026-08-07T18:00:00Z"),
      mission("SCHEDULED", "2026-08-07T10:00:00Z", "2026-08-07T18:00:00Z"),
      mission("SCHEDULED", "2026-08-07T06:00:00Z", "2026-08-07T09:00:00Z"),
      mission("CANCELLED", "2026-08-07T06:00:00Z", "2026-08-07T09:00:00Z"),
      mission("ARCHIVED", "2026-08-07T06:00:00Z", "2026-08-07T09:00:00Z"),
    ];
    const c = countMissionsByDisplayStatus(missions, NOON);
    expect(c.draft + c.waiting + c.inProgress + c.arrived + c.cancelled + c.archived).toBe(c.total);
    expect(c.total).toBe(6);
  });

  it("D10: ورودی را تغییر نمی‌دهد و ثابت مشترک را آلوده نمی‌کند", () => {
    const missions = [mission("SCHEDULED", "2026-08-07T10:00:00Z", "2026-08-07T18:00:00Z")];
    countMissionsByDisplayStatus(missions, NOON);
    countMissionsByDisplayStatus(missions, NOON);
    expect(EMPTY_MISSION_STATUS_COUNTERS.total).toBe(0);
    expect(EMPTY_MISSION_STATUS_COUNTERS.inProgress).toBe(0);
  });
});

describe("countMissionsStartingWithin", () => {
  const from = new Date("2026-08-07T12:00:00Z");
  const to = new Date("2026-08-08T12:00:00Z");

  it("D11: فقط مأموریت SCHEDULED داخل بازه شمرده می‌شود", () => {
    const missions = [
      mission("SCHEDULED", "2026-08-07T13:00:00Z", "2026-08-07T18:00:00Z"), // داخل
      mission("DRAFT", "2026-08-07T13:00:00Z", "2026-08-07T18:00:00Z"), // پیش‌نویس → نه
      mission("CANCELLED", "2026-08-07T13:00:00Z", "2026-08-07T18:00:00Z"), // لغوشده → نه
      mission("SCHEDULED", "2026-08-09T13:00:00Z", "2026-08-09T18:00:00Z"), // بیرون
    ];
    expect(countMissionsStartingWithin(missions, from, to)).toBe(1);
  });

  it("D12: بازه نیمه‌باز است — شروع شامل، پایان غیرشامل", () => {
    const atFrom = [mission("SCHEDULED", from.toISOString(), "2026-08-07T18:00:00Z")];
    const atTo = [mission("SCHEDULED", to.toISOString(), "2026-08-08T18:00:00Z")];
    expect(countMissionsStartingWithin(atFrom, from, to)).toBe(1);
    expect(countMissionsStartingWithin(atTo, from, to)).toBe(0);
  });
});

describe("toDistribution", () => {
  it("D13: درصدها بر اساس جمع کل محاسبه می‌شوند", () => {
    const slices = toDistribution([
      { key: "a", label: "الف", value: 25 },
      { key: "b", label: "ب", value: 75 },
    ]);
    expect(slices.map((s) => s.percentage)).toEqual([75, 25]);
  });

  it("D14: نزولی بر اساس مقدار مرتب می‌شود", () => {
    const slices = toDistribution([
      { key: "a", label: "الف", value: 1 },
      { key: "b", label: "ب", value: 9 },
      { key: "c", label: "ج", value: 5 },
    ]);
    expect(slices.map((s) => s.key)).toEqual(["b", "c", "a"]);
  });

  it("D15: در تساوی مقدار، tie-break روی برچسب قطعی است", () => {
    const first = toDistribution([
      { key: "z", label: "ب", value: 3 },
      { key: "a", label: "الف", value: 3 },
    ]);
    const second = toDistribution([
      { key: "a", label: "الف", value: 3 },
      { key: "z", label: "ب", value: 3 },
    ]);
    expect(first.map((s) => s.key)).toEqual(second.map((s) => s.key));
  });

  it("D16: جمع صفر باعث تقسیم بر صفر نمی‌شود", () => {
    const slices = toDistribution([
      { key: "a", label: "الف", value: 0 },
      { key: "b", label: "ب", value: 0 },
    ]);
    expect(slices.every((s) => s.percentage === 0)).toBe(true);
  });

  it("D17: فهرست خالی، خروجی خالی می‌دهد", () => {
    expect(toDistribution([])).toEqual([]);
  });

  it("D18: ورودی اصلی جابه‌جا نمی‌شود (بدون mutation)", () => {
    const input = [
      { key: "a", label: "الف", value: 1 },
      { key: "b", label: "ب", value: 9 },
    ];
    toDistribution(input);
    expect(input.map((e) => e.key)).toEqual(["a", "b"]);
  });
});

describe("toDonutSegments", () => {
  const CIRCUMFERENCE = 100;

  it("D19: طول کمان‌ها دقیقاً کل محیط را پر می‌کند", () => {
    const slices = toDistribution([
      { key: "a", label: "الف", value: 1 },
      { key: "b", label: "ب", value: 1 },
      { key: "c", label: "ج", value: 1 },
    ]);
    const segments = toDonutSegments(slices, CIRCUMFERENCE);
    const totalArc = segments.reduce((sum, s) => sum + Number(s.dashArray.split(" ")[0]), 0);
    expect(totalArc).toBeCloseTo(CIRCUMFERENCE, 10);
  });

  it("D20: offset هر قطاع برابر مجموع کمان‌های پیش از خودش (منفی) است", () => {
    const slices = toDistribution([
      { key: "a", label: "الف", value: 75 },
      { key: "b", label: "ب", value: 25 },
    ]);
    const segments = toDonutSegments(slices, CIRCUMFERENCE);
    expect(segments[0].dashOffset).toBe(-0);
    expect(segments[1].dashOffset).toBeCloseTo(-75, 10);
  });

  it("D21: طول کمان از مقدار خام محاسبه می‌شود نه درصد گردشده (بدون انباشت خطا)", () => {
    // سه مقدار برابر → درصد گردشده ۳۳.۳ است؛ اگر کمان از درصد ساخته می‌شد ۰.۱ واحد شکاف می‌ماند.
    const slices = toDistribution([
      { key: "a", label: "الف", value: 1 },
      { key: "b", label: "ب", value: 1 },
      { key: "c", label: "ج", value: 1 },
    ]);
    const segments = toDonutSegments(slices, 360);
    expect(Number(segments[0].dashArray.split(" ")[0])).toBeCloseTo(120, 10);
    expect(segments[2].dashOffset).toBeCloseTo(-240, 10);
  });

  it("D22: توزیع تماماً صفر، همه کمان‌ها را صفر می‌کند", () => {
    const slices = toDistribution([{ key: "a", label: "الف", value: 0 }]);
    const segments = toDonutSegments(slices, CIRCUMFERENCE);
    expect(Number(segments[0].dashArray.split(" ")[0])).toBe(0);
  });
});

describe("resolveDashboardRange", () => {
  it("D23: ALL هیچ کرانی ندارد", () => {
    expect(resolveDashboardRange("ALL", NOON)).toEqual({ from: null, to: null });
  });

  it("D24: TODAY یک بازه ۲۴ ساعته تقویمی بسته می‌دهد", () => {
    const range = resolveDashboardRange("TODAY", NOON);
    expect(range.from).not.toBeNull();
    expect(range.to).not.toBeNull();
    expect(range.to!.getTime() - range.from!.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(range.from!.getTime()).toBeLessThanOrEqual(NOON.getTime());
    expect(range.to!.getTime()).toBeGreaterThan(NOON.getTime());
  });

  it("D25: پنجره‌های غلتان کران بالا ندارند و از اکنون به عقب می‌روند", () => {
    const week = resolveDashboardRange("LAST_7_DAYS", NOON);
    expect(week.to).toBeNull();
    expect(NOON.getTime() - week.from!.getTime()).toBe(7 * 24 * 60 * 60 * 1000);

    const month = resolveDashboardRange("LAST_30_DAYS", NOON);
    expect(NOON.getTime() - month.from!.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe("isWithinOpenRange", () => {
  it("D26: بازه بدون کران همه چیز را می‌پذیرد", () => {
    expect(isWithinOpenRange(NOON, { from: null, to: null })).toBe(true);
  });

  it("D27: کران پایین شامل و کران بالا غیرشامل است", () => {
    const range = { from: new Date("2026-08-07T12:00:00Z"), to: new Date("2026-08-08T12:00:00Z") };
    expect(isWithinOpenRange(new Date("2026-08-07T12:00:00Z"), range)).toBe(true);
    expect(isWithinOpenRange(new Date("2026-08-08T12:00:00Z"), range)).toBe(false);
    expect(isWithinOpenRange(new Date("2026-08-07T11:59:59Z"), range)).toBe(false);
  });

  it("D28: کران یک‌طرفه فقط همان سمت را محدود می‌کند", () => {
    expect(isWithinOpenRange(NOON, { from: new Date("2026-01-01T00:00:00Z"), to: null })).toBe(true);
    expect(isWithinOpenRange(NOON, { from: new Date("2027-01-01T00:00:00Z"), to: null })).toBe(false);
  });
});
