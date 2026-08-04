import type { DemoVehicleMarker, selectedMissionDetail as SelectedMissionDetailType } from "@/demo/fixtures";
import { missionStatusLabel } from "@/demo/fixtures";
import { Panel } from "@/components/ui/panel";
import { MissionStatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icons";

type MissionDetail = typeof SelectedMissionDetailType;

export function MissionDetailCard({ marker, detail }: { marker: DemoVehicleMarker; detail: MissionDetail }) {
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-bg)] text-[var(--color-primary)]">
            <Icon name="truck" className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-[var(--color-text)]">خودرو {marker.label}</span>
        </div>
        <MissionStatusBadge status={marker.status} label={missionStatusLabel[marker.status]} />
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm">
        <span className="flex items-center gap-1.5 text-[var(--color-text)]">
          <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" /> {detail.origin}
        </span>
        <span className="h-px flex-1 border-t border-dashed border-[var(--color-panel-border)]" />
        <span className="flex items-center gap-1.5 text-[var(--color-text)]">
          <span className="h-2 w-2 rounded-full bg-[var(--color-danger)]" /> {detail.destination}
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-sunken)]">
        <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${detail.progress}%` }} />
      </div>
      <p className="tabular-nums mt-1.5 text-end text-xs text-[var(--color-text-muted)]">{detail.progress}٪ پیشرفت</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg bg-[var(--color-bg-sunken)] p-2.5">
          <dt className="text-[var(--color-text-subtle)]">زمان حرکت</dt>
          <dd className="mt-1 font-medium text-[var(--color-text)]">{detail.startAt}</dd>
        </div>
        <div className="rounded-lg bg-[var(--color-bg-sunken)] p-2.5">
          <dt className="text-[var(--color-text-subtle)]">زمان تخمینی رسیدن</dt>
          <dd className="mt-1 font-medium text-[var(--color-text)]">{detail.eta}</dd>
        </div>
        <div className="rounded-lg bg-[var(--color-bg-sunken)] p-2.5">
          <dt className="text-[var(--color-text-subtle)]">زمان باقی‌مانده</dt>
          <dd className="mt-1 font-medium text-[var(--color-text)]">{detail.remaining}</dd>
        </div>
        <div className="rounded-lg bg-[var(--color-bg-sunken)] p-2.5">
          <dt className="text-[var(--color-text-subtle)]">نوع خودرو</dt>
          <dd className="mt-1 font-medium text-[var(--color-text)]">{detail.vehicleType}</dd>
        </div>
      </dl>

      <p className="mt-3 text-[11px] text-[var(--color-text-subtle)]">
        * موقعیت‌ها تقریبی و بر مبنای داده پیش‌نمایش هستند، نه GPS واقعی.
      </p>
    </Panel>
  );
}
