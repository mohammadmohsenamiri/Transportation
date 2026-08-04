"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  levelLabel,
  organizationLevelValues,
  requiredParentLevel,
  type OrganizationLevelValue,
} from "@/features/organization/level-labels";
import { useOrganizationUnitsByLevel } from "@/features/organization/use-organization-queries";
import type { OrganizationUnit } from "@/features/organization/types";
import { ApiError } from "@/features/organization/types";

const numericFieldSchema = z
  .string()
  .refine((value) => value.trim() === "" || !Number.isNaN(Number(value)), "مقدار عددی نامعتبر است.");

const formSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "کد الزامی است.")
    .max(50, "کد نباید بیش از ۵۰ کاراکتر باشد.")
    .regex(/^[A-Za-z0-9_-]+$/, "کد فقط می‌تواند شامل حروف/اعداد انگلیسی، خط تیره و زیرخط باشد."),
  name: z.string().trim().min(1, "نام الزامی است.").max(200, "نام نباید بیش از ۲۰۰ کاراکتر باشد."),
  level: z.enum(organizationLevelValues),
  parentId: z.string().nullable(),
  latitude: numericFieldSchema,
  longitude: numericFieldSchema,
  address: z.string().max(500).optional(),
  isActive: z.boolean(),
});

export type OrganizationFormValues = z.infer<typeof formSchema>;

interface OrganizationFormProps {
  mode: "create" | "edit";
  defaultValues: OrganizationFormValues;
  onSubmit: (values: OrganizationFormValues) => Promise<void>;
  onCancel: () => void;
  pending: boolean;
  serverError?: string | null;
}

export function OrganizationForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  pending,
  serverError,
}: OrganizationFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const level = watch("level");
  const parentLevel = requiredParentLevel[level];
  const parentOptions = useOrganizationUnitsByLevel(parentLevel);

  useEffect(() => {
    if (parentLevel === null) {
      setValue("parentId", null);
    }
  }, [parentLevel, setValue]);

  // `<select {...register("parentId")}>` is uncontrolled: RHF sets the DOM value once at
  // mount, but the pre-filled parent (e.g. from "افزودن زیرمجموعه") only becomes a valid
  // <option> once parentOptions finishes loading asynchronously — so it must be re-applied.
  const appliedInitialParent = useRef(false);
  useEffect(() => {
    if (appliedInitialParent.current) return;
    if (!defaultValues.parentId || !parentOptions.data) return;
    if (parentOptions.data.some((unit) => unit.id === defaultValues.parentId)) {
      setValue("parentId", defaultValues.parentId);
      appliedInitialParent.current = true;
    }
  }, [parentOptions.data, defaultValues.parentId, setValue]);

  async function handleFormSubmit(values: OrganizationFormValues) {
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field in values) {
            setError(field as keyof OrganizationFormValues, { message });
          }
        }
        if (Object.keys(error.fieldErrors).length === 0) {
          setError("root", { message: error.message });
        }
      }
    }
  }

  const latitudeValue = watch("latitude");
  const longitudeValue = watch("longitude");

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
      {(serverError || errors.root) && (
        <div className="rounded-xl bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {serverError ?? errors.root?.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="کد" error={errors.code?.message}>
          <input
            {...register("code")}
            disabled={mode === "edit"}
            dir="ltr"
            className="ltr-inline w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-60"
          />
        </Field>
        <Field label="سطح" error={undefined}>
          <select
            {...register("level")}
            disabled={mode === "edit"}
            className="w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-60"
          >
            {organizationLevelValues.map((value) => (
              <option key={value} value={value}>
                {levelLabel[value]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="نام" error={errors.name?.message}>
        <input
          {...register("name")}
          className="w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </Field>

      {parentLevel && (
        <Field label={`والد (${levelLabel[parentLevel]})`} error={errors.parentId?.message}>
          <select
            {...register("parentId")}
            className="w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
          >
            <option value="">انتخاب کنید...</option>
            {(parentOptions.data ?? []).map((unit: OrganizationUnit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.code})
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="عرض جغرافیایی (Latitude)" error={errors.latitude?.message}>
          <input
            {...register("latitude")}
            dir="ltr"
            placeholder="مثال: 35.6892"
            className="ltr-inline w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </Field>
        <Field label="طول جغرافیایی (Longitude)" error={errors.longitude?.message}>
          <input
            {...register("longitude")}
            dir="ltr"
            placeholder="مثال: 51.3890"
            className="ltr-inline w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </Field>
      </div>

      {latitudeValue?.trim() && longitudeValue?.trim() && !errors.latitude && !errors.longitude && (
        <div className="rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
          پیش‌نمایش مختصات:{" "}
          <span className="ltr-inline tabular-nums font-medium text-[var(--color-text)]">
            {latitudeValue}, {longitudeValue}
          </span>{" "}
          — نمایش روی نقشه در Phase 4 اضافه می‌شود.
        </div>
      )}

      <Field label="آدرس" error={undefined}>
        <textarea
          {...register("address")}
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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs">
      <span className="font-medium text-[var(--color-text)]">{label}</span>
      {children}
      {error && <span className="text-[var(--color-danger)]">{error}</span>}
    </label>
  );
}

export function emptyFormValues(level: OrganizationLevelValue, parentId: string | null): OrganizationFormValues {
  return { code: "", name: "", level, parentId, latitude: "", longitude: "", address: "", isActive: true };
}

export function unitToFormValues(unit: OrganizationUnit): OrganizationFormValues {
  return {
    code: unit.code,
    name: unit.name,
    level: unit.level,
    parentId: unit.parentId,
    latitude: unit.latitude === null ? "" : String(unit.latitude),
    longitude: unit.longitude === null ? "" : String(unit.longitude),
    address: unit.address ?? "",
    isActive: unit.isActive,
  };
}
