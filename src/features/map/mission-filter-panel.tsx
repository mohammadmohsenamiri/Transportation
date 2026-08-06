"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import {
  isMissionFilterActive,
  type EtaFilterPreset,
  type MissionFilterState,
  type TimeFilterPreset,
} from "@/lib/domain/mission-interaction-rules";
import { missionDisplayStatusLabel } from "@/features/missions/status-labels";
import type { MissionDisplayStatusValue } from "@/features/missions/types";
import type { SavedMissionView } from "@/features/map/use-mission-interaction";

const inputClass =
  "w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]";

const START_PRESET_LABEL: Record<TimeFilterPreset, string> = {
  ALL: "همه",
  TODAY: "امروز",
  NEXT_24H: "۲۴ ساعت آینده",
  NEXT_7_DAYS: "۷ روز آینده",
};

const ETA_PRESET_LABEL: Record<EtaFilterPreset, string> = {
  ...START_PRESET_LABEL,
  OVERDUE: "دیرکرد",
};

const DISPLAY_STATUS_OPTIONS: MissionDisplayStatusValue[] = ["WAITING", "IN_PROGRESS", "ARRIVED", "CANCELLED"];

export interface MissionFilterFormProps {
  filter: MissionFilterState;
  onFilterChange: (next: MissionFilterState) => void;
  query: string;
  onQueryChange: (query: string) => void;
  availableVehicleTypes: string[];
  onReset: () => void;
  savedViews: SavedMissionView[];
  onSaveView: (name: string) => void;
  onApplyView: (view: SavedMissionView) => void;
  onDeleteView: (name: string) => void;
}

/**
 * محتوای فرم فیلتر (Phase 11) — بدون فرض قالب نمایش (Panel داخلی دسکتاپ یا Sheet در تبلت/موبایل)؛
 * والد (map-view.tsx) تصمیم می‌گیرد این فرم را کجا رندر کند، طبق docs/UX_MAP_AND_DESIGN_SYSTEM.md §3.
 */
