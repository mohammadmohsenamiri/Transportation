"use client";

import { useMemo, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { Panel } from "@/components/ui/panel";
import { Icon } from "@/components/ui/icons";
import { useCargoTypes } from "@/features/fleet/use-fleet-queries";
import { useOrganizationUnitsByLevel, useOrganizationUnitsFlat } from "@/features/organization/use-organization-queries";
import { useActiveMapProvider } from "@/features/map/use-map-queries";
import type { DrawPoint } from "@/features/routes/route-draw-map-inner";
import type { ShipmentPayload, ShipmentUpdatePayload } from "@/features/shipments/api";
import type { Shipment, ShipmentDestinationMode, ShipmentStatusValue } from "@/features/shipments/types";
import { shipmentStatusLabel, shipmentStatusValues } from "@/features/shipments/status-labels";
import { ApiError } from "@/lib/http/api-client-error";

const RouteDrawMapInner = dynamic(
  () => import("@/features/routes/route-draw-map-inner").then((mod) => mod.RouteDrawMapInner),
  { ssr: false, loading: () => <MapLoadingState /> },
);

function MapLoadingState() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-[var(--color-text-muted)]">
      در حال بارگذاری نقشه...
    </div>
  );
}

const fieldLabelClass = "text-xs font-medium text-[var(--color-text)]";
const inputClass = "mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]";

export interface ShipmentFormValues {
  trackingCode: string;
  title: string;
  cargoTypeId: string;
  originWarehouseId: string;
  destinationMode: ShipmentDestinationMode;
  destinationOrganizationUnitId: string;
  destinationTitle: string;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  weightKg: string;
  volumeM3: string;
  notes: string;
  status: ShipmentStatusValue;
  isActive: boolean;
}

export function emptyShipmentFormValues(): ShipmentFormValues {
  return {
    trackingCode: "",
    title: "",
    cargoTypeId: "",
    originWarehouseId: "",
    destinationMode: "ORGANIZATION_UNIT",
    destinationOrganizationUnitId: "",
    destinationTitle: "",
    destinationLatitude: null,
    destinationLongitude: null,
    weightKg: "",
    volumeM3: "",
    notes: "",
    status: "DRAFT",
    isActive: true,
  };
}

export function shipmentToFormValues(shipment: Shipment): ShipmentFormValues {
  return {
    trackingCode: shipment.trackingCode,
    title: shipment.title,
    cargoTypeId: shipment.cargoTypeId,
    originWarehouseId: shipment.originWarehouseId,
    destinationMode: shipment.destinationMode,
    destinationOrganizationUnitId: shipment.destinationOrganizationUnitId ?? "",
    destinationTitle: shipment.destinationMode === "COORDINATES" ? shipment.destinationTitle : "",
    destinationLatitude: shipment.destinationMode === "COORDINATES" ? shipment.destinationLatitude : null,
    destinationLongitude: shipment.destinationMode === "COORDINATES" ? shipment.destinationLongitude : null,
    weightKg: shipment.weightKg === null ? "" : String(shipment.weightKg),
    volumeM3: shipment.volumeM3 === null ? "" : String(shipment.volumeM3),
    notes: shipment.notes ?? "",
    status: shipment.status,
    isActive: shipment.isActive,
  };
}

export function formValuesToPayload(values: ShipmentFormValues): ShipmentPayload {
  return {
    trackingCode: values.trackingCode.trim() || null,
    title: values.title.trim(),
    cargoTypeId: values.cargoTypeId,
    originWarehouseId: values.originWarehouseId,
    destinationMode: values.destinationMode,
    destinationOrganizationUnitId: values.destinationMode === "ORGANIZATION_UNIT" ? values.destinationOrganizationUnitId || null : null,
    destinationTitle: values.destinationMode === "COORDINATES" ? values.destinationTitle.trim() || null : null,
    destinationLatitude: values.destinationMode === "COORDINATES" ? values.destinationLatitude : null,
    destinationLongitude: values.destinationMode === "COORDINATES" ? values.destinationLongitude : null,
    weightKg: values.weightKg.trim() === "" ? null : Number(values.weightKg),
    volumeM3: values.volumeM3.trim() === "" ? null : Number(values.volumeM3),
    notes: values.notes.trim() || null,
  };
}

export function formValuesToUpdatePayload(values: ShipmentFormValues): ShipmentUpdatePayload {
  return {
    ...formValuesToPayload(values),
    status: values.status,
    isActive: values.isActive,
  };
}

export interface ShipmentFormProps {
  mode: "create" | "edit";
  values: ShipmentFormValues;
  onChange: (values: ShipmentFormValues) => void;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  pending: boolean;
  serverError: string | null;
  fieldErrors: Record<string, string>;
}

