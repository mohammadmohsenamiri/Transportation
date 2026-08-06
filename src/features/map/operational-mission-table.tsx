"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { StatusBadge } from "@/components/ui/badge";
import { missionDisplayStatusLabel, missionDisplayStatusTone } from "@/features/missions/status-labels";
import { formatDuration } from "@/features/missions/mission-form-parts";
import type { MapSceneMission } from "@/features/map/types";
import type { MissionSortField, SortDirection } from "@/lib/domain/mission-interaction-rules";
import { MISSION_TABLE_COLUMNS, type MissionColumnKey } from "@/features/map/mission-table-columns";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("fa-IR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

function cellContent(mission: MapSceneMission, key: MissionColumnKey): React.ReactNode {
  switch (key) {
    case "code":
      return <span className="ltr-inline font-medium text-[var(--color-text)]">{mission.code}</span>;
    case "status":
      return <StatusBadge tone={missionDisplayStatusTone[mission.status]} label={missionDisplayStatusLabel[mission.status]} />;
    case "route":
      return (
        <span className="text-[var(--color-text-muted)]">
          {mission.originTitle} ← {mission.destinationTitle}
        </span>
      );
    case "vehicle":
      return <span className="ltr-inline text-[var(--color-text-muted)]">{mission.vehicleIdentifier}</span>;
    case "vehicleType":
      return <span className="text-[var(--color-text-muted)]">{mission.vehicleTypeName}</span>;
    case "startAt":
      return <span className="tabular-nums text-[var(--color-text-muted)]">{formatTime(mission.startAt)}</span>;
    case "eta":
      return <span className="tabular-nums text-[var(--color-text-muted)]">{formatTime(mission.estimatedArrivalAt)}</span>;
    case "remaining":
      return (
        <span className="tabular-nums text-[var(--color-text-muted)]">
          {mission.remainingSeconds > 0 ? formatDuration(mission.remainingSeconds) : "رسیده"}
        </span>
      );
    case "progress":
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--color-bg-sunken)]">
            <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${Math.round(mission.progressRatio * 100)}%` }} />
          </div>
          <span className="tabular-nums text-xs text-[var(--color-text-subtle)]">{Math.round(mission.progressRatio * 100)}٪</span>
        </div>
      );
    case "cargo":
      return (
        <span className="text-[var(--color-text-muted)]">
          {mission.cargoTypeNames.join("، ") || "—"} ({mission.shipmentCount.toLocaleString("fa-IR")})
        </span>
      );
  }
}

function RowMenu({ mission, onSelect, onOpenFullDetails }: { mission: MapSceneMission; onSelect: () => void; onOpenFullDetails: () => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`عملیات مأموریت ${mission.code}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
      >
        <Icon name="more-vertical" className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 top-9 z-10 w-48 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onSelect();
            }}
            className="block w-full px-3 py-2 text-start text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)]"
          >
            نمایش روی نقشه
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onOpenFullDetails();
            }}
            className="block w-full px-3 py-2 text-start text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)]"
          >
            باز کردن صفحه کامل مأموریت
          </button>
        </div>
      )}
    </div>
  );
}

export interface OperationalMissionTableProps {
  missions: MapSceneMission[];
  totalFilteredCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
  selectedMissionId: string | null;
  onSelect: (missionId: string | null) => void;
  sortField: MissionSortField;
  sortDirection: SortDirection;
  onToggleSort: (field: MissionSortField) => void;
  visibleColumns: Set<MissionColumnKey>;
  onOpenFullDetails: (missionId: string) => void;
}

/**
 * جدول مأموریت‌های نقشه عملیاتی (Phase 11) — روی داده از پیش فیلترشده/مرتب‌شده/صفحه‌بندی‌شده
 * useMissionInteraction رندر می‌شود؛ خودش هیچ فیلتر یا مرتب‌سازی محاسبه نمی‌کند، فقط نمایش می‌دهد
 * و رویدادهای انتخاب/مرتب‌سازی/بارگذاری بیشتر را به بالا منتقل می‌کند.
 */
