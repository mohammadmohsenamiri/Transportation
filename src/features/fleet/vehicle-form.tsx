"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ApiError } from "@/lib/http/api-client-error";
import { useVehicleTypes } from "@/features/fleet/use-fleet-queries";
import type { Vehicle } from "@/features/fleet/types";

const numericFieldSchema = z
  .string()
  .min(1, "این مقدار الزامی است.")
  .refine((value) => !Number.isNaN(Number(value)), "مقدار عددی نامعتبر است.")
  .refine((value) => Number(value) > 0, "این مقدار باید عددی مثبت باشد.");

const formSchema = z.object({
  identifier: z.string().trim().min(1, "شناسه الزامی است.").max(50, "شناسه نباید بیش از ۵۰ کاراکتر باشد."),
  plateNumber: z.string().trim().max(50).optional(),
  vehicleTypeId: z.string().min(1, "نوع خودرو الزامی است."),
  fuelTankLiters: numericFieldSchema,
  avgConsumptionPer100Km: numericFieldSchema,
  avgSpeedKmh: numericFieldSchema,
  readiness: z.enum(["READY", "OUT_OF_SERVICE"]),
  notes: z.string().trim().max(500).optional(),
  isActive: z.boolean(),
});

export type VehicleFormValues = z.infer<typeof formSchema>;

interface VehicleFormProps {
  mode: "create" | "edit";
  defaultValues: VehicleFormValues;
  onSubmit: (values: VehicleFormValues) => Promise<void>;
  onCancel: () => void;
  pending: boolean;
  serverError?: string | null;
}

export function VehicleForm({ mode, defaultValues, onSubmit, onCancel, pending, serverError }: VehicleFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<VehicleFormValues>({ resolver: zodResolver(formSchema), defaultValues });

  const vehicleTypes = useVehicleTypes();

  async function handleFormSubmit(values: VehicleFormValues) {
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field in values) {
            setError(field as keyof VehicleFormValues, { message });
          }
        }
        if (Object.keys(error.fieldErrors).length === 0) {
          setError("root", { message: error.message });
        }
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
      {(serverError || errors.root) && (
        <div className="rounded-xl bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {serverError ?? errors.root?.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="شناسه یکتا" error={errors.identifier?.message}>
          <input
            {...register("identifier")}
            disabled={mode === "edit"}
            dir="ltr"
            className="ltr-inline w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-60"
          />
        </Field>
        <Field label="پلاک (اختیاری)" error={errors.plateNumber?.message}>
          <input
            {...register("plateNumber")}
            dir="ltr"
            className="ltr-inline w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </Field>
      </div>

      <Field label="نوع خودرو" error={errors.vehicleTypeId?.message}>
        <select
          {...register("vehicleTypeId")}
          className="w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="">انتخاب کنید...</option>
          {(vehicleTypes.data ?? []).map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="ظرفیت باک (لیتر)" error={errors.fuelTankLiters?.message}>
          <input
            {...register("fuelTankLiters")}
            dir="ltr"
            inputMode="decimal"
            className="ltr-inline w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </Field>
        <Field label="مصرف در ۱۰۰ کیلومتر" error={errors.avgConsumptionPer100Km?.message}>
          <input
            {...register("avgConsumptionPer100Km")}
            dir="ltr"
            inputMode="decimal"
            className="ltr-inline w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </Field>
        <Field label="سرعت متوسط (km/h)" error={errors.avgSpeedKmh?.message}>
          <input
            {...register("avgSpeedKmh")}
            dir="ltr"
            inputMode="decimal"
            className="ltr-inline w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </Field>
      </div>

      <Field label="وضعیت آمادگی" error={errors.readiness?.message}>
        <select
          {...register("readiness")}
          className="w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="READY">آماده</option>
          <option value="OUT_OF_SERVICE">خارج از سرویس</option>
        </select>
      </Field>

      <Field label="توضیحات" error={undefined}>
        <textarea
          {...register("notes")}
          rows={2}
          className="w-full resize-none rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </Field>

      {mode === "edit" && (
        <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
          <input type="checkbox" {...register("isActive")} className="h-4 w-4 rounded" />
          فعال
        </label>
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
          {pending ? "در حال ذخیره..." : mode === "create" ? "ایجاد" : "ذخیره تغییرات"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs">
      <span className="font-medium text-[var(--color-text)]">{label}</span>
      {children}
      {error && <span className="text-[var(--color-danger)]">{error}</span>}
    </label>
  );
}

export function emptyVehicleFormValues(): VehicleFormValues {
  return {
    identifier: "",
    plateNumber: "",
    vehicleTypeId: "",
    fuelTankLiters: "",
    avgConsumptionPer100Km: "",
    avgSpeedKmh: "",
    readiness: "READY",
    notes: "",
    isActive: true,
  };
}

export function vehicleToFormValues(vehicle: Vehicle): VehicleFormValues {
  return {
    identifier: vehicle.identifier,
    plateNumber: vehicle.plateNumber ?? "",
    vehicleTypeId: vehicle.vehicleTypeId,
    fuelTankLiters: String(vehicle.fuelTankLiters),
    avgConsumptionPer100Km: String(vehicle.avgConsumptionPer100Km),
    avgSpeedKmh: String(vehicle.avgSpeedKmh),
    readiness: vehicle.readiness,
    notes: vehicle.notes ?? "",
    isActive: vehicle.isActive,
  };
}
