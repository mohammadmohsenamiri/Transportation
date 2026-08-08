import { DomainError } from "@/lib/errors/domain-error";

/**
 * Phase 14 — رجیستری تنظیمات سامانه.
 *
 * تنها منبع حقیقتِ «یک تنظیم چیست»: نوع، مقدار پیش‌فرض، اعتبارسنج، اتصال به متغیر محیطی،
 * اثر زمان اجرا و برچسب فارسی. مقدارها در `SystemSetting.value` به‌صورت JSON ذخیره می‌شوند و
 * type safety از همین رجیستری می‌آید نه از ستون (ADR-P14-06) — در غیر این صورت افزودن هر تنظیم
 * یک migration می‌خواست.
 *
 * ⚠️ هیچ کلیدی در این رجیستری نباید secret باشد (BR-S05, I-13). اعتبارنامه‌ها الگوی موجود
 * `MapProvider.secretReference` را دنبال می‌کنند.
 */

export type SettingGroup = "GENERAL" | "LOCALE" | "MAP" | "VISUALIZATION" | "TIMELINE" | "OPERATIONAL";
export type SettingType = "string" | "number" | "boolean" | "enum";
export type RuntimeEffect = "IMMEDIATE" | "NEXT_REQUEST" | "NEXT_PAGE_LOAD";

export interface SettingDefinition {
  key: string;
  group: SettingGroup;
  type: SettingType;
  defaultValue: string | number | boolean;
  /** null یعنی با متغیر محیطی قابل بازنویسی نیست. */
  envVar: string | null;
  allowedValues: readonly (string | number)[] | null;
  min: number | null;
  max: number | null;
  labelFa: string;
  descriptionFa: string;
  runtimeEffect: RuntimeEffect;
  /** آیا این تنظیم فقط پیش‌فرضِ یک ترجیح کاربری است؟ اگر بله هرگز انتخاب کاربر را بازنویسی نمی‌کند (ADR-P14-08). */
  isUserPreferenceDefault: boolean;
}

function def(definition: SettingDefinition): SettingDefinition {
  return definition;
}

