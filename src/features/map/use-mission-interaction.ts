"use client";

import { useMemo, useState } from "react";
import type { MapSceneMission } from "@/features/map/types";
import {
  EMPTY_MISSION_FILTER_STATE,
  selectVisibleMissions,
  type MissionFilterState,
  type MissionSortField,
  type SortDirection,
} from "@/lib/domain/mission-interaction-rules";
import { DEFAULT_VISIBLE_MISSION_COLUMNS, type MissionColumnKey } from "@/features/map/mission-table-columns";

const PAGE_SIZE = 20;

export interface SavedMissionView {
  name: string;
  filter: MissionFilterState;
  query: string;
  sortField: MissionSortField;
  sortDirection: SortDirection;
  visibleColumns: MissionColumnKey[];
}

/**
 * Phase 11 — حالت مشترک «لایه تعامل» یک صفحه نقشه عملیاتی: انتخاب + فیلتر + جست‌وجو + مرتب‌سازی +
 * ستون‌های نمایشی + صفحه‌بندی. جایگزین state محلی selectedMissionId که در Phase 10 مستقیماً داخل
 * map-view.tsx نگهداری می‌شد؛ اکنون map، جدول، پنل جزئیات و پنل فیلتر همگی از همین یک hook می‌خوانند
 * (طبق قاعده «یک selectedMissionId واحد» در docs/UX_MAP_AND_DESIGN_SYSTEM.md §6).
 *
 * محدوده این hook صرفاً orchestration سمت کلاینت است — هیچ موقعیت/فاصله محاسبه نمی‌کند؛ ورودی‌اش
 * همان MapSceneMission[] فاز ۱۰ (GET /api/v1/map/scene) است.
 */
export function useMissionInteraction(missions: MapSceneMission[]) {
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MissionFilterState>(EMPTY_MISSION_FILTER_STATE);
  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<MissionSortField>("startAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [visibleColumns, setVisibleColumns] = useState<Set<MissionColumnKey>>(() => new Set(DEFAULT_VISIBLE_MISSION_COLUMNS));
  const [savedViews, setSavedViews] = useState<SavedMissionView[]>([]);
  const [visibleRowCount, setVisibleRowCount] = useState(PAGE_SIZE);
  const [lastFilterSignature, setLastFilterSignature] = useState("");
  const [lastSyncedSelectionId, setLastSyncedSelectionId] = useState<string | null>(null);

  const visibleMissions = useMemo(
    () => selectVisibleMissions(missions, filter, query, sortField, sortDirection, new Date()),
    [missions, filter, query, sortField, sortDirection],
  );

  // قانون قطعیت UI: اگر مأموریت انتخاب‌شده دیگر با فیلتر/جست‌وجوی فعلی مطابقت نداشته باشد (marker
  // متناظرش هم از نقشه حذف می‌شود چون missions ورودی نقشه هم از همین لیست فیلترشده است)، انتخاب
  // پاک می‌شود. طبق الگوی رسمی React برای «تصحیح state براساس ورودی تغییریافته» این تصحیح مستقیماً
  // حین رندر انجام می‌شود، نه در یک useEffect جداگانه — از یک چرخه رندر/commit اضافه پرهیز می‌کند و
  // قانون eslint مربوط به «فراخوانی setState داخل effect» را نقض نمی‌کند.
  if (selectedMissionId && !visibleMissions.some((m) => m.missionId === selectedMissionId)) {
    setSelectedMissionId(null);
  }

  // تغییر فیلتر/جست‌وجو/مرتب‌سازی صفحه‌بندی را به صفحه اول بازمی‌گرداند؛ رسیدن داده تازه هر ۵ ثانیه
  // (همان آرایه missions بدون تغییر filter/query/sort) عمداً صفحه را ریست نمی‌کند تا اسکرول کاربر
  // از دستش نرود. همان الگوی «تصحیح state حین رندر» با یک امضای فیلتر قابل‌مقایسه.
  const filterSignature = JSON.stringify([filter, query, sortField, sortDirection]);
  if (filterSignature !== lastFilterSignature) {
    setLastFilterSignature(filterSignature);
    setVisibleRowCount(PAGE_SIZE);
  }

  // وقتی انتخاب از طریق نقشه (نه جدول) روی ردیفی خارج از صفحه فعلی رخ می‌دهد، صفحه گسترش می‌یابد
  // تا ردیف انتخاب‌شده هرگز «paged away» نشود.
  if (selectedMissionId !== lastSyncedSelectionId) {
    setLastSyncedSelectionId(selectedMissionId);
    if (selectedMissionId) {
      const index = visibleMissions.findIndex((m) => m.missionId === selectedMissionId);
      if (index >= 0 && index >= visibleRowCount) {
        setVisibleRowCount(index + 1);
      }
    }
  }

  const pagedMissions = useMemo(() => visibleMissions.slice(0, visibleRowCount), [visibleMissions, visibleRowCount]);
  const hasMore = visibleMissions.length > visibleRowCount;

  function toggleSort(field: MissionSortField) {
    if (field === sortField) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function toggleColumn(key: MissionColumnKey) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function resetFilters() {
    setFilter(EMPTY_MISSION_FILTER_STATE);
    setQuery("");
  }

  function applyOriginFilter(originTitle: string) {
    setFilter((prev) => ({ ...prev, originQuery: originTitle }));
  }

  function applyDestinationFilter(destinationTitle: string) {
    setFilter((prev) => ({ ...prev, destinationQuery: destinationTitle }));
  }

  function saveCurrentView(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const view: SavedMissionView = { name: trimmed, filter, query, sortField, sortDirection, visibleColumns: [...visibleColumns] };
    setSavedViews((prev) => [...prev.filter((v) => v.name !== trimmed), view]);
  }

  function applySavedView(view: SavedMissionView) {
    setFilter(view.filter);
    setQuery(view.query);
    setSortField(view.sortField);
    setSortDirection(view.sortDirection);
    setVisibleColumns(new Set(view.visibleColumns));
  }

  function deleteSavedView(name: string) {
    setSavedViews((prev) => prev.filter((v) => v.name !== name));
  }

  return {
    selectedMissionId,
    select: setSelectedMissionId,
    filter,
    setFilter,
    query,
    setQuery,
    sortField,
    sortDirection,
    toggleSort,
    visibleColumns,
    toggleColumn,
    resetFilters,
    applyOriginFilter,
    applyDestinationFilter,
    savedViews,
    saveCurrentView,
    applySavedView,
    deleteSavedView,
    visibleMissions,
    pagedMissions,
    hasMore,
    loadMore: () => setVisibleRowCount((c) => c + PAGE_SIZE),
  };
}

export type MissionInteraction = ReturnType<typeof useMissionInteraction>;
