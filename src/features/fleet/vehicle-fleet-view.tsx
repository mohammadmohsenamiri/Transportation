"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icons";
import {
  VehicleForm,
  emptyVehicleFormValues,
  vehicleToFormValues,
  type VehicleFormValues,
} from "@/features/fleet/vehicle-form";
import {
  useVehicles,
  useVehicleTypes,
  useFleetSummary,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
} from "@/features/fleet/use-fleet-queries";
import type { Vehicle } from "@/features/fleet/types";
import { ApiError } from "@/lib/http/api-client-error";

type SheetState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; item: Vehicle };

const readinessLabel: Record<Vehicle["readiness"], string> = {
  READY: "آماده",
  OUT_OF_SERVICE: "خارج از سرویس",
};

export function VehicleFleetView() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [readinessFilter, setReadinessFilter] = useState("");

  const { data: summary } = useFleetSummary();
  const vehicleTypes = useVehicleTypes();
  const { data: vehicles, isLoading, isError } = useVehicles({
    q: query || undefined,
    vehicleTypeId: typeFilter || undefined,
    readiness: readinessFilter || undefined,
  });

  const [sheet, setSheet] = useState<SheetState>({ mode: "closed" });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);

  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const deleteMutation = useDeleteVehicle();

  async function handleSubmit(values: VehicleFormValues) {
    setFormError(null);
    try {
      if (sheet.mode === "create") {
        await createMutation.mutateAsync({
          identifier: values.identifier,
          plateNumber: values.plateNumber || null,
          vehicleTypeId: values.vehicleTypeId,
          fuelTankLiters: Number(values.fuelTankLiters),
          avgConsumptionPer100Km: Number(values.avgConsumptionPer100Km),
          avgSpeedKmh: Number(values.avgSpeedKmh),
          readiness: values.readiness,
          notes: values.notes || null,
        });
      } else if (sheet.mode === "edit") {
        await updateMutation.mutateAsync({
          id: sheet.item.id,
          payload: {
            plateNumber: values.plateNumber || null,
            vehicleTypeId: values.vehicleTypeId,
            fuelTankLiters: Number(values.fuelTankLiters),
            avgConsumptionPer100Km: Number(values.avgConsumptionPer100Km),
            avgSpeedKmh: Number(values.avgSpeedKmh),
            readiness: values.readiness,
            notes: values.notes || null,
            isActive: values.isActive,
          },
        });
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

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon="truck" tone="info" label="کل خودروها" value={(summary?.total ?? 0).toLocaleString("fa-IR")} />
        <StatCard icon="ready" tone="success" label="خودروهای آماده" value={(summary?.ready ?? 0).toLocaleString("fa-IR")} />
        <StatCard
          icon="alert"
          tone="danger"
          label="خارج از سرویس"
          value={(summary?.outOfService ?? 0).toLocaleString("fa-IR")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2">
          <Icon name="search" className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جست‌وجو بر اساس شناسه یا پلاک..."
            className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="">همه انواع خودرو</option>
          {(vehicleTypes.data ?? []).map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        <select
          value={readinessFilter}
          onChange={(event) => setReadinessFilter(event.target.value)}
          className="rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="READY">آماده</option>
          <option value="OUT_OF_SERVICE">خارج از سرویس</option>
        </select>
        <SheetTrigger
          onClick={() => {
            setFormError(null);
            setSheet({ mode: "create" });
          }}
        >
          افزودن خودرو
        </SheetTrigger>
      </div>

      <Panel>
        {isLoading && <p className="p-4 text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>}
        {isError && <p className="p-4 text-sm text-[var(--color-danger)]">خطا در بارگذاری ناوگان.</p>}
        {!isLoading && !isError && (vehicles?.length ?? 0) === 0 && (
          <p className="p-4 text-sm text-[var(--color-text-muted)]">هیچ خودرویی با این فیلترها یافت نشد.</p>
        )}
        {!isLoading && !isError && (vehicles?.length ?? 0) > 0 && (
          <>
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="text-right text-xs text-[var(--color-text-muted)]">
                  <th className="w-20 py-2" />
                  <th className="py-2 font-medium">شناسه</th>
                  <th className="py-2 font-medium">پلاک</th>
                  <th className="py-2 font-medium">نوع خودرو</th>
                  <th className="py-2 font-medium">وضعیت</th>
                  <th className="py-2 font-medium">ظرفیت باک</th>
                  <th className="py-2 font-medium">مصرف/۱۰۰کیلومتر</th>
                  <th className="py-2 font-medium">سرعت متوسط</th>
                </tr>
              </thead>
              <tbody>
                {vehicles!.map((vehicle) => (
                  <tr key={vehicle.id} className="border-t border-[var(--color-panel-border)]">
                    <td className="py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setFormError(null);
                            setSheet({ mode: "edit", item: vehicle });
                          }}
                          aria-label={`ویرایش خودرو ${vehicle.identifier}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)]"
                        >
                          <Icon name="pencil" className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(vehicle)}
                          aria-label={`حذف خودرو ${vehicle.identifier}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="ltr-inline py-2.5 text-right font-medium text-[var(--color-text)]">
                      {vehicle.identifier}
                    </td>
                    <td className="ltr-inline py-2.5 text-right text-[var(--color-text-muted)]">
                      {vehicle.plateNumber ?? "—"}
                    </td>
                    <td className="py-2.5 text-[var(--color-text)]">{vehicle.vehicleTypeName}</td>
                    <td className="py-2.5">
                      <StatusBadge
                        tone={vehicle.readiness === "READY" ? "success" : "danger"}
                        label={readinessLabel[vehicle.readiness]}
                      />
                    </td>
                    <td className="tabular-nums py-2.5 text-[var(--color-text-muted)]">
                      {vehicle.fuelTankLiters.toLocaleString("fa-IR")} لیتر
                    </td>
                    <td className="tabular-nums py-2.5 text-[var(--color-text-muted)]">
                      {vehicle.avgConsumptionPer100Km.toLocaleString("fa-IR")} لیتر
                    </td>
                    <td className="tabular-nums py-2.5 text-[var(--color-text-muted)]">
                      {vehicle.avgSpeedKmh.toLocaleString("fa-IR")} km/h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="flex flex-col gap-3 p-3 md:hidden">
              {vehicles!.map((vehicle) => (
                <li key={vehicle.id} className="rounded-xl border border-[var(--color-panel-border)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="ltr-inline text-sm font-medium text-[var(--color-text)]">{vehicle.identifier}</span>
                    <StatusBadge
                      tone={vehicle.readiness === "READY" ? "success" : "danger"}
                      label={readinessLabel[vehicle.readiness]}
                    />
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">{vehicle.vehicleTypeName}</p>
                  <div className="mt-3 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFormError(null);
                        setSheet({ mode: "edit", item: vehicle });
                      }}
                      aria-label={`ویرایش خودرو ${vehicle.identifier}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)]"
                    >
                      <Icon name="pencil" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(vehicle)}
                      aria-label={`حذف خودرو ${vehicle.identifier}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <Sheet
        open={sheet.mode !== "closed"}
        onClose={() => setSheet({ mode: "closed" })}
        title={sheet.mode === "edit" ? "ویرایش خودرو" : "افزودن خودرو"}
      >
        {sheet.mode !== "closed" && (
          <VehicleForm
            mode={sheet.mode}
            defaultValues={sheet.mode === "edit" ? vehicleToFormValues(sheet.item) : emptyVehicleFormValues()}
            onSubmit={handleSubmit}
            onCancel={() => setSheet({ mode: "closed" })}
            pending={createMutation.isPending || updateMutation.isPending}
            serverError={formError}
          />
        )}
      </Sheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف خودرو"
        description={deleteTarget ? `«${deleteTarget.identifier}» حذف (غیرفعال) می‌شود.` : ""}
        confirmLabel="حذف"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
