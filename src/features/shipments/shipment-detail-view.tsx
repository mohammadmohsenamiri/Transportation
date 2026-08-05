"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useShipmentDetail,
  useUpdateShipment,
  useDeleteShipment,
} from "@/features/shipments/use-shipment-queries";
import { useActiveMapProvider } from "@/features/map/use-map-queries";
import {
  ShipmentForm,
  shipmentToFormValues,
  formValuesToUpdatePayload,
  extractShipmentFieldErrors,
  type ShipmentFormValues,
} from "@/features/shipments/shipment-form";
import { ShipmentHistory } from "@/features/shipments/shipment-history";
import { shipmentStatusLabel, shipmentStatusTone } from "@/features/shipments/status-labels";
import type { DrawPoint } from "@/features/routes/route-draw-map-inner";

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

function noop() {}

export function ShipmentDetailView({ shipmentId, canManage }: { shipmentId: string; canManage: boolean }) {
  const router = useRouter();
  const { data: shipment, isLoading, isError } = useShipmentDetail(shipmentId);
  const providerQuery = useActiveMapProvider();

  const [editing, setEditing] = useState(false);
  const [formValues, setFormValues] = useState<ShipmentFormValues | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const updateMutation = useUpdateShipment();
  const deleteMutation = useDeleteShipment();

  function startEditing() {
    if (!shipment) return;
    setFormValues(shipmentToFormValues(shipment));
    setServerError(null);
    setFieldErrors({});
    setEditing(true);
  }

  async function handleSubmit() {
    if (!formValues) return;
    setServerError(null);
    setFieldErrors({});
    try {
      await updateMutation.mutateAsync({ id: shipmentId, payload: formValuesToUpdatePayload(formValues) });
      setEditing(false);
    } catch (error) {
      const { message, fieldErrors: errors } = extractShipmentFieldErrors(error);
      setFieldErrors(errors);
      if (Object.keys(errors).length === 0) setServerError(message);
    }
  }

  async function handleConfirmDelete() {
    try {
      await deleteMutation.mutateAsync(shipmentId);
      router.push("/shipments");
    } catch {
      setDeleteConfirm(false);
    }
  }

  if (isLoading) return <p className="p-4 text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>;
  if (isError || !shipment) return <p className="p-4 text-sm text-[var(--color-danger)]">مرسوله یافت نشد.</p>;

  const previewPoints: DrawPoint[] = [];
  if (shipment.originLatitude !== null && shipment.originLongitude !== null) {
    previewPoints.push({ sequence: 1, latitude: shipment.originLatitude, longitude: shipment.originLongitude, label: "مبدأ" });
  }
  previewPoints.push({ sequence: 2, latitude: shipment.destinationLatitude, longitude: shipment.destinationLongitude, label: "مقصد" });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/shipments"
            aria-label="بازگشت به فهرست مرسوله‌ها"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
          >
            <Icon name="chevron-left" className="h-5 w-5 rotate-180" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">{shipment.title}</h1>
            <p className="ltr-inline mt-1 text-xs text-[var(--color-text-muted)]">{shipment.trackingCode}</p>
          </div>
        </div>
        {canManage && !editing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startEditing}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--color-panel-border)] px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)]"
            >
              <Icon name="pencil" className="h-4 w-4" />
              ویرایش
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--color-panel-border)] px-3 py-2 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
            >
              <Icon name="trash" className="h-4 w-4" />
              حذف
            </button>
          </div>
        )}
      </div>

      {editing && formValues ? (
        <ShipmentForm
          mode="edit"
          values={formValues}
          onChange={setFormValues}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(false)}
          pending={updateMutation.isPending}
          serverError={serverError}
          fieldErrors={fieldErrors}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Panel className="p-3">
              <p className="text-xs text-[var(--color-text-muted)]">وضعیت</p>
              <div className="mt-1">
                <StatusBadge tone={shipmentStatusTone[shipment.status]} label={shipmentStatusLabel[shipment.status]} />
              </div>
            </Panel>
            <Panel className="p-3">
              <p className="text-xs text-[var(--color-text-muted)]">نوع بار</p>
              <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{shipment.cargoTypeName}</p>
            </Panel>
            <Panel className="p-3">
              <p className="text-xs text-[var(--color-text-muted)]">وزن</p>
              <p className="tabular-nums mt-1 text-sm font-medium text-[var(--color-text)]">
                {shipment.weightKg === null ? "—" : `${shipment.weightKg.toLocaleString("fa-IR")} کیلوگرم`}
              </p>
            </Panel>
            <Panel className="p-3">
              <p className="text-xs text-[var(--color-text-muted)]">حجم</p>
              <p className="tabular-nums mt-1 text-sm font-medium text-[var(--color-text)]">
                {shipment.volumeM3 === null ? "—" : `${shipment.volumeM3.toLocaleString("fa-IR")} m³`}
              </p>
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <Panel className="h-[320px] overflow-hidden sm:h-[380px]">
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
                    onMapClick={noop}
                    onPointDragEnd={noop}
                    onCenterChange={noop}
                  />
                )}
              </Panel>

              <Panel className="p-4">
                <h2 className="text-sm font-bold text-[var(--color-text)]">مبدأ و مقصد</h2>
                <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-[var(--color-text-muted)]">مبدأ (انبار)</dt>
                    <dd className="mt-0.5 text-[var(--color-text)]">{shipment.originWarehouseName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--color-text-muted)]">مقصد</dt>
                    <dd className="mt-0.5 text-[var(--color-text)]">{shipment.destinationTitle}</dd>
                  </div>
                </dl>
                {shipment.notes && (
                  <div className="mt-3">
                    <dt className="text-xs text-[var(--color-text-muted)]">توضیحات</dt>
                    <dd className="mt-0.5 text-sm text-[var(--color-text)]">{shipment.notes}</dd>
                  </div>
                )}
              </Panel>
            </div>

            <Panel className="p-4">
              <h2 className="text-sm font-bold text-[var(--color-text)]">تاریخچه</h2>
              <div className="mt-3">
                <ShipmentHistory shipmentId={shipment.id} />
              </div>
            </Panel>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteConfirm}
        title="حذف مرسوله"
        description={`مرسوله «${shipment.title}» حذف (غیرفعال) می‌شود.`}
        confirmLabel="حذف"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}