export function ShipmentForm({ mode, values, onChange, onSubmit, onCancel, pending, serverError, fieldErrors }: ShipmentFormProps) {
  const cargoTypesQuery = useCargoTypes();
  const warehousesQuery = useOrganizationUnitsByLevel("WAREHOUSE");
  const [destinationSearch, setDestinationSearch] = useState("");
  const destinationUnitsQuery = useOrganizationUnitsFlat(destinationSearch || undefined);
  const providerQuery = useActiveMapProvider();
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 32.4279, lng: 53.688 });

  function patch(partial: Partial<ShipmentFormValues>) {
    onChange({ ...values, ...partial });
  }

  const originUnit = useMemo(
    () => (warehousesQuery.data ?? []).find((u) => u.id === values.originWarehouseId) ?? null,
    [warehousesQuery.data, values.originWarehouseId],
  );

  const destinationUnit = useMemo(
    () => (destinationUnitsQuery.data ?? []).find((u) => u.id === values.destinationOrganizationUnitId) ?? null,
    [destinationUnitsQuery.data, values.destinationOrganizationUnitId],
  );

  const previewPoints = useMemo<DrawPoint[]>(() => {
    const points: DrawPoint[] = [];
    if (originUnit?.latitude !== null && originUnit?.latitude !== undefined && originUnit?.longitude !== null && originUnit?.longitude !== undefined) {
      points.push({ sequence: 1, latitude: originUnit.latitude, longitude: originUnit.longitude, label: "مبدأ" });
    }
    if (values.destinationMode === "ORGANIZATION_UNIT") {
      if (destinationUnit?.latitude !== null && destinationUnit?.latitude !== undefined && destinationUnit?.longitude !== null && destinationUnit?.longitude !== undefined) {
        points.push({ sequence: 2, latitude: destinationUnit.latitude, longitude: destinationUnit.longitude, label: "مقصد" });
      }
    } else if (values.destinationLatitude !== null && values.destinationLongitude !== null) {
      points.push({ sequence: 2, latitude: values.destinationLatitude, longitude: values.destinationLongitude, label: "مقصد" });
    }
    return points;
  }, [originUnit, destinationUnit, values.destinationMode, values.destinationLatitude, values.destinationLongitude]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {serverError && (
        <div className="rounded-xl bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">{serverError}</div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={fieldLabelClass}>
          عنوان مرسوله
          <input value={values.title} onChange={(e) => patch({ title: e.target.value })} className={inputClass} placeholder="محموله لوازم اداری" />
          {fieldErrors.title && <p className="mt-1 text-xs text-[var(--color-danger)]">{fieldErrors.title}</p>}
        </label>
        <label className={fieldLabelClass}>
          کد رهگیری {mode === "create" && "(اختیاری)"}
          <input
            value={values.trackingCode}
            onChange={(e) => patch({ trackingCode: e.target.value })}
            disabled={mode === "edit"}
            dir="ltr"
            className={`ltr-inline ${inputClass} disabled:opacity-60`}
            placeholder="خالی بگذارید برای تولید خودکار"
          />
          {fieldErrors.trackingCode && <p className="mt-1 text-xs text-[var(--color-danger)]">{fieldErrors.trackingCode}</p>}
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={fieldLabelClass}>
          نوع بار
          <select value={values.cargoTypeId} onChange={(e) => patch({ cargoTypeId: e.target.value })} className={inputClass}>
            <option value="">انتخاب کنید...</option>
            {(cargoTypesQuery.data ?? []).map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          {fieldErrors.cargoTypeId && <p className="mt-1 text-xs text-[var(--color-danger)]">{fieldErrors.cargoTypeId}</p>}
        </label>
        <label className={fieldLabelClass}>
          انبار مبدأ
          <select value={values.originWarehouseId} onChange={(e) => patch({ originWarehouseId: e.target.value })} className={inputClass}>
            <option value="">انتخاب کنید...</option>
            {(warehousesQuery.data ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
          {fieldErrors.originWarehouseId && <p className="mt-1 text-xs text-[var(--color-danger)]">{fieldErrors.originWarehouseId}</p>}
        </label>
      </div>

      <div className="rounded-xl border border-[var(--color-panel-border)] p-3">
        <p className={fieldLabelClass}>مقصد</p>
        <div className="mt-2 flex w-fit rounded-xl border border-[var(--color-panel-border)] p-1">
          <button
            type="button"
            onClick={() => patch({ destinationMode: "ORGANIZATION_UNIT" })}
            aria-pressed={values.destinationMode === "ORGANIZATION_UNIT"}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              values.destinationMode === "ORGANIZATION_UNIT"
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            گره سازمانی
          </button>
          <button
            type="button"
            onClick={() => patch({ destinationMode: "COORDINATES" })}
            aria-pressed={values.destinationMode === "COORDINATES"}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              values.destinationMode === "COORDINATES"
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            مختصات آزاد
          </button>
        </div>

        {values.destinationMode === "ORGANIZATION_UNIT" ? (
          <div className="mt-3 flex flex-col gap-2">
            <input
              value={destinationSearch}
              onChange={(e) => setDestinationSearch(e.target.value)}
              placeholder="جست‌وجوی گره سازمانی..."
              className={inputClass}
            />
            <select
              value={values.destinationOrganizationUnitId}
              onChange={(e) => patch({ destinationOrganizationUnitId: e.target.value })}
              className={inputClass}
            >
              <option value="">انتخاب کنید...</option>
              {(destinationUnitsQuery.data ?? []).map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
            {fieldErrors.destinationOrganizationUnitId && (
              <p className="text-xs text-[var(--color-danger)]">{fieldErrors.destinationOrganizationUnitId}</p>
            )}
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <label className={fieldLabelClass}>
              عنوان مقصد
              <input value={values.destinationTitle} onChange={(e) => patch({ destinationTitle: e.target.value })} className={inputClass} placeholder="انبار موقت اصفهان" />
              {fieldErrors.destinationTitle && <p className="mt-1 text-xs text-[var(--color-danger)]">{fieldErrors.destinationTitle}</p>}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={fieldLabelClass}>
                عرض جغرافیایی
                <input
                  type="number"
                  step="0.000001"
                  value={values.destinationLatitude ?? ""}
                  onChange={(e) => patch({ destinationLatitude: e.target.value === "" ? null : Number(e.target.value) })}
                  className={`ltr-inline ${inputClass}`}
                />
                {fieldErrors.destinationLatitude && <p className="mt-1 text-xs text-[var(--color-danger)]">{fieldErrors.destinationLatitude}</p>}
              </label>
              <label className={fieldLabelClass}>
                طول جغرافیایی
                <input
                  type="number"
                  step="0.000001"
                  value={values.destinationLongitude ?? ""}
                  onChange={(e) => patch({ destinationLongitude: e.target.value === "" ? null : Number(e.target.value) })}
                  className={`ltr-inline ${inputClass}`}
                />
                {fieldErrors.destinationLongitude && <p className="mt-1 text-xs text-[var(--color-danger)]">{fieldErrors.destinationLongitude}</p>}
              </label>
            </div>
            <button
              type="button"
              onClick={() => patch({ destinationLatitude: mapCenter.lat, destinationLongitude: mapCenter.lng })}
              className="w-fit rounded-xl border border-[var(--color-panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)]"
            >
              <Icon name="plus" className="me-1 inline h-3.5 w-3.5" />
              قراردادن مقصد در مرکز نقشه
            </button>
            <p className="text-[11px] text-[var(--color-text-subtle)]">
              می‌توانید روی نقشه Tap/Click کنید تا مقصد در همان نقطه ثبت شود.
            </p>
          </div>
        )}
      </div>

      <Panel className="h-[280px] overflow-hidden sm:h-[320px]">
        {providerQuery.isLoading ? (
          <MapLoadingState />
        ) : !providerQuery.data ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--color-text-muted)]">
            Provider نقشه تنظیم نشده است.
          </div>
        ) : (
          <RouteDrawMapInner
            provider={providerQuery.data}
            points={previewPoints}
            editable={false}
            onMapClick={({ lat, lng }) => {
              if (values.destinationMode === "COORDINATES") {
                patch({ destinationLatitude: lat, destinationLongitude: lng });
              }
            }}
            onPointDragEnd={() => {}}
            onCenterChange={setMapCenter}
          />
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={fieldLabelClass}>
          وزن (کیلوگرم، اختیاری)
          <input
            type="number"
            step="0.01"
            value={values.weightKg}
            onChange={(e) => patch({ weightKg: e.target.value })}
            className={`ltr-inline ${inputClass}`}
          />
          {fieldErrors.weightKg && <p className="mt-1 text-xs text-[var(--color-danger)]">{fieldErrors.weightKg}</p>}
        </label>
        <label className={fieldLabelClass}>
          حجم (مترمکعب، اختیاری)
          <input
            type="number"
            step="0.001"
            value={values.volumeM3}
            onChange={(e) => patch({ volumeM3: e.target.value })}
            className={`ltr-inline ${inputClass}`}
          />
          {fieldErrors.volumeM3 && <p className="mt-1 text-xs text-[var(--color-danger)]">{fieldErrors.volumeM3}</p>}
        </label>
      </div>

      <label className={fieldLabelClass}>
        توضیحات
        <textarea value={values.notes} onChange={(e) => patch({ notes: e.target.value })} rows={2} className={inputClass} />
      </label>

      {mode === "edit" && (
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
          <label className={fieldLabelClass}>
            وضعیت مرسوله
            <select value={values.status} onChange={(e) => patch({ status: e.target.value as ShipmentStatusValue })} className={inputClass}>
              {shipmentStatusValues.map((status) => (
                <option key={status} value={status}>
                  {shipmentStatusLabel[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-[var(--color-text)]">
            <input type="checkbox" checked={values.isActive} onChange={(e) => patch({ isActive: e.target.checked })} className="h-4 w-4 rounded" />
            فعال
          </label>
        </div>
      )}

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-[var(--color-panel-border)] px-3.5 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)]"
        >
          انصراف
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] disabled:opacity-60"
        >
          {pending ? "در حال ذخیره..." : mode === "create" ? "ایجاد مرسوله" : "ذخیره تغییرات"}
        </button>
      </div>
    </form>
  );
}

export function extractShipmentFieldErrors(error: unknown): { message: string; fieldErrors: Record<string, string> } {
  if (error instanceof ApiError) {
    return { message: error.message, fieldErrors: error.fieldErrors };
  }
  return { message: "خطایی رخ داد.", fieldErrors: {} };
}
