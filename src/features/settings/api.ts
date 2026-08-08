import { ApiError } from "@/lib/http/api-client-error";
import type { EffectiveSetting, SettingValue } from "@/features/settings/types";

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) throw new ApiError(data.error);
  return data as T;
}

export async function fetchSettings(): Promise<EffectiveSetting[]> {
  const data = await parseResponse<{ items: EffectiveSetting[] }>(await fetch("/api/v1/settings"));
  return data.items;
}

export interface SettingChange {
  key: string;
  value: SettingValue;
  version: number;
}

/** نوشتن دسته‌ای — سرور کل دسته را در یک تراکنش اعمال می‌کند یا هیچ‌کدام را (IS-03). */
export async function updateSettingsRequest(changes: SettingChange[]): Promise<EffectiveSetting[]> {
  const data = await parseResponse<{ items: EffectiveSetting[] }>(
    await fetch("/api/v1/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes }),
    }),
  );
  return data.items;
}

export async function resetSettingRequest(key: string, version: number): Promise<EffectiveSetting[]> {
  const data = await parseResponse<{ items: EffectiveSetting[] }>(
    await fetch(`/api/v1/settings/${encodeURIComponent(key)}/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version }),
    }),
  );
  return data.items;
}
