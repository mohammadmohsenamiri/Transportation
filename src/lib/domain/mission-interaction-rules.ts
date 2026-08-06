import { tehranCalendarDayRange } from "@/lib/dates/jalali";
import type { MapSceneMission } from "@/features/map/types";
import type { MissionDisplayStatusValue } from "@/features/missions/types";

/**
 * Phase 11 — لایه محض قواعد فیلتر/جست‌وجو/مرتب‌سازی جدول مأموریت روی داده Scene فاز ۱۰
 * (GET /api/v1/map/scene). این فایل هیچ موقعیت/فاصله/ETA/bearing محاسبه نمی‌کند — فقط
 * فیلدهای از پیش‌محاسبه‌شده MapSceneMission را می‌خواند. توابع pure و deterministic هستند
 * تا مطابق CLAUDE.md بتوانند بدون DB/React مستقل آزمون شوند.
 */

export type MissionSortField = "startAt" | "estimatedArrivalAt" | "progressRatio" | "status" | "vehicleIdentifier";
export type SortDirection = "asc" | "desc";

/** بازه‌های نسبی به «اکنون» (rolling window)، نه هفته/روز تقویمی، تا از پیچیدگی شروع هفته شمسی پرهیز شود. */
export type TimeFilterPreset = "ALL" | "TODAY" | "NEXT_24H" | "NEXT_7_DAYS";
export type EtaFilterPreset = TimeFilterPreset | "OVERDUE";

export interface MissionFilterState {
  originQuery: string;
  destinationQuery: string;
  vehicleTypeName: string; // "" یعنی همه
  status: MissionDisplayStatusValue | ""; // "" یعنی همه
  startAtPreset: TimeFilterPreset;
  etaPreset: EtaFilterPreset;
  /** «فقط مأموریت‌های فعال در زمان مشاهده» طبق docs/PROJECT_SPEC.md §9 — یعنی status === IN_PROGRESS. */
  activeOnly: boolean;
}

export const EMPTY_MISSION_FILTER_STATE: MissionFilterState = {
  originQuery: "",
  destinationQuery: "",
  vehicleTypeName: "",
  status: "",
  startAtPreset: "ALL",
  etaPreset: "ALL",
  activeOnly: false,
};

export function isMissionFilterActive(filter: MissionFilterState): boolean {
  return (
    filter.originQuery.trim() !== "" ||
    filter.destinationQuery.trim() !== "" ||
    filter.vehicleTypeName !== "" ||
    filter.status !== "" ||
    filter.startAtPreset !== "ALL" ||
    filter.etaPreset !== "ALL" ||
    filter.activeOnly
  );
}

/** بازه [from, to) معادل هر preset را نسبت به لحظه `now` محاسبه می‌کند؛ ALL یعنی بدون محدودیت (null). */
export function resolveTimePresetRange(preset: TimeFilterPreset, now: Date): { from: Date | null; to: Date | null } {
  switch (preset) {
    case "ALL":
      return { from: null, to: null };
    case "TODAY":
      return tehranCalendarDayRange(now);
    case "NEXT_24H":
      return { from: now, to: new Date(now.getTime() + 24 * 60 * 60 * 1000) };
    case "NEXT_7_DAYS":
      return { from: now, to: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) };
  }
}

function withinPresetRange(value: Date, preset: TimeFilterPreset, now: Date): boolean {
  const { from, to } = resolveTimePresetRange(preset, now);
  if (from && value < from) return false;
  if (to && value >= to) return false;
  return true;
}

/** یک مأموریت با ETA در گذشته که هنوز نرسیده (status !== ARRIVED) «دیرکرد» محسوب می‌شود. */
export function isMissionOverdue(mission: MapSceneMission, now: Date): boolean {
  return mission.status !== "ARRIVED" && mission.status !== "CANCELLED" && mission.status !== "ARCHIVED" && new Date(mission.estimatedArrivalAt) < now;
}

function containsCaseInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLocaleLowerCase("fa-IR").includes(needle.trim().toLocaleLowerCase("fa-IR"));
}

/** فیلتر ترکیبی: تمام شرط‌های فعال با AND اعمال می‌شوند (هیچ گروه OR بین انواع مختلف فیلتر وجود ندارد). */
export function missionMatchesFilter(mission: MapSceneMission, filter: MissionFilterState, now: Date): boolean {
  if (filter.originQuery.trim() && !containsCaseInsensitive(mission.originTitle, filter.originQuery)) return false;
  if (filter.destinationQuery.trim() && !containsCaseInsensitive(mission.destinationTitle, filter.destinationQuery)) return false;
  if (filter.vehicleTypeName && mission.vehicleTypeName !== filter.vehicleTypeName) return false;
  if (filter.status && mission.status !== filter.status) return false;
  if (filter.activeOnly && mission.status !== "IN_PROGRESS") return false;
  if (filter.startAtPreset !== "ALL" && !withinPresetRange(new Date(mission.startAt), filter.startAtPreset, now)) return false;

  if (filter.etaPreset === "OVERDUE") {
    if (!isMissionOverdue(mission, now)) return false;
  } else if (filter.etaPreset !== "ALL" && !withinPresetRange(new Date(mission.estimatedArrivalAt), filter.etaPreset, now)) {
    return false;
  }

  return true;
}

/** جست‌وجوی آزاد روی کد مأموریت، شناسه خودرو و کد رهگیری مرسوله‌ها — طبق docs/PROJECT_SPEC.md §9. */
export function missionMatchesQuery(mission: MapSceneMission, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const q = trimmed.toLocaleLowerCase("fa-IR");
  if (mission.code.toLocaleLowerCase("fa-IR").includes(q)) return true;
  if (mission.vehicleIdentifier.toLocaleLowerCase("fa-IR").includes(q)) return true;
  return mission.shipmentTrackingCodes.some((code) => code.toLocaleLowerCase("fa-IR").includes(q));
}

function sortKey(mission: MapSceneMission, field: MissionSortField): number | string {
  switch (field) {
    case "startAt":
      return new Date(mission.startAt).getTime();
    case "estimatedArrivalAt":
      return new Date(mission.estimatedArrivalAt).getTime();
    case "progressRatio":
      return mission.progressRatio;
    case "status":
      return mission.status;
    case "vehicleIdentifier":
      return mission.vehicleIdentifier;
  }
}

/**
 * مرتب‌سازی پایدار (stable) با tie-break صریح روی کد مأموریت صعودی — طبق ADR-P11-02، هرگز دو
 * فراخوانی با ورودی یکسان نباید ترتیب متفاوتی برگردانند، حتی وقتی مقدار فیلد اصلی برابر است.
 */
export function sortMissionRows(missions: MapSceneMission[], field: MissionSortField, direction: SortDirection): MapSceneMission[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...missions].sort((a, b) => {
    const ka = sortKey(a, field);
    const kb = sortKey(b, field);
    if (ka < kb) return -1 * sign;
    if (ka > kb) return 1 * sign;
    return a.code.localeCompare(b.code, "fa-IR");
  });
}

/** خط لوله کامل: فیلتر → جست‌وجو → مرتب‌سازی، دقیقاً به همین ترتیب. */
export function selectVisibleMissions(
  missions: MapSceneMission[],
  filter: MissionFilterState,
  query: string,
  sortField: MissionSortField,
  sortDirection: SortDirection,
  now: Date,
): MapSceneMission[] {
  const filtered = missions.filter((m) => missionMatchesFilter(m, filter, now) && missionMatchesQuery(m, query));
  return sortMissionRows(filtered, sortField, sortDirection);
}
