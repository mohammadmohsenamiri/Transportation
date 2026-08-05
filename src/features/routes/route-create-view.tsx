"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { RouteCsvImportPanel } from "@/features/routes/route-csv-import-panel";
import { RoutePointEditor } from "@/features/routes/route-point-editor";
import { useCreateRoute } from "@/features/routes/use-route-queries";
import { ApiError } from "@/lib/http/api-client-error";
import type { DrawPoint } from "@/features/routes/route-draw-map-inner";

type Tab = "csv" | "draw";

export function RouteCreateView() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("csv");
  const [showDrawForm, setShowDrawForm] = useState(false);
  const [drawPoints, setDrawPoints] = useState<DrawPoint[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateRoute();

  function handleFinishDraw(points: DrawPoint[]) {
    setDrawPoints(points);
    setShowDrawForm(true);
  }

  async function handleSaveDraw() {
    setFormError(null);
    try {
      const created = await createMutation.mutateAsync({
        code,
        name,
        description: description || null,
        source: "MAP_DRAWING",
        points: drawPoints.map((p) => ({
          sequence: p.sequence,
          latitude: p.latitude,
          longitude: p.longitude,
          label: p.label ?? null,
        })),
      });
      router.push(`/routes/${created.id}`);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "ایجاد مسیر ناموفق بود.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push("/routes")}
          aria-label="بازگشت به فهرست مسیرها"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
        >
          <Icon name="chevron-left" className="h-5 w-5 rotate-180" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">مسیر جدید</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">مسیر را از فایل CSV وارد کنید یا مستقیماً روی نقشه ترسیم کنید</p>
        </div>
      </div>

      <div className="flex w-fit rounded-xl border border-[var(--color-panel-border)] p-1">
        <button
          type="button"
          onClick={() => setTab("csv")}
          aria-pressed={tab === "csv"}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ${
            tab === "csv" ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "text-[var(--color-text-muted)]"
          }`}
        >
          وارد کردن CSV
        </button>
        <button
          type="button"
          onClick={() => setTab("draw")}
          aria-pressed={tab === "draw"}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ${
            tab === "draw" ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "text-[var(--color-text-muted)]"
          }`}
        >
          ترسیم روی نقشه
        </button>
      </div>

      {tab === "csv" && <RouteCsvImportPanel onImported={(id) => router.push(`/routes/${id}`)} />}

      {tab === "draw" && !showDrawForm && (
        <RoutePointEditor initialPoints={drawPoints} onFinish={handleFinishDraw} onCancel={() => router.push("/routes")} />
      )}

      {tab === "draw" && showDrawForm && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-panel-border)] p-4">
          <h2 className="text-sm font-bold text-[var(--color-text)]">تکمیل اطلاعات مسیر</h2>
          <label className="text-xs font-medium text-[var(--color-text)]">
            شناسه مسیر
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="ltr-inline mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1.5 text-sm"
              placeholder="RT-1404-002"
            />
          </label>
          <label className="text-xs font-medium text-[var(--color-text)]">
            نام مسیر
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1.5 text-sm"
              placeholder="مسیر غرب تهران"
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
              onClick={() => setShowDrawForm(false)}
              className="rounded-xl border border-[var(--color-panel-border)] px-3.5 py-2 text-sm text-[var(--color-text)]"
            >
              بازگشت به ویرایش نقاط
            </button>
            <button
              type="button"
              onClick={handleSaveDraw}
              disabled={!code || !name || createMutation.isPending}
              className="rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] disabled:opacity-50"
            >
              {createMutation.isPending ? "در حال ذخیره..." : "ذخیره مسیر"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
