"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/badge";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icons";
import {
  CatalogTypeForm,
  emptyCatalogTypeFormValues,
  type CatalogTypeFormValues,
} from "@/features/fleet/catalog-type-form";
import {
  useCargoTypes,
  useCreateCargoType,
  useUpdateCargoType,
  useDeleteCargoType,
} from "@/features/fleet/use-fleet-queries";
import type { CargoType } from "@/features/fleet/types";
import { ApiError } from "@/lib/http/api-client-error";

type SheetState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; item: CargoType };

export function CargoTypeList() {
  const [query, setQuery] = useState("");
  const { data: items, isLoading, isError } = useCargoTypes(query || undefined);
  const [sheet, setSheet] = useState<SheetState>({ mode: "closed" });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CargoType | null>(null);

  const createMutation = useCreateCargoType();
  const updateMutation = useUpdateCargoType();
  const deleteMutation = useDeleteCargoType();

  async function handleSubmit(values: CatalogTypeFormValues) {
    setFormError(null);
    try {
      if (sheet.mode === "create") {
        await createMutation.mutateAsync({
          code: values.code || null,
          name: values.name,
          description: values.description || null,
        });
      } else if (sheet.mode === "edit") {
        await updateMutation.mutateAsync({
          id: sheet.item.id,
          payload: { name: values.name, description: values.description || null, isActive: values.isActive },
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
      // خطا در dialog می‌ماند تا کاربر پیام را ببیند
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2">
          <Icon name="search" className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جست‌وجو بر اساس نام یا کد..."
            className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none"
          />
        </div>
        <SheetTrigger
          onClick={() => {
            setFormError(null);
            setSheet({ mode: "create" });
          }}
        >
          افزودن نوع بار
        </SheetTrigger>
      </div>

      <Panel>
        {isLoading && <p className="p-4 text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>}
        {isError && <p className="p-4 text-sm text-[var(--color-danger)]">خطا در بارگذاری انواع بار.</p>}
        {!isLoading && !isError && (items?.length ?? 0) === 0 && (
          <p className="p-4 text-sm text-[var(--color-text-muted)]">هنوز هیچ نوع باری تعریف نشده است.</p>
        )}
        {!isLoading && !isError && (items?.length ?? 0) > 0 && (
          <ul className="divide-y divide-[var(--color-panel-border)]">
            {items!.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium text-[var(--color-text)]">{item.name}</span>
                    {item.code && <span className="ltr-inline text-xs text-[var(--color-text-subtle)]">{item.code}</span>}
                    {!item.isActive && <StatusBadge tone="danger" label="غیرفعال" />}
                  </div>
                  {item.description && (
                    <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{item.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFormError(null);
                      setSheet({ mode: "edit", item });
                    }}
                    aria-label={`ویرایش ${item.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)]"
                  >
                    <Icon name="pencil" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    aria-label={`حذف ${item.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Sheet
        open={sheet.mode !== "closed"}
        onClose={() => setSheet({ mode: "closed" })}
        title={sheet.mode === "edit" ? "ویرایش نوع بار" : "افزودن نوع بار"}
      >
        {sheet.mode !== "closed" && (
          <CatalogTypeForm
            mode={sheet.mode}
            defaultValues={sheet.mode === "edit" ? toFormValues(sheet.item) : emptyCatalogTypeFormValues()}
            onSubmit={handleSubmit}
            onCancel={() => setSheet({ mode: "closed" })}
            pending={createMutation.isPending || updateMutation.isPending}
            serverError={formError}
          />
        )}
      </Sheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف نوع بار"
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

function toFormValues(item: CargoType): CatalogTypeFormValues {
  return { code: item.code ?? "", name: item.name, description: item.description ?? "", isActive: item.isActive };
}
