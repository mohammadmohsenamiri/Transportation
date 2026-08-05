"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/badge";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icons";
import {
  MapProviderForm,
  emptyMapProviderFormValues,
  mapProviderToFormValues,
  type MapProviderFormValues,
} from "@/features/map-providers/map-provider-form";
import {
  useMapProviders,
  useCreateMapProvider,
  useUpdateMapProvider,
  useDeleteMapProvider,
  useTestMapProviderConnection,
} from "@/features/map-providers/use-map-provider-queries";
import type { MapProvider } from "@/features/map-providers/types";
import { ApiError } from "@/lib/http/api-client-error";

type SheetState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; item: MapProvider };

const kindLabel: Record<MapProvider["kind"], string> = {
  INTERNAL_TMS: "TMS داخلی",
  INTERNAL_XYZ: "XYZ داخلی",
  INTERNAL_WMTS: "WMTS داخلی",
  EXTERNAL_XYZ: "XYZ خارجی",
};

const healthLabel: Record<MapProvider["healthStatus"], { label: string; tone: "success" | "danger" | "warning" }> = {
  HEALTHY: { label: "سالم", tone: "success" },
  UNHEALTHY: { label: "خراب", tone: "danger" },
  UNKNOWN: { label: "بررسی‌نشده", tone: "warning" },
};

function toPayload(values: MapProviderFormValues) {
  return {
    name: values.name,
    urlTemplate: values.urlTemplate,
    attribution: values.attribution || null,
    minZoom: Number(values.minZoom),
    maxZoom: Number(values.maxZoom),
    tileSize: (Number(values.tileSize) as 256 | 512),
    subdomains: values.subdomains
      ? values.subdomains
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : null,
    requiresApiKey: values.requiresApiKey,
    secretReference: values.secretReference || null,
    isDefault: values.isDefault,
    isEnabled: values.isEnabled,
  };
}

export function MapProviderList() {
  const { data: items, isLoading, isError } = useMapProviders();
  const [sheet, setSheet] = useState<SheetState>({ mode: "closed" });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MapProvider | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const createMutation = useCreateMapProvider();
  const updateMutation = useUpdateMapProvider();
  const deleteMutation = useDeleteMapProvider();
  const testMutation = useTestMapProviderConnection();

  async function handleSubmit(values: MapProviderFormValues) {
    setFormError(null);
    try {
      if (sheet.mode === "create") {
        await createMutation.mutateAsync({ ...toPayload(values), kind: values.kind });
      } else if (sheet.mode === "edit") {
        await updateMutation.mutateAsync({ id: sheet.item.id, payload: toPayload(values) });
      }
      setSheet({ mode: "closed" });
    } catch (error) {
      if (error instanceof ApiError) setFormError(error.message);
      throw error;
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // خطا در dialog می‌ماند
    }
  }

  async function handleTest(provider: MapProvider) {
    const result = await testMutation.mutateAsync(provider.id);
    setTestResults((prev) => ({ ...prev, [provider.id]: result }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <SheetTrigger
          onClick={() => {
            setFormError(null);
            setSheet({ mode: "create" });
          }}
        >
          افزودن Provider
        </SheetTrigger>
      </div>

      <Panel>
        {isLoading && <p className="p-4 text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>}
        {isError && <p className="p-4 text-sm text-[var(--color-danger)]">خطا در بارگذاری Providerهای نقشه.</p>}
        {!isLoading && !isError && (items?.length ?? 0) === 0 && (
          <p className="p-4 text-sm text-[var(--color-text-muted)]">
            هنوز هیچ Provider نقشه‌ای ثبت نشده است. برای مشاهده نقشه در «نقشه عملیات»، یک Provider داخلی اضافه کنید.
          </p>
        )}
        {!isLoading && !isError && (items?.length ?? 0) > 0 && (
          <ul className="divide-y divide-[var(--color-panel-border)]">
            {items!.map((provider) => {
              const health = healthLabel[provider.healthStatus];
              const testResult = testResults[provider.id];
              return (
                <li key={provider.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-[var(--color-text)]">{provider.name}</span>
                    <StatusBadge tone="info" label={kindLabel[provider.kind]} />
                    {provider.isDefault && <StatusBadge tone="primary" label="پیش‌فرض" />}
                    {!provider.isEnabled && <StatusBadge tone="danger" label="غیرفعال" />}
                    <StatusBadge tone={health.tone} label={health.label} />
                  </div>
                  <p className="ltr-inline truncate text-xs text-[var(--color-text-subtle)]">{provider.urlTemplate}</p>
                  {testResult && (
                    <p className={`text-xs ${testResult.success ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
                      {testResult.message}
                    </p>
                  )}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleTest(provider)}
                      disabled={testMutation.isPending}
                      className="rounded-lg border border-[var(--color-panel-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)] disabled:opacity-60"
                    >
                      تست اتصال
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormError(null);
                        setSheet({ mode: "edit", item: provider });
                      }}
                      aria-label={`ویرایش ${provider.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)]"
                    >
                      <Icon name="pencil" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(provider)}
                      aria-label={`حذف ${provider.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Sheet
        open={sheet.mode !== "closed"}
        onClose={() => setSheet({ mode: "closed" })}
        title={sheet.mode === "edit" ? "ویرایش Provider نقشه" : "افزودن Provider نقشه"}
      >
        {sheet.mode !== "closed" && (
          <MapProviderForm
            mode={sheet.mode}
            defaultValues={sheet.mode === "edit" ? mapProviderToFormValues(sheet.item) : emptyMapProviderFormValues()}
            onSubmit={handleSubmit}
            onCancel={() => setSheet({ mode: "closed" })}
            pending={createMutation.isPending || updateMutation.isPending}
            serverError={formError}
          />
        )}
      </Sheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف Provider نقشه"
        description={deleteTarget ? `«${deleteTarget.name}» حذف (غیرفعال) می‌شود.` : ""}
        confirmLabel="حذف"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