export const SETTING_DEFINITIONS: readonly SettingDefinition[] = [
  def({
    key: "general.appName",
    group: "GENERAL",
    type: "string",
    defaultValue: "آرمان حمل",
    envVar: null,
    allowedValues: null,
    min: 1,
    max: 64,
    labelFa: "نام سامانه",
    descriptionFa: "نامی که در هدر و عنوان صفحه‌ها نمایش داده می‌شود.",
    runtimeEffect: "NEXT_PAGE_LOAD",
    isUserPreferenceDefault: false,
  }),
  def({
    key: "general.appDescription",
    group: "GENERAL",
    type: "string",
    defaultValue: "سامانه مدیریت حمل‌ونقل",
    envVar: null,
    allowedValues: null,
    min: 0,
    max: 200,
    labelFa: "توضیح سامانه",
    descriptionFa: "توضیح کوتاه زیر نام سامانه.",
    runtimeEffect: "NEXT_PAGE_LOAD",
    isUserPreferenceDefault: false,
  }),
  def({
    key: "locale.timezone",
    group: "LOCALE",
    type: "enum",
    defaultValue: "Asia/Tehran",
    envVar: "APP_TIMEZONE",
    allowedValues: ["Asia/Tehran", "UTC"],
    min: null,
    max: null,
    labelFa: "منطقه زمانی",
    descriptionFa: "مبنای تبدیل تاریخ و ساعت شمسی. داده ذخیره‌شده همیشه UTC می‌ماند و تغییر نمی‌کند.",
    runtimeEffect: "NEXT_REQUEST",
    isUserPreferenceDefault: false,
  }),
  def({
    key: "locale.firstDayOfWeek",
    group: "LOCALE",
    type: "enum",
    defaultValue: "saturday",
    envVar: null,
    allowedValues: ["saturday", "sunday", "monday"],
    min: null,
    max: null,
    labelFa: "اولین روز هفته",
    descriptionFa: "مبنای نمایش تقویم.",
    runtimeEffect: "NEXT_PAGE_LOAD",
    isUserPreferenceDefault: false,
  }),
  def({
    key: "locale.usePersianDigits",
    group: "LOCALE",
    type: "boolean",
    defaultValue: true,
    envVar: null,
    allowedValues: null,
    min: null,
    max: null,
    labelFa: "نمایش ارقام فارسی",
    descriptionFa: "اعداد با ارقام فارسی نمایش داده شوند.",
    runtimeEffect: "NEXT_PAGE_LOAD",
    isUserPreferenceDefault: false,
  }),
  def({
    key: "map.defaultCenterLat",
    group: "MAP",
    type: "number",
    defaultValue: 35.6892,
    envVar: null,
    allowedValues: null,
    min: -90,
    max: 90,
    labelFa: "عرض جغرافیایی مرکز پیش‌فرض نقشه",
    descriptionFa: "نقشه در این نقطه باز می‌شود.",
    runtimeEffect: "NEXT_PAGE_LOAD",
    isUserPreferenceDefault: false,
  }),
  def({
    key: "map.defaultCenterLng",
    group: "MAP",
    type: "number",
    defaultValue: 51.389,
    envVar: null,
    allowedValues: null,
    min: -180,
    max: 180,
    labelFa: "طول جغرافیایی مرکز پیش‌فرض نقشه",
    descriptionFa: "نقشه در این نقطه باز می‌شود.",
    runtimeEffect: "NEXT_PAGE_LOAD",
    isUserPreferenceDefault: false,
  }),
  def({
    key: "map.defaultZoom",
    group: "MAP",
    type: "number",
    defaultValue: 11,
    envVar: null,
    allowedValues: null,
    min: 0,
    max: 22,
    labelFa: "بزرگ‌نمایی پیش‌فرض نقشه",
    descriptionFa: "سطح zoom هنگام باز شدن نقشه.",
    runtimeEffect: "NEXT_PAGE_LOAD",
    isUserPreferenceDefault: false,
  }),
  def({
    key: "map.sceneRefreshIntervalMs",
    group: "MAP",
    type: "number",
    defaultValue: 5000,
    envVar: null,
    allowedValues: null,
    min: 2000,
    max: 60000,
    labelFa: "بازه به‌روزرسانی نقشه عملیات (میلی‌ثانیه)",
    descriptionFa: "هرچه کمتر، بار بیشتری روی سرور می‌گذارد.",
    runtimeEffect: "NEXT_PAGE_LOAD",
    isUserPreferenceDefault: false,
  }),
  def({
    key: "visualization.defaultTheme",
    group: "VISUALIZATION",
    type: "enum",
    defaultValue: "light",
    envVar: null,
    allowedValues: ["light", "dark"],
    min: null,
    max: null,
    labelFa: "پوسته پیش‌فرض",
    descriptionFa: "فقط برای کاربرانی که هنوز پوسته‌ای انتخاب نکرده‌اند؛ انتخاب کاربر هرگز بازنویسی نمی‌شود.",
    runtimeEffect: "NEXT_PAGE_LOAD",
    isUserPreferenceDefault: true,
  }),
  def({
    key: "timeline.defaultPlaybackSpeed",
    group: "TIMELINE",
    type: "enum",
    defaultValue: 1,
    envVar: null,
    allowedValues: [0.25, 0.5, 1, 2, 4, 8],
    min: null,
    max: null,
    labelFa: "سرعت پیش‌فرض پخش نوار زمان",
    descriptionFa: "سرعت اولیه هنگام شروع پخش.",
    runtimeEffect: "NEXT_PAGE_LOAD",
    isUserPreferenceDefault: false,
  }),
  def({
    key: "dashboard.refreshIntervalMs",
    group: "OPERATIONAL",
    type: "number",
    defaultValue: 30000,
    envVar: null,
    allowedValues: null,
    min: 5000,
    max: 300000,
    labelFa: "بازه به‌روزرسانی خودکار فرانما (میلی‌ثانیه)",
    descriptionFa: "بازه تازه‌سازی شمارنده‌های فرانمای وضعیت.",
    runtimeEffect: "NEXT_PAGE_LOAD",
    isUserPreferenceDefault: false,
  }),
  def({
    key: "dashboard.defaultRange",
    group: "OPERATIONAL",
    type: "enum",
    defaultValue: "ALL",
    envVar: null,
    allowedValues: ["ALL", "TODAY", "LAST_7_DAYS", "LAST_30_DAYS"],
    min: null,
    max: null,
    labelFa: "بازه زمانی پیش‌فرض فرانما",
    descriptionFa: "بازه انتخاب‌شده هنگام باز شدن فرانمای وضعیت.",
    runtimeEffect: "NEXT_PAGE_LOAD",
    isUserPreferenceDefault: false,
  }),
] as const;

const DEFINITIONS_BY_KEY = new Map(SETTING_DEFINITIONS.map((definition) => [definition.key, definition]));

export function getSettingDefinition(key: string): SettingDefinition {
  const definition = DEFINITIONS_BY_KEY.get(key);
  if (!definition) {
    throw new DomainError("SETTING_UNKNOWN_KEY", "کلید تنظیم ناشناخته است.", { key: "این کلید تعریف نشده است." });
  }
  return definition;
}

