"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ApiError } from "@/lib/http/api-client-error";
import type { MapProvider, MapProviderKind } from "@/features/map-providers/types";

const kindLabel: Record<MapProviderKind, string> = {
  INTERNAL_TMS: "TMS داخلی",
  INTERNAL_XYZ: "XYZ داخلی",
  INTERNAL_WMTS: "WMTS داخلی",
  EXTERNAL_XYZ: "XYZ خارجی (اختیاری)",
};

const kindValues: MapProviderKind[] = ["INTERNAL_TMS", "INTERNAL_XYZ", "INTERNAL_WMTS", "EXTERNAL_XYZ"];

const formSchema = z
  .object({
    name: z.string().trim().min(1, "نام الزامی است.").max(200),
    kind: z.enum(["INTERNAL_TMS", "INTERNAL_XYZ", "INTERNAL_WMTS", "EXTERNAL_XYZ"]),
    urlTemplate: z.string().trim().min(1, "آدرس الزامی است."),
    attribution: z.string().trim().max(300).optional(),
    minZoom: z
      .string()
      .refine((v) => !Number.isNaN(Number(v)), "عدد نامعتبر است.")
      .refine((v) => Number(v) >= 0 && Number(v) <= 24, "بین ۰ تا ۲۴ باشد."),
    maxZoom: z
      .string()
      .refine((v) => !Number.isNaN(Number(v)), "عدد نامعتبر است.")
      .refine((v) => Number(v) >= 0 && Number(v) <= 24, "بین ۰ تا ۲۴ باشد."),
    tileSize: z.enum(["256", "512"]),
    subdomains: z.string().trim().optional(),
    requiresApiKey: z.boolean(),
    secretReference: z.string().trim().max(300).optional(),
    isDefault: z.boolean(),
    isEnabled: z.boolean(),
  })
  .refine((data) => Number(data.minZoom) <= Number(data.maxZoom), {
    message: "حداقل بزرگ‌نمایی باید کمتر یا مساوی حداکثر باشد.",
    path: ["minZoom"],
  });

export type MapProviderFormValues = z.infer<typeof formSchema>;

interface MapProviderFormProps {
  mode: "create" | "edit";
  defaultValues: MapProviderFormValues;
  onSubmit: (values: MapProviderFormValues) => Promise<void>;
  onCancel: () => void;
  pending: boolean;
  serverError?: string | null;
}

export function MapProviderForm({ mode, defaultValues, onSubmit, onCancel, pending, serverError }: MapProviderFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<MapProviderFormValues>({ resolver: zodResolver(formSchema), defaultValues });

  const requiresApiKey = watch("requiresApiKey");

  async function handleFormSubmit(values: MapProviderFormValues) {
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field in values) {
            setError(field as keyof MapProviderFormValues, { message });
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

      <Field label="نام" error={errors.name?.message}>
        <input
          {...register("name")}
          className="w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </Field>

      <Field label="نوع" error={undefined}>
        <select
          {...register("kind")}
          disabled={mode === "edit"}
          className="w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-60"
        >
          {kindValues.map((kind) => (
            <option key={kind} value={kind}>
              {kindLabel[kind]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="قالب آدرس کاشی" error={errors.urlTemplate?.message}>
        <input
          {...register("urlTemplate")}
          dir="ltr"
          placeholder="https://tiles.internal.local/{z}/{x}/{y}.png"
          className="ltr-inline w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
        <span className="text-[11px] text-[var(--color-text-subtle)]">
          باید شامل {"{z}"}، {"{x}"} و {"{y}"} باشد (برای TMS، {"{reverseY}"} هم پذیرفته می‌شود).
        </span>
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="حداقل بزرگ‌نمایی" error={errors.minZoom?.message}>
          <input
            {...register("minZoom")}
            dir="ltr"
            inputMode="numeric"
            className="ltr-inline w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </Field>
        <Field label="حداکثر بزرگ‌نمایی" error={errors.maxZoom?.message}>
          <input
            {...register("maxZoom")}
            dir="ltr"
            inputMode="numeric"
            className="ltr-inline w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </Field>
        <Field label="اندازه کاشی" error={undefined}>
          <select
            {...register("tileSize")}
            className="w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
          >
            <option value="256">۲۵۶</option>
            <option value="512">۵۱۲</option>
          </select>
        </Field>
      </div>

      <Field label="Attribution (اختیاری)" error={undefined}>
        <input
          {...register("attribution")}
          dir="ltr"
          className="ltr-inline w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </Field>

      <Field label="زیردامنه‌ها (اختیاری، با کاما جدا کنید)" error={undefined}>
        <input
          {...register("subdomains")}
          dir="ltr"
          placeholder="a,b,c"
          className="ltr-inline w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
        <input type="checkbox" {...register("requiresApiKey")} className="h-4 w-4 rounded" />
        نیاز به کلید API دارد
      </label>

      {requiresApiKey && (
        <Field label="مرجع کلید (secret reference — نه خود کلید خام)" error={undefined}>
          <input
            {...register("secretReference")}
            dir="ltr"
            className="ltr-inline w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </Field>
      )}

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
          <input type="checkbox" {...register("isEnabled")} className="h-4 w-4 rounded" />
          فعال
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
          <input type="checkbox" {...register("isDefault")} className="h-4 w-4 rounded" />
          Provider پیش‌فرض
        </label>
      </div>

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

export function emptyMapProviderFormValues(): MapProviderFormValues {
  return {
    name: "",
    kind: "INTERNAL_XYZ",
    urlTemplate: "",
    attribution: "",
    minZoom: "0",
    maxZoom: "19",
    tileSize: "256",
    subdomains: "",
    requiresApiKey: false,
    secretReference: "",
    isDefault: false,
    isEnabled: true,
  };
}

export function mapProviderToFormValues(provider: MapProvider): MapProviderFormValues {
  return {
    name: provider.name,
    kind: provider.kind,
    urlTemplate: provider.urlTemplate,
    attribution: provider.attribution ?? "",
    minZoom: String(provider.minZoom),
    maxZoom: String(provider.maxZoom),
    tileSize: provider.tileSize === 512 ? "512" : "256",
    subdomains: provider.subdomains ? provider.subdomains.join(",") : "",
    requiresApiKey: provider.requiresApiKey,
    secretReference: provider.secretReference ?? "",
    isDefault: provider.isDefault,
    isEnabled: provider.isEnabled,
  };
}
