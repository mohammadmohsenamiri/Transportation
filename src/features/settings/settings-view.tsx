"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { ApiError } from "@/lib/http/api-client-error";
import { useResetSetting, useSettings, useUpdateSettings } from "@/features/settings/use-settings-queries";
import {
  runtimeEffectLabels,
  settingGroupLabels,
  settingGroupOrder,
  type EffectiveSetting,
  type SettingValue,
} from "@/features/settings/types";

const controlClass =
  "w-full rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60";

/** ورودی‌های فرم رشته‌اند؛ تبدیل به نوع رجیستری فقط در همین مرز ارسال انجام می‌شود. */
function toTypedValue(setting: EffectiveSetting, raw: string): SettingValue {
  if (setting.definition.type === "number") return Number(raw);
  if (setting.definition.type === "boolean") return raw === "true";
  return raw;
}

function toRawValue(value: SettingValue): string {
  return typeof value === "boolean" ? String(value) : String(value);
}

export function SettingsView() {
  const { data: settings, isLoading, isError } = useSettings();
  const updateMutation = useUpdateSettings();
  const resetMutation = useResetSetting();

  /** فقط کلیدهای دست‌خورده نگه داشته می‌شوند تا ذخیره، مقدارهای بی‌تغییر را دوباره ننویسد. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, EffectiveSetting[]>();
    for (const setting of settings ?? []) {
      const list = map.get(setting.definition.group) ?? [];
      list.push(setting);
      map.set(setting.definition.group, list);
    }
    return map;
  }, [settings]);

  const dirtyKeys = Object.keys(drafts).filter((key) => {
    const setting = settings?.find((item) => item.key === key);
    return setting ? drafts[key] !== toRawValue(setting.value) : false;
  });

  async function handleSave() {
    if (!settings || dirtyKeys.length === 0) return;
    setError(null);
    setSaved(false);

    const changes = dirtyKeys.map((key) => {
      const setting = settings.find((item) => item.key === key)!;
      return { key, value: toTypedValue(setting, drafts[key]), version: setting.version };
    });

    try {
      await updateMutation.mutateAsync(changes);
      setDrafts({});
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "ذخیره تنظیمات ناموفق بود.");
    }
  }

  async function handleReset(setting: EffectiveSetting) {
    setError(null);
    setSaved(false);
    try {
      await resetMutation.mutateAsync({ key: setting.key, version: setting.version });
      setDrafts((current) => {
        const next = { ...current };
        delete next[setting.key];
        return next;
      });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "بازگرداندن به پیش‌فرض ناموفق بود.");
    }
  }

  if (isLoading) {
    return <Panel className="p-6 text-center text-sm text-[var(--color-text-muted)]">در حال بارگذاری…</Panel>;
  }
  if (isError || !settings) {
    return <Panel className="p-6 text-center text-sm text-[var(--color-danger)]">تنظیمات بارگذاری نشد.</Panel>;
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
      {saved && dirtyKeys.length === 0 && (
        <p role="status" className="rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">
          تنظیمات ذخیره شد.
        </p>
      )}

      {settingGroupOrder.map((group) => {
        const items = grouped.get(group) ?? [];
        if (items.length === 0) return null;

        return (
          <Panel key={group} className="p-4 sm:p-5">
            <h2 className="text-sm font-bold text-[var(--color-text)]">{settingGroupLabels[group]}</h2>
            <div className="mt-4 flex flex-col gap-5">
              {items.map((setting) => {
                const raw = drafts[setting.key] ?? toRawValue(setting.value);
                const { definition } = setting;
                const inputId = `setting-${setting.key}`;

                return (
                  <div key={setting.key} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] sm:items-start">
                    <div className="min-w-0">
                      <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text)]">
                        {definition.labelFa}
                      </label>
                      <p className="mt-0.5 text-xs leading-5 text-[var(--color-text-muted)]">
                        {definition.descriptionFa}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-subtle)]">
                        {runtimeEffectLabels[definition.runtimeEffect]}
                        {definition.isUserPreferenceDefault && " · فقط پیش‌فرض؛ انتخاب کاربران را بازنویسی نمی‌کند"}
                      </p>
                      {setting.isEnvLocked && (
                        <p className="mt-1 text-xs font-medium text-[var(--color-warning)]">
                          با متغیر محیطی <span dir="ltr">{definition.envVar}</span> قفل شده است و از این صفحه قابل تغییر
                          نیست.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {definition.type === "boolean" ? (
                        <select
                          id={inputId}
                          value={raw}
                          disabled={setting.isEnvLocked}
                          onChange={(event) => setDrafts((c) => ({ ...c, [setting.key]: event.target.value }))}
                          className={controlClass}
                        >
                          <option value="true">فعال</option>
                          <option value="false">غیرفعال</option>
                        </select>
                      ) : definition.allowedValues ? (
                        <select
                          id={inputId}
                          value={raw}
                          disabled={setting.isEnvLocked}
                          onChange={(event) => setDrafts((c) => ({ ...c, [setting.key]: event.target.value }))}
                          className={controlClass}
                        >
                          {definition.allowedValues.map((allowed) => (
                            <option key={String(allowed)} value={String(allowed)}>
                              {String(allowed)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={inputId}
                          type={definition.type === "number" ? "number" : "text"}
                          dir={definition.type === "number" ? "ltr" : undefined}
                          min={definition.min ?? undefined}
                          max={definition.max ?? undefined}
                          value={raw}
                          disabled={setting.isEnvLocked}
                          onChange={(event) => setDrafts((c) => ({ ...c, [setting.key]: event.target.value }))}
                          className={controlClass}
                        />
                      )}

                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-[var(--color-text-subtle)]">
                          پیش‌فرض: <span dir="ltr">{toRawValue(definition.defaultValue)}</span>
                        </span>
                        {!setting.isDefault && !setting.isEnvLocked && (
                          <button
                            type="button"
                            onClick={() => handleReset(setting)}
                            disabled={resetMutation.isPending}
                            className="rounded-lg px-2 py-1 font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] disabled:opacity-60"
                          >
                            بازگرداندن به پیش‌فرض
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        );
      })}

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] px-4 py-3 shadow-lg">
        <span className="text-sm text-[var(--color-text-muted)]">
          {dirtyKeys.length === 0
            ? "تغییری اعمال نشده است."
            : `${dirtyKeys.length.toLocaleString("fa-IR")} تنظیم تغییر کرده است.`}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={dirtyKeys.length === 0 || updateMutation.isPending}
            onClick={() => setDrafts({})}
            className="rounded-lg border border-[var(--color-panel-border)] px-3.5 py-2 text-sm text-[var(--color-text)] disabled:opacity-40"
          >
            انصراف از تغییرات
          </button>
          <button
            type="button"
            disabled={dirtyKeys.length === 0 || updateMutation.isPending}
            onClick={handleSave}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {updateMutation.isPending ? "در حال ذخیره…" : "ذخیره تغییرات"}
          </button>
        </div>
      </div>
    </div>
  );
}
