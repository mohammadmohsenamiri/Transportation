/** Phase 14 — تایپ‌های سمت کلاینت تنظیمات سامانه (بازتاب `EffectiveSetting` سرور). */

export type SettingGroup = "GENERAL" | "LOCALE" | "MAP" | "VISUALIZATION" | "TIMELINE" | "OPERATIONAL";
export type SettingType = "string" | "number" | "boolean" | "enum";
export type RuntimeEffect = "IMMEDIATE" | "NEXT_REQUEST" | "NEXT_PAGE_LOAD";

export type SettingValue = string | number | boolean;

export interface SettingDefinition {
  key: string;
  group: SettingGroup;
  type: SettingType;
  defaultValue: SettingValue;
  envVar: string | null;
  allowedValues: readonly (string | number)[] | null;
  min: number | null;
  max: number | null;
  labelFa: string;
  descriptionFa: string;
  runtimeEffect: RuntimeEffect;
  isUserPreferenceDefault: boolean;
}

export interface EffectiveSetting {
  key: string;
  value: SettingValue;
  defaultValue: SettingValue;
  isDefault: boolean;
  /** با متغیر محیطی قفل شده — UI باید آن را فقط‌خواندنی نشان دهد و سرور هم رد می‌کند. */
  isEnvLocked: boolean;
  version: number;
  definition: SettingDefinition;
}

export const settingGroupLabels: Record<SettingGroup, string> = {
  GENERAL: "عمومی",
  LOCALE: "زبان و زمان",
  MAP: "نقشه",
  VISUALIZATION: "نمایش",
  TIMELINE: "خط زمان",
  OPERATIONAL: "عملیاتی",
};

export const settingGroupOrder: SettingGroup[] = [
  "GENERAL",
  "LOCALE",
  "MAP",
  "VISUALIZATION",
  "TIMELINE",
  "OPERATIONAL",
];

export const runtimeEffectLabels: Record<RuntimeEffect, string> = {
  IMMEDIATE: "بی‌درنگ اعمال می‌شود",
  NEXT_REQUEST: "از درخواست بعدی اعمال می‌شود",
  NEXT_PAGE_LOAD: "پس از بارگذاری مجدد صفحه اعمال می‌شود",
};
