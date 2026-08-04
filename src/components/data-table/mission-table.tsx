import type { MissionRowFixture } from "@/demo/fixtures";
import { missionStatusLabel } from "@/demo/fixtures";
import { MissionStatusBadge } from "@/components/ui/badge";

function ProgressBar({ value, status }: { value: number; status: MissionRowFixture["status"] }) {
  const color =
    status === "ARRIVED"
      ? "bg-[var(--color-success)]"
      : status === "CANCELLED"
        ? "bg-[var(--color-danger)]"
        : status === "WAITING"
          ? "bg-[var(--color-warning)]"
          : "bg-[var(--color-primary)]";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-sunken)]">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export function MissionTable({ missions }: { missions: MissionRowFixture[] }) {
  return (
    <div>
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="text-right text-xs text-[var(--color-text-muted)]">
            <th className="w-32 py-2 font-medium">پیشرفت</th>
            <th className="py-2 font-medium">وضعیت</th>
            <th className="py-2 font-medium">راننده</th>
            <th className="py-2 font-medium">نوع خودرو</th>
            <th className="py-2 font-medium">مقصد</th>
            <th className="py-2 font-medium">مبدأ</th>
            <th className="py-2 font-medium">کد مأموریت</th>
          </tr>
        </thead>
        <tbody>
          {missions.map((mission) => (
            <tr key={mission.id} className="border-t border-[var(--color-panel-border)]">
              <td className="w-32 py-2.5 pl-4">
                <div className="flex items-center gap-2">
                  <ProgressBar value={mission.progress} status={mission.status} />
                  <span className="tabular-nums w-9 shrink-0 text-xs text-[var(--color-text-muted)]">{mission.progress}٪</span>
                </div>
              </td>
              <td className="py-2.5">
                <MissionStatusBadge status={mission.status} label={missionStatusLabel[mission.status]} />
              </td>
              <td className="py-2.5 text-[var(--color-text)]">{mission.driver}</td>
              <td className="py-2.5 text-[var(--color-text-muted)]">{mission.vehicleType}</td>
              <td className="py-2.5 text-[var(--color-text)]">{mission.destination}</td>
              <td className="py-2.5 text-[var(--color-text)]">{mission.origin}</td>
              <td className="tabular-nums ltr-inline py-2.5 text-right text-[var(--color-text-muted)]">{mission.code}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col gap-3 md:hidden">
        {missions.map((mission) => (
          <li key={mission.id} className="rounded-xl border border-[var(--color-panel-border)] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="ltr-inline text-xs text-[var(--color-text-muted)]">{mission.code}</span>
              <MissionStatusBadge status={mission.status} label={missionStatusLabel[mission.status]} />
            </div>
            <p className="mt-1.5 text-sm text-[var(--color-text)]">
              {mission.origin} <span className="text-[var(--color-text-subtle)]">→</span> {mission.destination}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              {mission.driver} · {mission.vehicleType}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar value={mission.progress} status={mission.status} />
              <span className="tabular-nums w-9 shrink-0 text-xs text-[var(--color-text-muted)]">{mission.progress}٪</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
