"use client";

import { useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMissions, useMissionSummary, useDeleteMission } from "@/features/missions/use-mission-queries";
import { missionDisplayStatusLabel, missionDisplayStatusTone } from "@/features/missions/status-labels";
import { useSearchParamSeed } from "@/lib/navigation/use-search-param-seed";
import type { Mission, MissionPersistedStatusValue } from "@/features/missions/types";

const PERSISTED_STATUS_VALUES: MissionPersistedStatusValue[] = ["DRAFT", "SCHEDULED", "COMPLETED", "FAILED", "CANCELLED", "ARCHIVED"];

function formatKm(meters: number): string {
  return `${(meters / 1000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} کیلومتر`;
}

export function MissionsListView({ canManage }: { canManage: boolean }) {
  const [query, setQuery] = useState("");
  // مقدار اولیه از query string (drill-down فرانمای وضعیت، فاز ۱۳) — فقط در اولین رندر؛ پس از آن
  // انتخاب کاربر حاکم است و URL دیگر خوانده یا نوشته نمی‌شود.
  const [statusFilter, setStatusFilter] = useState<MissionPersistedStatusValue | "">(
    useSearchParamSeed("persistedStatus", PERSISTED_STATUS_VALUES),
  );

  const { data: summary } = useMissionSummary();
  const {
    data: missions,
    isLoading,
    isError,
  } = useMissions({ q: query || undefined, persistedStatus: statusFilter || undefined });

  const [deleteTarget, setDeleteTarget] = useState<Mission | null>(null);
  const deleteMutation = useDeleteMission();

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // خطا در dialog می‌ماند
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">مأموریت‌ها</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">برنامه‌ریزی و مدیریت تخصیص مرسوله به خودرو</p>
        </div>
        {canManage && (
          <Link
            href="/missions/new"
            className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary-foreground)]"
          >
            <Icon name="plus" className="h-4 w-4" />
            مأموریت جدید
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon="missions" tone="primary" label="کل مأموریت‌ها" value={(summary?.total ?? 0).toLocaleString("fa-IR")} />
        <StatCard icon="clock" tone="info" label="پیش‌نویس" value={(summary?.draft ?? 0).toLocaleString("fa-IR")} />
        <StatCard icon="ready" tone="success" label="برنامه‌ریزی‌شده" value={(summary?.scheduled ?? 0).toLocaleString("fa-IR")} />
        <StatCard icon="alert" tone="danger" label="لغوشده" value={(summary?.cancelled ?? 0).toLocaleString("fa-IR")} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2">
          <Icon name="search" className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جست‌وجو بر اساس کد مأموریت، مبدأ یا مقصد..."
            className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as MissionPersistedStatusValue | "")}
          className="rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="DRAFT">پیش‌نویس</option>
          <option value="SCHEDULED">برنامه‌ریزی‌شده</option>
          <option value="CANCELLED">لغوشده</option>
          <option value="ARCHIVED">بایگانی‌شده</option>
        </select>
      </div>

      <Panel>
        {isLoading && <p className="p-4 text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>}
        {isError && <p className="p-4 text-sm text-[var(--color-danger)]">خطا در بارگذاری مأموریت‌ها.</p>}
        {!isLoading && !isError && (missions?.length ?? 0) === 0 && (
          <p className="p-4 text-sm text-[var(--color-text-muted)]">هیچ مأموریتی با این فیلترها یافت نشد.</p>
        )}
        {!isLoading && !isError && (missions?.length ?? 0) > 0 && (
          <>
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="text-right text-xs text-[var(--color-text-muted)]">
                  <th className="py-2 ps-4 font-medium">کد مأموریت</th>
                  <th className="py-2 font-medium">مبدأ ← مقصد</th>
                  <th className="py-2 font-medium">خودرو</th>
                  <th className="py-2 font-medium">زمان حرکت</th>
                  <th className="py-2 font-medium">فاصله</th>
                  <th className="py-2 font-medium">وضعیت</th>
                  <th className="w-16 py-2 pe-4 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {missions!.map((mission) => (
                  <tr key={mission.id} className="border-t border-[var(--color-panel-border)]">
                    <td className="py-2.5 ps-4">
                      <Link href={`/missions/${mission.id}`} className="ltr-inline font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">
                        {mission.code}
                      </Link>
                    </td>
                    <td className="py-2.5 text-[var(--color-text-muted)]">
                      {mission.originTitle} ← {mission.destinationTitle}
                    </td>
                    <td className="ltr-inline py-2.5 text-[var(--color-text-muted)]">{mission.vehicleIdentifier}</td>
                    <td className="tabular-nums py-2.5 text-[var(--color-text-muted)]">{new Date(mission.startAt).toLocaleString("fa-IR")}</td>
                    <td className="tabular-nums py-2.5 text-[var(--color-text-muted)]">{formatKm(mission.distanceMeters)}</td>
                    <td className="py-2.5">
                      <StatusBadge tone={missionDisplayStatusTone[mission.displayStatus]} label={missionDisplayStatusLabel[mission.displayStatus]} />
                    </td>
                    <td className="py-2.5 pe-4">
                      {canManage && mission.persistedStatus === "DRAFT" && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(mission)}
                          aria-label={`حذف مأموریت ${mission.code}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="flex flex-col gap-3 p-3 md:hidden">
              {missions!.map((mission) => (
                <li key={mission.id} className="rounded-xl border border-[var(--color-panel-border)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/missions/${mission.id}`} className="ltr-inline text-sm font-medium text-[var(--color-text)]">
                      {mission.code}
                    </Link>
                    <StatusBadge tone={missionDisplayStatusTone[mission.displayStatus]} label={missionDisplayStatusLabel[mission.displayStatus]} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {mission.originTitle} ← {mission.destinationTitle}
                  </p>
                  <p className="ltr-inline mt-1 text-xs text-[var(--color-text-muted)]">{mission.vehicleIdentifier}</p>
                  {canManage && mission.persistedStatus === "DRAFT" && (
                    <div className="mt-3 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(mission)}
                        aria-label={`حذف مأموریت ${mission.code}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف مأموریت پیش‌نویس"
        description={deleteTarget ? `مأموریت پیش‌نویس «${deleteTarget.code}» حذف می‌شود.` : ""}
        confirmLabel="حذف"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
