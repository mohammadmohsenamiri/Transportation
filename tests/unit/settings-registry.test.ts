import { describe, expect, it } from "vitest";
import {
  SETTING_DEFINITIONS,
  assertRegistryIsSound,
  getSettingDefinition,
  isKnownSettingKey,
  parseSettingValue,
} from "@/lib/settings/settings-registry";

describe("رجیستری تنظیمات", () => {
  it("S-09: هر کلید تعریف کامل دارد و مقدار پیش‌فرضش از اعتبارسنجی می‌گذرد", () => {
    expect(() => assertRegistryIsSound()).not.toThrow();
    expect(SETTING_DEFINITIONS.length).toBeGreaterThan(0);
  });

  it("S-10: هیچ کلیدی نباید شبیه secret باشد", () => {
    const suspicious = SETTING_DEFINITIONS.filter((definition) =>
      /password|secret|token|credential|apikey|api_key/i.test(definition.key),
    );
    expect(suspicious).toEqual([]);
  });

  it("S-01: کلید ناشناخته رد می‌شود", () => {
    expect(isKnownSettingKey("nope.key")).toBe(false);
    expect(() => getSettingDefinition("nope.key")).toThrowError(/ناشناخته/);
    expect(() => parseSettingValue("nope.key", 1)).toThrowError(/ناشناخته/);
  });

  it("همه کلیدها یکتا هستند", () => {
    const keys = SETTING_DEFINITIONS.map((definition) => definition.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("parseSettingValue — عدد", () => {
  it("S-02: نوع نامعتبر رد می‌شود", () => {
    expect(() => parseSettingValue("map.defaultZoom", "abc")).toThrowError(/عدد/);
  });

  it("S-03: مرزهای بازه", () => {
    expect(() => parseSettingValue("map.defaultZoom", -1)).toThrow();
    expect(parseSettingValue("map.defaultZoom", 0)).toBe(0);
    expect(parseSettingValue("map.defaultZoom", 22)).toBe(22);
    expect(() => parseSettingValue("map.defaultZoom", 23)).toThrow();
  });

  it("رشته عددی از متغیر محیطی هم پذیرفته می‌شود", () => {
    expect(parseSettingValue("map.defaultZoom", "14")).toBe(14);
  });

  it("مرزهای بازه به‌روزرسانی فرانما", () => {
    expect(() => parseSettingValue("dashboard.refreshIntervalMs", 4999)).toThrow();
    expect(parseSettingValue("dashboard.refreshIntervalMs", 5000)).toBe(5000);
    expect(() => parseSettingValue("dashboard.refreshIntervalMs", 300001)).toThrow();
  });
});

describe("parseSettingValue — enum", () => {
  it("S-04: عضویت در مجموعه مجاز", () => {
    expect(parseSettingValue("locale.timezone", "UTC")).toBe("UTC");
    expect(() => parseSettingValue("locale.timezone", "Europe/Paris")).toThrowError(/مجاز/);
  });

  it("enum عددی سرعت پخش", () => {
    expect(parseSettingValue("timeline.defaultPlaybackSpeed", 4)).toBe(4);
    expect(() => parseSettingValue("timeline.defaultPlaybackSpeed", 3)).toThrow();
  });

  it("enum بازه فرانما", () => {
    expect(parseSettingValue("dashboard.defaultRange", "TODAY")).toBe("TODAY");
    expect(() => parseSettingValue("dashboard.defaultRange", "YESTERDAY")).toThrow();
  });
});

describe("parseSettingValue — بولی و متن", () => {
  it("بولی از هر دو شکل پذیرفته می‌شود", () => {
    expect(parseSettingValue("locale.usePersianDigits", true)).toBe(true);
    expect(parseSettingValue("locale.usePersianDigits", "false")).toBe(false);
    expect(() => parseSettingValue("locale.usePersianDigits", 1)).toThrowError(/بله/);
  });

  it("متن با مرزهای طول", () => {
    expect(parseSettingValue("general.appName", " سامانه ")).toBe("سامانه");
    expect(() => parseSettingValue("general.appName", "")).toThrow();
    expect(() => parseSettingValue("general.appName", "x".repeat(65))).toThrow();
    expect(() => parseSettingValue("general.appName", 42)).toThrowError(/متن/);
  });
});

describe("پیش‌فرض پوسته فقط پیش‌فرض ترجیح کاربر است", () => {
  it("ADR-P14-08: کلید پوسته با پرچم isUserPreferenceDefault علامت خورده است", () => {
    const theme = getSettingDefinition("visualization.defaultTheme");
    expect(theme.isUserPreferenceDefault).toBe(true);
  });

  it("تنظیمات غیرترجیحی این پرچم را ندارند", () => {
    expect(getSettingDefinition("map.defaultZoom").isUserPreferenceDefault).toBe(false);
  });
});
