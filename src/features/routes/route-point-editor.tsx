"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Icon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { useActiveMapProvider } from "@/features/map/use-map-queries";
import { computeRouteDistances } from "@/lib/geo/distance";
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

const toolbarButtonClass =
  "flex items-center gap-1.5 rounded-xl border border-[var(--color-panel-border)] px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)] disabled:cursor-not-allowed disabled:opacity-50";

function nextSequence(points: DrawPoint[]): number {
  return points.length === 0 ? 1 : Math.max(...points.map((p) => p.sequence)) + 1;
}

export interface RoutePointEditorProps {
  initialPoints: DrawPoint[];
  onFinish: (points: DrawPoint[]) => void;
  onCancel: () => void;
  finishLabel?: string;
  pending?: boolean;
}

export function RoutePointEditor({
  initialPoints,
  onFinish,
  onCancel,
  finishLabel = "پایان مسیر",
  pending = false,
}: RoutePointEditorProps) {
  const providerQuery = useActiveMapProvider();
  const [history, setHistory] = useState<DrawPoint[][]>([initialPoints]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 32.4279, lng: 53.688 });

  const points = history[historyIndex];

  function commit(newPoints: DrawPoint[]) {
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), newPoints]);
    setHistoryIndex((i) => i + 1);
  }

  function handleAddPoint(lat: number, lng: number) {
    commit([...points, { sequence: nextSequence(points), latitude: lat, longitude: lng, label: null }]);
  }

  function handleMovePoint(index: number, lat: number, lng: number) {
    commit(points.map((p, i) => (i === index ? { ...p, latitude: lat, longitude: lng } : p)));
  }

  function handleEditField(index: number, field: "latitude" | "longitude" | "label", value: string) {
    commit(
      points.map((p, i) => {
        if (i !== index) return p;
        if (field === "label") return { ...p, label: value || null };
        const num = Number(value);
        return { ...p, [field]: Number.isFinite(num) ? num : p[field] };
      }),
    );
  }

  function handleRemove(index: number) {
    commit(points.filter((_, i) => i !== index));
  }

  function handleUndo() {
    if (historyIndex > 0) setHistoryIndex((i) => i - 1);
  }
  function handleRedo() {
    if (historyIndex < history.length - 1) setHistoryIndex((i) => i + 1);
  }
  function handleClear() {
    if (points.length > 0 && !window.confirm("همه نقاط ترسیم‌شده پاک شوند؟")) return;
    commit([]);
  }

  const totalDistanceMeters = useMemo(
    () => computeRouteDistances(points.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))).totalDistanceMeters,
    [points],
  );

  const canFinish = points.length >= 2;
  const sortedPoints = useMemo(() => [...points].sort((a, b) => a.sequence - b.sequence), [points]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => handleAddPoint(mapCenter.lat, mapCenter.lng)} className={toolbarButtonClass}>
          <Icon name="plus" className="h-4 w-4" /> افزودن نقطه در مرکز نقشه
        </button>
        <button type="button" onClick={handleUndo} disabled={historyIndex === 0} className={toolbarButtonClass}>
          بازگشت
        </button>
        <button type="button" onClick={handleRedo} disabled={historyIndex === history.length - 1} className={toolbarButtonClass}>
          دوباره
        </button>
        <button type="button" onClick={handleClear} disabled={points.length === 0} className={toolbarButtonClass}>
          پاک کردن
        </button>
        <div className="ms-auto flex items-center gap-2">
          <button type="button" onClick={onCancel} className={toolbarButtonClass}>
            لغو
          </button>
          <button
            type="button"
            onClick={() => onFinish(sortedPoints)}
            disabled={!canFinish || pending}
            className="rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] disabled:opacity-50"
          >
            {pending ? "در حال ذخیره..." : finishLabel}
          </button>
        </div>
      </div>

      <Panel className="h-[360px] overflow-hidden sm:h-[420px]">
        {providerQuery.isLoading ? (
          <MapLoadingState />
        ) : !providerQuery.data ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--color-text-muted)]">
            برای ترسیم مسیر ابتدا یک Provider نقشه از تنظیمات سامانه فعال کنید.
          </div>
        ) : (
          <RouteDrawMapInner
            provider={providerQuery.data}
            points={points}
            editable
            onMapClick={({ lat, lng }) => handleAddPoint(lat, lng)}
            onPointDragEnd={(index, { lat, lng }) => handleMovePoint(index, lat, lng)}
            onCenterChange={setMapCenter}
          />
        )}
      </Panel>

      <p className="text-xs text-[var(--color-text-subtle)]">
        برای افزودن نقطه روی نقشه tap/click کنید یا از دکمه «افزودن نقطه در مرکز نقشه» استفاده کنید. هر نقطه با درگ‌کردن روی نقشه یا ویرایش مقادیر جدول زیر قابل اصلاح است.
      </p>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-panel-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right text-xs text-[var(--color-text-muted)]">
              <th className="w-12 py-2 ps-3">ترتیب</th>
              <th className="py-2">عرض جغرافیایی</th>
              <th className="py-2">طول جغرافیایی</th>
              <th className="py-2">برچسب</th>
              <th className="w-10 py-2" />
            </tr>
          </thead>
          <tbody>
            {sortedPoints.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-sm text-[var(--color-text-muted)]">
                  هنوز نقطه‌ای اضافه نشده است.
                </td>
              </tr>
            )}
            {sortedPoints.map((point, index) => (
              <tr key={`${point.sequence}-${index}`} className="border-t border-[var(--color-panel-border)]">
                <td className="tabular-nums py-1.5 ps-3">{index + 1}</td>
                <td className="py-1.5">
                  <input
                    type="number"
                    step="0.000001"
                    value={point.latitude}
                    onChange={(e) => handleEditField(index, "latitude", e.target.value)}
                    className="ltr-inline w-28 rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1 text-xs"
                    aria-label={`عرض جغرافیایی نقطه ${index + 1}`}
                  />
                </td>
                <td className="py-1.5">
                  <input
                    type="number"
                    step="0.000001"
                    value={point.longitude}
                    onChange={(e) => handleEditField(index, "longitude", e.target.value)}
                    className="ltr-inline w-28 rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1 text-xs"
                    aria-label={`طول جغرافیایی نقطه ${index + 1}`}
                  />
                </td>
                <td className="py-1.5">
                  <input
                    type="text"
                    value={point.label ?? ""}
                    onChange={(e) => handleEditField(index, "label", e.target.value)}
                    className="w-32 rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1 text-xs"
                    aria-label={`برچسب نقطه ${index + 1}`}
                  />
                </td>
                <td className="py-1.5">
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    aria-label={`حذف نقطه ${index + 1}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--color-text-muted)]">
          تعداد نقاط: <span className="tabular-nums font-semibold text-[var(--color-text)]">{points.length.toLocaleString("fa-IR")}</span>
        </span>
        <span className="text-[var(--color-text-muted)]">
          مسافت کل:{" "}
          <span className="tabular-nums font-semibold text-[var(--color-text)]">
            {(totalDistanceMeters / 1000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} کیلومتر
          </span>
        </span>
      </div>
    </div>
  );
}
