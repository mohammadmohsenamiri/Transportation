import { describe, expect, it } from "vitest";
import { isValidJalaliDateTime, jalaliToUtcIso, utcIsoToJalali } from "@/lib/dates/jalali";

describe("jalaliToUtcIso / utcIsoToJalali", () => {
  it("round-trips a Jalali date/time through UTC and back", () => {
    const input = { year: 1404, month: 5, day: 15, hour: 10, minute: 30 };
    const iso = jalaliToUtcIso(input);
    const roundTripped = utcIsoToJalali(iso);
    expect(roundTripped).toEqual(input);
  });

  it("accounts for the Asia/Tehran UTC+03:30 offset (no DST)", () => {
    // نوروز ۱۴۰۴ (فروردین ۱، ساعت ۰۰:۰۰ به‌وقت تهران) باید ۳ ساعت و ۳۰ دقیقه قبل از نیمه‌شب UTC باشد
    const iso = jalaliToUtcIso({ year: 1404, month: 1, day: 1, hour: 0, minute: 0 });
    const utcDate = new Date(iso);
    expect(utcDate.getUTCHours()).toBe(20); // ۰۰:۳۰ منهای ۳:۳۰ از روز قبل = ۲۰:۳۰ روز قبل
    expect(utcDate.getUTCMinutes()).toBe(30);
  });

  it("is deterministic", () => {
    const input = { year: 1403, month: 12, day: 29, hour: 23, minute: 59 };
    expect(jalaliToUtcIso(input)).toBe(jalaliToUtcIso(input));
  });
});

describe("isValidJalaliDateTime", () => {
  it("accepts a valid date/time", () => {
    expect(isValidJalaliDateTime({ year: 1404, month: 5, day: 15, hour: 12, minute: 0 })).toBe(true);
  });

  it("rejects an out-of-range day for a non-leap year (esfand 30)", () => {
    // ۱۳۹۴ سال کبیسه نیست
    expect(isValidJalaliDateTime({ year: 1394, month: 12, day: 30, hour: 0, minute: 0 })).toBe(false);
  });

  it("rejects an out-of-range hour or minute", () => {
    expect(isValidJalaliDateTime({ year: 1404, month: 1, day: 1, hour: 24, minute: 0 })).toBe(false);
    expect(isValidJalaliDateTime({ year: 1404, month: 1, day: 1, hour: 0, minute: 60 })).toBe(false);
  });
});