export function OperationalMissionTable({
  missions,
  totalFilteredCount,
  hasMore,
  onLoadMore,
  selectedMissionId,
  onSelect,
  sortField,
  sortDirection,
  onToggleSort,
  visibleColumns,
  onOpenFullDetails,
}: OperationalMissionTableProps) {
  const columns = MISSION_TABLE_COLUMNS.filter((c) => c.alwaysVisible || visibleColumns.has(c.key));

  function handleRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, missionId: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(selectedMissionId === missionId ? null : missionId);
      return;
    }
    if (event.key === "Escape") {
      onSelect(null);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      (event.currentTarget.nextElementSibling as HTMLElement | null)?.focus();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      (event.currentTarget.previousElementSibling as HTMLElement | null)?.focus();
    }
  }

  if (missions.length === 0) {
    return <p className="p-4 text-sm text-[var(--color-text-muted)]">هیچ مأموریتی با فیلترهای فعلی یافت نشد.</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <div aria-live="polite" className="sr-only">
        {totalFilteredCount.toLocaleString("fa-IR")} مأموریت با فیلترهای فعلی یافت شد.
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="hidden w-full text-sm md:table" role="grid" aria-label="جدول مأموریت‌های نقشه عملیاتی">
          <thead className="sticky top-0 bg-[var(--color-panel)]">
            <tr className="text-start text-xs text-[var(--color-text-muted)]">
              {columns.map((col) => (
                <th key={col.key} className="whitespace-nowrap py-2 ps-3 font-medium first:ps-4" aria-sort={col.sortField === sortField ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                  {col.sortField ? (
                    <button
                      type="button"
                      onClick={() => onToggleSort(col.sortField!)}
                      className="flex items-center gap-1 hover:text-[var(--color-text)]"
                    >
                      {col.label}
                      <Icon
                        name="sort"
                        className={`h-3.5 w-3.5 ${col.sortField === sortField ? "text-[var(--color-primary)]" : "opacity-40"} ${col.sortField === sortField && sortDirection === "desc" ? "rotate-180" : ""}`}
                      />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
              <th className="w-10 py-2 pe-4" aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {missions.map((mission) => {
              const selected = mission.missionId === selectedMissionId;
              return (
                <tr
                  key={mission.missionId}
                  tabIndex={0}
                  role="row"
                  aria-selected={selected}
                  onClick={() => onSelect(selected ? null : mission.missionId)}
                  onKeyDown={(e) => handleRowKeyDown(e, mission.missionId)}
                  className={`cursor-pointer border-t border-[var(--color-panel-border)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${selected ? "bg-[var(--color-primary-bg)]" : "hover:bg-[var(--color-bg-sunken)]"}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="py-2.5 ps-3 first:ps-4">
                      {cellContent(mission, col.key)}
                    </td>
                  ))}
                  <td className="py-2.5 pe-4">
                    <RowMenu
                      mission={mission}
                      onSelect={() => onSelect(mission.missionId)}
                      onOpenFullDetails={() => onOpenFullDetails(mission.missionId)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <ul className="flex flex-col gap-2 p-3 md:hidden">
          {missions.map((mission) => {
            const selected = mission.missionId === selectedMissionId;
            return (
              <li key={mission.missionId}>
                <button
                  type="button"
                  onClick={() => onSelect(selected ? null : mission.missionId)}
                  aria-pressed={selected}
                  className={`w-full rounded-xl border p-3 text-start ${selected ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]" : "border-[var(--color-panel-border)]"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="ltr-inline text-sm font-medium text-[var(--color-text)]">{mission.code}</span>
                    <StatusBadge tone={missionDisplayStatusTone[mission.status]} label={missionDisplayStatusLabel[mission.status]} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {mission.originTitle} ← {mission.destinationTitle}
                  </p>
                  <p className="ltr-inline mt-1 text-xs text-[var(--color-text-muted)]">{mission.vehicleIdentifier}</p>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          className="border-t border-[var(--color-panel-border)] py-2.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-bg-sunken)]"
        >
          نمایش {(totalFilteredCount - missions.length).toLocaleString("fa-IR")} مأموریت بیشتر
        </button>
      )}
    </div>
  );
}
