"use client";

import { useRef, useState, type DragEvent } from "react";
import { Icon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { useUploadRouteCsv, useConfirmRouteCsvImport } from "@/features/routes/use-route-queries";
import { ApiError } from "@/lib/http/api-client-error";
import type { RouteCsvPreview } from "@/features/routes/types";

export interface RouteCsvImportPanelProps {
  onImported: (routeId: string) => void;
}

export function RouteCsvImportPanel({ onImported }: RouteCsvImportPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<RouteCsvPreview | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const uploadMutation = useUploadRouteCsv();
  const confirmMutation = useConfirmRouteCsvImport();

  async function handleFile(file: File) {
    setFileError(null);
    setPreview(null);
    setShowForm(false);
    try {
      const result = await uploadMutation.mutateAsync(file);
      setPreview(result);
    } catch (error) {
      setFileError(error instanceof ApiError ? error.message : "بارگذاری فایل ناموفق بود.");
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  async function handleConfirm() {
    if (!preview?.previewToken) return;
    setFormError(null);
    try {
      const created = await confirmMutation.mutateAsync({
        previewToken: preview.previewToken,
        code,
        name,
        description: description || null,
        points: preview.points,
      });
      setPreview(null);
      setShowForm(false);
      setCode("");
      setName("");
      setDescription("");
      onImported(created.id);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "ایجاد مسیر ناموفق بود.");
    }
  }

  const hasErrors = !!preview && (preview.headerError !== null || preview.rowErrors.length > 0);

  return (
    <Panel className="flex flex-col gap-3 p-4">
      <div>
        <h2 className="text-sm font-bold text-[var(--color-text)]">وارد کردن مسیر از CSV</h2>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          فایل CSV شامل ستون‌های: ترتیب، عرض جغرافیایی، طول جغرافیایی، برچسب
        </p>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-panel-border)] px-4 py-8 text-center hover:bg-[var(--color-bg-sunken)]"
      >
        <Icon name="package" className="h-6 w-6 text-[var(--color-text-subtle)]" />
        <p className="text-xs text-[var(--color-text-muted)]">فایل CSV را اینجا بکشید یا کلیک کنید</p>
        <p className="text-[10px] text-[var(--color-text-subtle)]">فقط CSV</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <a href="/samples/route-template.csv" download className="text-xs text-[var(--color-primary)] hover:underline">
        دانلود نمونه فایل CSV
      </a>

      {uploadMutation.isPending && <p className="text-xs text-[var(--color-text-muted)]">در حال بررسی فایل...</p>}
      {fileError && <p className="text-xs text-[var(--color-danger)]">{fileError}</p>}

      {preview && (
        <div className="flex flex-col gap-2">
          {hasErrors ? (
            <div className="rounded-xl bg-[var(--color-danger-bg)] px-3 py-2 text-xs text-[var(--color-danger)]">
              {preview.headerError ?? `${preview.rowErrors.length.toLocaleString("fa-IR")} خطا در فایل یافت شد.`}
              {preview.rowErrors.length > 0 && (
                <ul className="mt-1.5 list-inside list-disc space-y-0.5">
                  {preview.rowErrors.slice(0, 10).map((err, i) => (
                    <li key={i}>
                      ردیف {err.row.toLocaleString("fa-IR")}: {err.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-[var(--color-success-bg)] px-3 py-2 text-xs text-[var(--color-success)]">
              اعتبارسنجی موفق — {preview.pointCount.toLocaleString("fa-IR")} نقطه،{" "}
              {(preview.totalDistanceMeters / 1000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} کیلومتر
            </div>
          )}

          {!hasErrors && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--color-panel-border)]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-right text-[var(--color-text-muted)]">
                    <th className="py-1.5 ps-2">ترتیب</th>
                    <th className="py-1.5">عرض جغرافیایی</th>
                    <th className="py-1.5">طول جغرافیایی</th>
                    <th className="py-1.5">برچسب</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.points.map((point) => (
                    <tr key={point.sequence} className="border-t border-[var(--color-panel-border)]">
                      <td className="tabular-nums py-1 ps-2">{point.sequence.toLocaleString("fa-IR")}</td>
                      <td className="ltr-inline py-1">{point.latitude}</td>
                      <td className="ltr-inline py-1">{point.longitude}</td>
                      <td className="py-1">{point.label ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!hasErrors && !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary-foreground)]"
            >
              ایجاد مسیر از این داده‌ها
            </button>
          )}

          {!hasErrors && showForm && (
            <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-panel-border)] p-3">
              <label className="text-xs font-medium text-[var(--color-text)]">
                شناسه مسیر
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="ltr-inline mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1.5 text-sm"
                  placeholder="RT-1404-001"
                />
              </label>
              <label className="text-xs font-medium text-[var(--color-text)]">
                نام مسیر
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1.5 text-sm"
                  placeholder="مسیر شمال تهران"
                />
              </label>
              <label className="text-xs font-medium text-[var(--color-text)]">
                توضیحات (اختیاری)
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1.5 text-sm"
                />
              </label>
              {formError && <p className="text-xs text-[var(--color-danger)]">{formError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-[var(--color-panel-border)] px-3 py-1.5 text-xs text-[var(--color-text)]"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!code || !name || confirmMutation.isPending}
                  className="rounded-xl bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-primary-foreground)] disabled:opacity-50"
                >
                  {confirmMutation.isPending ? "در حال ذخیره..." : "ذخیره مسیر"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
