import type { MissionSortField } from "@/lib/domain/mission-interaction-rules";

export type MissionColumnKey = "code" | "route" | "vehicle" | "vehicleType" | "status" | "startAt" | "eta" | "remaining" | "progress" | "cargo";

export interface MissionColumnDef {
  key: MissionColumnKey;
  label: string;
  /** اگر ستون قابل مرتب‌سازی است، فیلد مربوطه در MissionSortField را مشخص می‌کند. */
  sortField?: MissionSortField;
  /** ستون‌های الزامی که کاربر نمی‌تواند پنهانشان کند — جدول بدون آن‌ها بی‌معنی می‌شود. */
  alwaysVisible?: boolean;
}

export const MISSION_TABLE_COLUMNS: readonly MissionColumnDef[] = [
  { key: "code", label: "کد مأموریت", alwaysVisible: true },
  { key: "status", label: "وضعیت", sortField: "status", alwaysVisible: true },
  { key: "route", label: "مبدأ ← مقصد" },
  { key: "vehicle", label: "خودرو", sortField: "vehicleIdentifier" },
  { key: "vehicleType", label: "نوع خودرو" },
  { key: "startAt", label: "شروع", sortField: "startAt" },
  { key: "eta", label: "ETA", sortField: "estimatedArrivalAt" },
  { key: "remaining", label: "باقی‌مانده" },
  { key: "progress", label: "پیشرفت", sortField: "progressRatio" },
  { key: "cargo", label: "بار" },
];

export const DEFAULT_VISIBLE_MISSION_COLUMNS: readonly MissionColumnKey[] = ["code", "status", "route", "vehicle", "eta", "progress"];
