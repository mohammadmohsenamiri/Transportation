"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouteDetail, useCreateRouteNewVersion, usePatchRoute } from "@/features/routes/use-route-queries";
import { useActiveMapProvider } from "@/features/map/use-map-queries";
import { RoutePointEditor } from "@/features/routes/route-point-editor";
import { DuplicateRouteDialog } from "@/features/routes/duplicate-route-dialog";
import { routeExportUrl } from "@/features/routes/api";
import { ApiError } from "@/lib/http/api-client-error";
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

function formatKm(meters: number): string {
  return `${(meters / 1000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} کیلومتر`;
}

const sourceLabel: Record<string, string> = { CSV: "وارد شده از CSV", MAP_DRAWING: "ترسیم روی نقشه" };

function noopLngLat() {}
function noopDrag() {}
function noopCenter() {}

export function RouteDetailView({ routeId, canManage }: { routeId: string; canManage: boolean }) {
  const router = useRouter();
  const { data: route, isLoading, isError } = useRouteDetail(routeId);
  const providerQuery = useActiveMapProvider();

  const [editingPoints, setEditingPoints] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const newVersionMutation = useCreateRouteNewVersion();
  const patchMutation = usePatchRoute();

  async function handleFinishEdit(points: DrawPoint[]) {
    setEditError(null);
    try {
      const updated = await newVersionMutation.mutateAsync({
        id: routeId,
        payload: {
          source: "MAP_DRAWING",
          points: points.map((p) => ({
            sequence: p.sequence,
            latitude: p.latitude,
            longitude: p.longitude,
            label: p.label ?? null,
          })),
        },
      });
      setEditingPoints(false);
      router.push(`/routes/${updated.id}`);
    } catch (error) {
      setEditError(error instanceof ApiError ? error.message : "ذخیره نسخه جدید ناموفق بود.");
    }
  }

  async function handleToggleActive() {
    if (!route) return;
    if (route.isActive) {
      setDeactivateConfirm(true);
      return;
    }
    await patchMutation.mutateAsync({ id: routeId, payload: { isActive: true } });
  }

  async function confirmDeactivate() {
    await patchMutation.mutateAsync({ id: routeId, payload: { isActive: false } });
    setDeactivateConfirm(false);
  }

  if (isLoading) return <p className="p-4 text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>;
  if (isError || !route) return <p className="p-4 text-sm text-[var(--color-danger)]">مسیر یافت نشد.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/routes"
            aria-label="بازگشت به فهرست مسیرها"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
          >
            <Icon name="chevron-left" className="h-5 w-5 rotate-180" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">{route.name}</h1>
            <p className="ltr-inline mt-1 text-xs text-[var(--color-text-muted)]">
              {route.code} · نسخه {route.version.toLocaleString("fa-IR")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={routeExportUrl(route.id)}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--color-panel-border)] px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)]"
          >
            <Icon name="download" className="h-4 w-4" />
            خروجی CSV
          </a>
          {canManage && !editingPoints && (
            <>
              <button
                type="button"
                onClick={() => setEditingPoints(true)}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--color-panel-border)] px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)]"
              >
                <Icon name="pencil" className="h-4 w-4" />
                ویرایش نقاط (نسخه جدید)
              </button>
              <button
                type="button"
                onClick={() => setDuplicateOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--color-panel-border)] px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)]"
              >
                <Icon name="copy" className="h-4 w-4" />
                تکثیر
              </button>
              <button
                type="button"
                onClick={handleToggleActive}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--color-panel-border)] px-3 py-2 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
              >
                <Icon name="power" className="h-4 w-4" />
                {route.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
              </button>
            </>
          )}
        </div>
      </div>

      {editingPoints ? (
        <div className="flex flex-col gap-3">
          {editError && <p className="text-xs text-[var(--color-danger)]">{editError}</p>}
          <RoutePointEditor
            initialPoints={route.points.map((p) => ({
              sequence: p.sequence,
              latitude: p.latitude,
              longitude: p.longitude,
              label: p.label,
            }))}
            onFinish={handleFinishEdit}
            onCancel={() => setEditingPoints(false)}
            finishLabel="ذخیره نسخه جدید"
            pending={newVersionMutation.isPending}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Panel className="p-3">
              <p className="text-xs text-[var(--color-text-muted)]">وضعیت</p>
              <div className="mt-1">
                <StatusBadge tone={route.isActive ? "success" : "danger"} label={route.isActive ? "فعال" : "غیرفعال"} />
              </div>
            </Panel>
            <Panel className="p-3">
              <p className="text-xs text-[var(--color-text-muted)]">تعداد نقاط</p>
              <p className="tabular-nums mt-1 text-lg font-bold text-[var(--color-text)]">{route.pointCount.toLocaleString("fa-IR")}</p>
            </Panel>
            <Panel className="p-3">
              <p className="text-xs text-[var(--color-text-muted)]">مسافت کل</p>
              <p className="tabular-nums mt-1 text-lg font-bold text-[var(--color-text)]">{formatKm(route.totalDistanceMeters)}</p>
            </Panel>
            <Panel className="p-3">
              <p className="text-xs text-[var(--color-text-muted)]">منشأ</p>
              <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{sourceLabel[route.source]}</p>
            </Panel>
          </div>

          <Panel className="h-[360px] overflow-hidden sm:h-[440px]">
            {providerQuery.isLoading ? (
              <MapLoadingState />
            ) : !providerQuery.data ? (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--color-text-muted)]">
                Provider نقشه تنظیم نشده است.
              </div>
            ) : (
              <RouteDrawMapInner
                provider={providerQuery.data}
                points={route.points}
                editable={false}
                onMapClick={noopLngLat}
                onPointDragEnd={noopDrag}
                onCenterChange={noopCenter}
              />
            )}
          </Panel>

          <Panel className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-xs text-[var(--color-text-muted)]">
                  <th className="py-2 ps-4">ترتیب</th>
                  <th className="py-2">عرض جغرافیایی</th>
                  <th className="py-2">طول جغرافیایی</th>
                  <th className="py-2">برچسب</th>
                  <th className="py-2 pe-4">فاصله تجمعی</th>
                </tr>
              </thead>
              <tbody>
                {route.points.map((point) => (
                  <tr key={point.sequence} className="border-t border-[var(--color-panel-border)]">
                    <td className="tabular-nums py-2 ps-4">{point.sequence.toLocaleString("fa-IR")}</td>
                    <td className="ltr-inline py-2">{point.latitude}</td>
                    <td className="ltr-inline py-2">{point.longitude}</td>
                    <td className="py-2">{point.label ?? "—"}</td>
                    <td className="tabular-nums py-2 pe-4">{formatKm(point.cumulativeDistanceMeters)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </>
      )}

      <DuplicateRouteDialog
        routeId={route.id}
        suggestedName={`${route.name} (کپی)`}
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        onDuplicated={(newId) => {
          setDuplicateOpen(false);
          router.push(`/routes/${newId}`);
        }}
      />

      <ConfirmDialog
        open={deactivateConfirm}
        title="غیرفعال‌سازی مسیر"
        description={`مسیر «${route.name}» غیرفعال می‌شود و برای مأموریت‌های جدید قابل انتخاب نخواهد بود.`}
        confirmLabel="غیرفعال‌سازی"
        destructive
        pending={patchMutation.isPending}
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateConfirm(false)}
      />
    </div>
  );
}
