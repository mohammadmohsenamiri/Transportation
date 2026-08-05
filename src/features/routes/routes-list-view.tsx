"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRoutes, useRouteStats, usePatchRoute } from "@/features/routes/use-route-queries";
import { DuplicateRouteDialog } from "@/features/routes/duplicate-route-dialog";
import type { RouteSummary } from "@/features/routes/types";

function formatKm(meters: number): string {
  return `${(meters / 1000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} کیلومتر`;
}

export function RoutesListView({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "true" | "false">("");

  const { data: stats } = useRouteStats();
  const {
    data: routes,
    isLoading,
    isError,
  } = useRoutes({ q: query || undefined, isActive: statusFilter === "" ? undefined : statusFilter === "true" });

  const [duplicateTarget, setDuplicateTarget] = useState<RouteSummary | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<RouteSummary | null>(null);
  const patchMutation = usePatchRoute();

  async function handleToggleActive(route: RouteSummary) {
    if (route.isActive) {
      setDeactivateTarget(route);
      return;
    }
    await patchMutation.mutateAsync({ id: route.id, payload: { isActive: true } });
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    await patchMutation.mutateAsync({ id: deactivateTarget.id, payload: { isActive: false } });
    setDeactivateTarget(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">مدیریت مسیرها</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">ایجاد، ویرایش و مدیریت مسیرهای قابل استفاده مجدد در مأموریت‌ها</p>
        </div>
        {canManage && (
          <Link
            href="/routes/new"
            className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary-foreground)]"
          >
            <Icon name="plus" className="h-4 w-4" />
            مسیر جدید
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon="routes" tone="primary" label="کل مسیرها" value={(stats?.total ?? 0).toLocaleString("fa-IR")} />
        <StatCard icon="ready" tone="success" label="مسیرهای فعال" value={(stats?.active ?? 0).toLocaleString("fa-IR")} />
        <StatCard icon="alert" tone="warning" label="مسیرهای غیرفعال" value={(stats?.inactive ?? 0).toLocaleString("fa-IR")} />
        <StatCard icon="map" tone="info" label="میانگین مسافت" value={formatKm(stats?.avgDistanceMeters ?? 0)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2">
          <Icon name="search" className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جست‌وجو در مسیرها بر اساس نام یا شناسه..."
            className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="true">فعال</option>
          <option value="false">غیرفعال</option>
        </select>
      </div>

      <Panel>
        {isLoading && <p className="p-4 text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>}
        {isError && <p className="p-4 text-sm text-[var(--color-danger)]">خطا در بارگذاری مسیرها.</p>}
        {!isLoading && !isError && (routes?.length ?? 0) === 0 && (
          <p className="p-4 text-sm text-[var(--color-text-muted)]">هیچ مسیری با این فیلترها یافت نشد.</p>
        )}
        {!isLoading && !isError && (routes?.length ?? 0) > 0 && (
          <>
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="text-right text-xs text-[var(--color-text-muted)]">
                  <th className="py-2 ps-4 font-medium">نام</th>
                  <th className="py-2 font-medium">شناسه</th>
                  <th className="py-2 font-medium">تعداد نقاط</th>
                  <th className="py-2 font-medium">مسافت کل</th>
                  <th className="py-2 font-medium">وضعیت</th>
                  <th className="py-2 font-medium">نسخه</th>
                  <th className="w-32 py-2 pe-4 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {routes!.map((route) => (
                  <tr key={route.id} className="border-t border-[var(--color-panel-border)]">
                    <td className="py-2.5 ps-4">
                      <Link href={`/routes/${route.id}`} className="font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">
                        {route.name}
                      </Link>
                    </td>
                    <td className="ltr-inline py-2.5 text-right text-[var(--color-text-muted)]">{route.code}</td>
                    <td className="tabular-nums py-2.5 text-[var(--color-text-muted)]">{route.pointCount.toLocaleString("fa-IR")}</td>
                    <td className="tabular-nums py-2.5 text-[var(--color-text-muted)]">{formatKm(route.totalDistanceMeters)}</td>
                    <td className="py-2.5">
                      <StatusBadge tone={route.isActive ? "success" : "danger"} label={route.isActive ? "فعال" : "غیرفعال"} />
                    </td>
                    <td className="tabular-nums py-2.5 text-[var(--color-text-muted)]">{route.version.toLocaleString("fa-IR")}</td>
                    <td className="py-2.5 pe-4">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/routes/${route.id}`}
                          aria-label={`مشاهده مسیر ${route.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)]"
                        >
                          <Icon name="map" className="h-4 w-4" />
                        </Link>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => setDuplicateTarget(route)}
                              aria-label={`تکثیر مسیر ${route.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)]"
                            >
                              <Icon name="copy" className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(route)}
                              aria-label={route.isActive ? `غیرفعال‌سازی مسیر ${route.name}` : `فعال‌سازی مسیر ${route.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                            >
                              <Icon name="power" className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="flex flex-col gap-3 p-3 md:hidden">
              {routes!.map((route) => (
                <li key={route.id} className="rounded-xl border border-[var(--color-panel-border)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/routes/${route.id}`} className="text-sm font-medium text-[var(--color-text)]">
                      {route.name}
                    </Link>
                    <StatusBadge tone={route.isActive ? "success" : "danger"} label={route.isActive ? "فعال" : "غیرفعال"} />
                  </div>
                  <p className="ltr-inline mt-1 text-end text-xs text-[var(--color-text-muted)]">{route.code}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {route.pointCount.toLocaleString("fa-IR")} نقطه · {formatKm(route.totalDistanceMeters)}
                  </p>
                  {canManage && (
                    <div className="mt-3 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setDuplicateTarget(route)}
                        aria-label={`تکثیر مسیر ${route.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)]"
                      >
                        <Icon name="copy" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(route)}
                        aria-label={route.isActive ? `غیرفعال‌سازی مسیر ${route.name}` : `فعال‌سازی مسیر ${route.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                      >
                        <Icon name="power" className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {duplicateTarget && (
        <DuplicateRouteDialog
          routeId={duplicateTarget.id}
          suggestedName={`${duplicateTarget.name} (کپی)`}
          open
          onClose={() => setDuplicateTarget(null)}
          onDuplicated={(newId) => {
            setDuplicateTarget(null);
            router.push(`/routes/${newId}`);
          }}
        />
      )}

      <ConfirmDialog
        open={deactivateTarget !== null}
        title="غیرفعال‌سازی مسیر"
        description={
          deactivateTarget ? `مسیر «${deactivateTarget.name}» غیرفعال می‌شود و برای مأموریت‌های جدید قابل انتخاب نخواهد بود.` : ""
        }
        confirmLabel="غیرفعال‌سازی"
        destructive
        pending={patchMutation.isPending}
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
