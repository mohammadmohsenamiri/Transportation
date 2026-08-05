"use client";

import { useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCargoTypes } from "@/features/fleet/use-fleet-queries";
import { useShipments, useShipmentSummary, useDeleteShipment } from "@/features/shipments/use-shipment-queries";
import { shipmentStatusLabel, shipmentStatusTone, shipmentStatusValues } from "@/features/shipments/status-labels";
import type { Shipment } from "@/features/shipments/types";

export function ShipmentsListView({ canManage }: { canManage: boolean }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cargoTypeFilter, setCargoTypeFilter] = useState("");

  const { data: summary } = useShipmentSummary();
  const cargoTypesQuery = useCargoTypes();
  const {
    data: shipments,
    isLoading,
    isError,
  } = useShipments({ q: query || undefined, status: statusFilter || undefined, cargoTypeId: cargoTypeFilter || undefined });

  const [deleteTarget, setDeleteTarget] = useState<Shipment | null>(null);
  const deleteMutation = useDeleteShipment();

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // خطا در dialog می‌ماند
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">مرسوله‌ها</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">تعریف و مدیریت مرسوله‌های مستقل از مأموریت</p>
        </div>
        {canManage && (
          <Link
            href="/shipments/new"
            className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary-foreground)]"
          >
            <Icon name="plus" className="h-4 w-4" />
            مرسوله جدید
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon="package" tone="primary" label="کل مرسوله‌ها" value={(summary?.total ?? 0).toLocaleString("fa-IR")} />
        <StatCard
          icon="clock"
          tone="warning"
          label="در انتظار ارسال"
          value={(summary?.waitingForDispatch ?? 0).toLocaleString("fa-IR")}
        />
        <StatCard icon="truck" tone="info" label="در مسیر" value={(summary?.inTransit ?? 0).toLocaleString("fa-IR")} />
        <StatCard icon="ready" tone="success" label="تحویل‌شده" value={(summary?.delivered ?? 0).toLocaleString("fa-IR")} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2">
          <Icon name="search" className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جست‌وجو بر اساس کد رهگیری، عنوان یا مقصد..."
            className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="">همه وضعیت‌ها</option>
          {shipmentStatusValues.map((status) => (
            <option key={status} value={status}>
              {shipmentStatusLabel[status]}
            </option>
          ))}
        </select>
        <select
          value={cargoTypeFilter}
          onChange={(e) => setCargoTypeFilter(e.target.value)}
          className="rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="">همه انواع بار</option>
          {(cargoTypesQuery.data ?? []).map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      <Panel>
        {isLoading && <p className="p-4 text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>}
        {isError && <p className="p-4 text-sm text-[var(--color-danger)]">خطا در بارگذاری مرسوله‌ها.</p>}
        {!isLoading && !isError && (shipments?.length ?? 0) === 0 && (
          <p className="p-4 text-sm text-[var(--color-text-muted)]">هیچ مرسوله‌ای با این فیلترها یافت نشد.</p>
        )}
        {!isLoading && !isError && (shipments?.length ?? 0) > 0 && (
          <>
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="text-right text-xs text-[var(--color-text-muted)]">
                  <th className="py-2 ps-4 font-medium">کد رهگیری</th>
                  <th className="py-2 font-medium">عنوان</th>
                  <th className="py-2 font-medium">نوع بار</th>
                  <th className="py-2 font-medium">مبدأ</th>
                  <th className="py-2 font-medium">مقصد</th>
                  <th className="py-2 font-medium">وضعیت</th>
                  <th className="w-20 py-2 pe-4 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {shipments!.map((shipment) => (
                  <tr key={shipment.id} className="border-t border-[var(--color-panel-border)]">
                    <td className="py-2.5 ps-4">
                      <Link
                        href={`/shipments/${shipment.id}`}
                        className="ltr-inline font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]"
                      >
                        {shipment.trackingCode}
                      </Link>
                    </td>
                    <td className="py-2.5 text-[var(--color-text)]">{shipment.title}</td>
                    <td className="py-2.5 text-[var(--color-text-muted)]">{shipment.cargoTypeName}</td>
                    <td className="py-2.5 text-[var(--color-text-muted)]">{shipment.originWarehouseName}</td>
                    <td className="py-2.5 text-[var(--color-text-muted)]">{shipment.destinationTitle}</td>
                    <td className="py-2.5">
                      <StatusBadge tone={shipmentStatusTone[shipment.status]} label={shipmentStatusLabel[shipment.status]} />
                    </td>
                    <td className="py-2.5 pe-4">
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(shipment)}
                          aria-label={`حذف مرسوله ${shipment.title}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="flex flex-col gap-3 p-3 md:hidden">
              {shipments!.map((shipment) => (
                <li key={shipment.id} className="rounded-xl border border-[var(--color-panel-border)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/shipments/${shipment.id}`} className="ltr-inline text-sm font-medium text-[var(--color-text)]">
                      {shipment.trackingCode}
                    </Link>
                    <StatusBadge tone={shipmentStatusTone[shipment.status]} label={shipmentStatusLabel[shipment.status]} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text)]">{shipment.title}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {shipment.originWarehouseName} ← {shipment.destinationTitle}
                  </p>
                  {canManage && (
                    <div className="mt-3 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(shipment)}
                        aria-label={`حذف مرسوله ${shipment.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف مرسوله"
        description={deleteTarget ? `مرسوله «${deleteTarget.title}» حذف (غیرفعال) می‌شود.` : ""}
        confirmLabel="حذف"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
