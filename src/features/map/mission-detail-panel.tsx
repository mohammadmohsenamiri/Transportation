"use client";

import { Panel } from "@/components/ui/panel";
import { Icon } from "@/components/ui/icons";
import { utcIsoToJalali } from "@/lib/dates/jalali";
import { formatDuration } from "@/features/missions/mission-form-parts";
import { missionDisplayStatusLabel, missionDisplayStatusTone } from "@/features/missions/status-labels";
import type { MapSceneMission } from "@/features/map/types";

const toneClass: Record<string, string> = {
  info: "bg-[var(--color-info-bg)] text-[var(--color-info)]",
  warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  primary: "bg-[var(--color-primary-bg)] text-[var(--color-primary)]",
  success: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  danger: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
};

function formatJalaliDateTime(iso: string): string {
  const j = utcIsoToJalali(iso);
  return `${j.year}/${String(j.month).padStart(2, "0")}/${String(j.day).padStart(2, "0")} — ${String(j.hour).padStart(2, "0")}:${String(j.minute).padStart(2, "0")}`;
}

export interface MissionDetailPanelProps {
  mission: MapSceneMission;
  onClose: () => void;
  onViewFullDetails: (missionId: string) => void;
}

export function MissionDetailPanel({ mission, onClose, onViewFullDetails }: MissionDetailPanelProps) {
  const progressPercent = Math.round(mission.progressRatio * 100);

  return (
    <Panel className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="ltr-inline text-xs text-[var(--color-text-muted)]">{mission.code}</p>
          <h2 className="ltr-inline text-sm font-bold text-[var(--color-text)]">{mission.vehicleIdentifier}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClass[missionDisplayStatusTone[mission.status]]}`}>
            {missionDisplayStatusLabel[mission.status]}
          </span>
          <button type="button" onClick={onClose} aria-label="بستن جزئیات مأموریت" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <Icon name="chevron-left" className="h-4 w-4 rotate-90" />
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-[var(--color-warning-bg)] px-3 py-1.5 text-xs text-[var(--color-warning)]">
        نمای زنده محاسباتی — موقعیت خودرو تقریبی است، نه GPS واقعی.
      </div>

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">مبدأ ← مقصد</dt>
          <dd className="mt-0.5 text-[var(--color-text)]">
            {mission.originTitle} ← {mission.destinationTitle}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">نوع خودرو</dt>
          <dd className="mt-0.5 text-[var(--color-text)]">{mission.vehicleTypeName}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">زمان شروع</dt>
          <dd className="tabular-nums mt-0.5 text-[var(--color-text)]">{formatJalaliDateTime(mission.startAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">ETA</dt>
          <dd className="tabular-nums mt-0.5 text-[var(--color-text)]">{formatJalaliDateTime(mission.estimatedArrivalAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">زمان باقی‌مانده</dt>
          <dd className="tabular-nums mt-0.5 text-[var(--color-text)]">{mission.remainingSeconds > 0 ? formatDuration(mission.remainingSeconds) : "رسیده"}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">نوع/تعداد مرسوله</dt>
          <dd className="mt-0.5 text-[var(--color-text)]">
            {mission.cargoTypeNames.join("، ") || "—"} ({mission.shipmentCount.toLocaleString("fa-IR")})
          </dd>
        </div>
      </dl>

      <div>
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <span>پیشرفت</span>
          <span className="tabular-nums">{progressPercent.toLocaleString("fa-IR")}٪</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-sunken)]">
          <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${progressPercent}%` }} />
        </div>
        {mission.isFallbackDirect && <p className="mt-1 text-[11px] text-[var(--color-text-subtle)]">بدون مسیر تعریف‌شده — خط مستقیم تقریبی</p>}
      </div>

      <button
        type="button"
        onClick={() => onViewFullDetails(mission.missionId)}
        className="w-fit rounded-xl border border-[var(--color-panel-border)] px-3.5 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)]"
      >
        مشاهده جزئیات کامل مأموریت
      </button>
    </Panel>
  );
}