export function isKnownSettingKey(key: string): boolean {
  return DEFINITIONS_BY_KEY.has(key);
}

/**
 * اعتبارسنجی و تبدیل یک مقدار خام به نوع اعلام‌شده رجیستری.
 * ورودی می‌تواند از DB (JSON) یا از متغیر محیطی (رشته) بیاید؛ هر دو مسیر از همین‌جا می‌گذرند.
 */
export function parseSettingValue(key: string, raw: unknown): string | number | boolean {
  const definition = getSettingDefinition(key);

  if (definition.type === "boolean") {
    const value = typeof raw === "string" ? raw.trim().toLowerCase() : raw;
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    throw new DomainError("SETTING_TYPE_MISMATCH", `مقدار «${definition.labelFa}» باید بله/خیر باشد.`, {
      [key]: "مقدار باید بله یا خیر باشد.",
    });
  }

  if (definition.type === "number" || (definition.type === "enum" && typeof definition.defaultValue === "number")) {
    const value = typeof raw === "string" ? Number(raw.trim()) : raw;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new DomainError("SETTING_TYPE_MISMATCH", `مقدار «${definition.labelFa}» باید عدد باشد.`, {
        [key]: "مقدار باید عدد باشد.",
      });
    }
    if (definition.allowedValues && !definition.allowedValues.includes(value)) {
      throw new DomainError("SETTING_VALUE_INVALID", `مقدار «${definition.labelFa}» مجاز نیست.`, {
        [key]: "مقدار انتخاب‌شده مجاز نیست.",
      });
    }
    if (definition.min !== null && value < definition.min) {
      throw new DomainError("SETTING_VALUE_INVALID", `«${definition.labelFa}» نباید کمتر از ${definition.min} باشد.`, {
        [key]: "مقدار کمتر از حد مجاز است.",
      });
    }
    if (definition.max !== null && value > definition.max) {
      throw new DomainError("SETTING_VALUE_INVALID", `«${definition.labelFa}» نباید بیشتر از ${definition.max} باشد.`, {
        [key]: "مقدار بیشتر از حد مجاز است.",
      });
    }
    return value;
  }

  // string و enumهای رشته‌ای
  if (typeof raw !== "string") {
    throw new DomainError("SETTING_TYPE_MISMATCH", `مقدار «${definition.labelFa}» باید متن باشد.`, {
      [key]: "مقدار باید متن باشد.",
    });
  }
  const value = raw.trim();
  if (definition.allowedValues && !definition.allowedValues.includes(value)) {
    throw new DomainError("SETTING_VALUE_INVALID", `مقدار «${definition.labelFa}» مجاز نیست.`, {
      [key]: "مقدار انتخاب‌شده مجاز نیست.",
    });
  }
  if (definition.min !== null && value.length < definition.min) {
    throw new DomainError("SETTING_VALUE_INVALID", `«${definition.labelFa}» بیش از حد کوتاه است.`, {
      [key]: "مقدار بیش از حد کوتاه است.",
    });
  }
  if (definition.max !== null && value.length > definition.max) {
    throw new DomainError("SETTING_VALUE_INVALID", `«${definition.labelFa}» بیش از حد بلند است.`, {
      [key]: "مقدار بیش از حد بلند است.",
    });
  }
  return value;
}

/** الگوهایی که نشان می‌دهند یک کلید احتمالاً secret است — رجیستری هرگز نباید چنین کلیدی داشته باشد. */
const SECRET_KEY_PATTERN = /password|secret|token|credential|apikey|api_key/i;

/**
 * بررسی سلامت رجیستری، برای اجرا در startup و در آزمون واحد.
 * تضمین می‌کند هیچ کلید secretی وارد رجیستری نشده و هر تعریف کامل است.
 */
export function assertRegistryIsSound(): void {
  const seen = new Set<string>();
  for (const definition of SETTING_DEFINITIONS) {
    if (seen.has(definition.key)) {
      throw new Error(`کلید تکراری در رجیستری تنظیمات: ${definition.key}`);
    }
    seen.add(definition.key);

    if (SECRET_KEY_PATTERN.test(definition.key)) {
      throw new Error(`کلید تنظیمات نباید secret باشد: ${definition.key}`);
    }
    if (definition.labelFa.trim().length === 0 || definition.descriptionFa.trim().length === 0) {
      throw new Error(`تعریف ناقص در رجیستری تنظیمات: ${definition.key}`);
    }
    // مقدار پیش‌فرض باید خودش از اعتبارسنجی بگذرد.
    parseSettingValue(definition.key, definition.defaultValue);
  }
}