export function MissionFilterForm({
  filter,
  onFilterChange,
  query,
  onQueryChange,
  availableVehicleTypes,
  onReset,
  savedViews,
  onSaveView,
  onApplyView,
  onDeleteView,
}: MissionFilterFormProps) {
  const [newViewName, setNewViewName] = useState("");

  function patch(partial: Partial<MissionFilterState>) {
    onFilterChange({ ...filter, ...partial });
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2">
        <Icon name="search" className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="جست‌وجوی کد مأموریت، شناسه خودرو یا کد رهگیری مرسوله..."
          className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none"
          aria-label="جست‌وجوی سریع"
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-[var(--color-text)]">
          مبدأ
          <input
            value={filter.originQuery}
            onChange={(e) => patch({ originQuery: e.target.value })}
            placeholder="نام انبار مبدأ..."
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-xs font-medium text-[var(--color-text)]">
          مقصد
          <input
            value={filter.destinationQuery}
            onChange={(e) => patch({ destinationQuery: e.target.value })}
            placeholder="نام مقصد..."
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-xs font-medium text-[var(--color-text)]">
          نوع خودرو
          <select value={filter.vehicleTypeName} onChange={(e) => patch({ vehicleTypeName: e.target.value })} className={`mt-1 ${inputClass}`}>
            <option value="">همه</option>
            {availableVehicleTypes.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-[var(--color-text)]">
          وضعیت
          <select
            value={filter.status}
            onChange={(e) => patch({ status: e.target.value as MissionDisplayStatusValue | "" })}
            className={`mt-1 ${inputClass}`}
          >
            <option value="">همه</option>
            {DISPLAY_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {missionDisplayStatusLabel[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-[var(--color-text)]">
          زمان شروع
          <select value={filter.startAtPreset} onChange={(e) => patch({ startAtPreset: e.target.value as TimeFilterPreset })} className={`mt-1 ${inputClass}`}>
            {(Object.keys(START_PRESET_LABEL) as TimeFilterPreset[]).map((preset) => (
              <option key={preset} value={preset}>
                {START_PRESET_LABEL[preset]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-[var(--color-text)]">
          زمان رسیدن (ETA)
          <select value={filter.etaPreset} onChange={(e) => patch({ etaPreset: e.target.value as EtaFilterPreset })} className={`mt-1 ${inputClass}`}>
            {(Object.keys(ETA_PRESET_LABEL) as EtaFilterPreset[]).map((preset) => (
              <option key={preset} value={preset}>
                {ETA_PRESET_LABEL[preset]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
        <input type="checkbox" checked={filter.activeOnly} onChange={(e) => patch({ activeOnly: e.target.checked })} className="h-4 w-4 rounded" />
        فقط مأموریت‌های فعال (در حال حرکت) در زمان مشاهده
      </label>

      <button type="button" onClick={onReset} className="w-fit text-xs font-medium text-[var(--color-primary)]">
        پاک‌کردن همه فیلترها
      </button>

      <div className="border-t border-[var(--color-panel-border)] pt-3">
        <p className="text-xs font-semibold text-[var(--color-text)]">نماهای ذخیره‌شده</p>
        <p className="mt-0.5 text-[11px] text-[var(--color-text-subtle)]">فقط برای این نشست مرورگر نگه‌داشته می‌شود.</p>
        {savedViews.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {savedViews.map((view) => (
              <li key={view.name} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-[var(--color-bg-sunken)]">
                <button type="button" onClick={() => onApplyView(view)} className="text-sm text-[var(--color-text)]">
                  {view.name}
                </button>
                <button type="button" onClick={() => onDeleteView(view.name)} aria-label={`حذف نمای ${view.name}`} className="text-[var(--color-text-subtle)] hover:text-[var(--color-danger)]">
                  <Icon name="trash" className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex items-center gap-2">
          <input
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            placeholder="نام نمای جدید..."
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => {
              onSaveView(newViewName);
              setNewViewName("");
            }}
            disabled={!newViewName.trim()}
            className="shrink-0 rounded-lg border border-[var(--color-panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] disabled:opacity-40"
          >
            ذخیره نما
          </button>
        </div>
      </div>
    </div>
  );
}

interface ActiveFilterChipsProps {
  filter: MissionFilterState;
  query: string;
  onFilterChange: (next: MissionFilterState) => void;
  onQueryChange: (query: string) => void;
  onReset: () => void;
}

/** ردیف chipهای فیلتر فعال — طبق docs/PROJECT_SPEC.md §9 هر فیلتر فعال باید chip قابل حذف مستقل داشته باشد. */
export function ActiveFilterChips({ filter, query, onFilterChange, onQueryChange, onReset }: ActiveFilterChipsProps) {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (query.trim()) chips.push({ key: "query", label: `جست‌وجو: ${query}`, onRemove: () => onQueryChange("") });
  if (filter.originQuery.trim()) chips.push({ key: "origin", label: `مبدأ: ${filter.originQuery}`, onRemove: () => onFilterChange({ ...filter, originQuery: "" }) });
  if (filter.destinationQuery.trim()) chips.push({ key: "destination", label: `مقصد: ${filter.destinationQuery}`, onRemove: () => onFilterChange({ ...filter, destinationQuery: "" }) });
  if (filter.vehicleTypeName) chips.push({ key: "vehicleType", label: `نوع خودرو: ${filter.vehicleTypeName}`, onRemove: () => onFilterChange({ ...filter, vehicleTypeName: "" }) });
  if (filter.status) chips.push({ key: "status", label: `وضعیت: ${missionDisplayStatusLabel[filter.status]}`, onRemove: () => onFilterChange({ ...filter, status: "" }) });
  if (filter.startAtPreset !== "ALL") chips.push({ key: "startAt", label: `شروع: ${START_PRESET_LABEL[filter.startAtPreset]}`, onRemove: () => onFilterChange({ ...filter, startAtPreset: "ALL" }) });
  if (filter.etaPreset !== "ALL") chips.push({ key: "eta", label: `ETA: ${ETA_PRESET_LABEL[filter.etaPreset]}`, onRemove: () => onFilterChange({ ...filter, etaPreset: "ALL" }) });
  if (filter.activeOnly) chips.push({ key: "activeOnly", label: "فقط فعال", onRemove: () => onFilterChange({ ...filter, activeOnly: false }) });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-live="polite">
      {chips.map((chip) => (
        <span key={chip.key} className="flex items-center gap-1 rounded-full bg-[var(--color-bg-sunken)] px-2.5 py-1 text-xs text-[var(--color-text)]">
          {chip.label}
          <button type="button" onClick={chip.onRemove} aria-label={`حذف فیلتر ${chip.label}`} className="text-[var(--color-text-subtle)] hover:text-[var(--color-danger)]">
            ×
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button type="button" onClick={onReset} className="text-xs font-medium text-[var(--color-primary)]">
          پاک‌کردن همه
        </button>
      )}
    </div>
  );
}

export function isFilterPanelActive(filter: MissionFilterState, query: string): boolean {
  return isMissionFilterActive(filter) || query.trim() !== "";
}
