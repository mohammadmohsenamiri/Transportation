"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ApiError } from "@/lib/http/api-client-error";

const formSchema = z.object({
  code: z
    .string()
    .trim()
    .max(50, "کد نباید بیش از ۵۰ کاراکتر باشد.")
    .regex(/^[A-Za-z0-9_-]*$/, "کد فقط می‌تواند شامل حروف/اعداد انگلیسی، خط تیره و زیرخط باشد.")
    .optional(),
  name: z.string().trim().min(1, "نام الزامی است.").max(200, "نام نباید بیش از ۲۰۰ کاراکتر باشد."),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean(),
});

export type CatalogTypeFormValues = z.infer<typeof formSchema>;

interface CatalogTypeFormProps {
  mode: "create" | "edit";
  defaultValues: CatalogTypeFormValues;
  onSubmit: (values: CatalogTypeFormValues) => Promise<void>;
  onCancel: () => void;
  pending: boolean;
  serverError?: string | null;
}

export function CatalogTypeForm({ mode, defaultValues, onSubmit, onCancel, pending, serverError }: CatalogTypeFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CatalogTypeFormValues>({ resolver: zodResolver(formSchema), defaultValues });

  async function handleFormSubmit(values: CatalogTypeFormValues) {
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field in values) {
            setError(field as keyof CatalogTypeFormValues, { message });
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

      <label className="flex flex-col gap-1.5 text-xs">
        <span className="font-medium text-[var(--color-text)]">کد (اختیاری)</span>
        <input
          {...register("code")}
          dir="ltr"
          className="ltr-inline w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
        {errors.code && <span className="text-[var(--color-danger)]">{errors.code.message}</span>}
      </label>

      <label className="flex flex-col gap-1.5 text-xs">
        <span className="font-medium text-[var(--color-text)]">نام</span>
        <input
          {...register("name")}
          className="w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
        {errors.name && <span className="text-[var(--color-danger)]">{errors.name.message}</span>}
      </label>

      <label className="flex flex-col gap-1.5 text-xs">
        <span className="font-medium text-[var(--color-text)]">توضیحات</span>
        <textarea
          {...register("description")}
          rows={2}
          className="w-full resize-none rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </label>

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

export function emptyCatalogTypeFormValues(): CatalogTypeFormValues {
  return { code: "", name: "", description: "", isActive: true };
}
