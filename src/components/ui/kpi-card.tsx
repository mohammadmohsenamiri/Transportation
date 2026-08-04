import type { KpiFixture } from "@/demo/fixtures";
import { Icon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";

const toneClass: Record<KpiFixture["tone"], string> = {
  primary: "text-[var(--color-primary)] bg-[var(--color-primary-bg)]",
  success: "text-[var(--color-success)] bg-[var(--color-success-bg)]",
  warning: "text-[var(--color-warning)] bg-[var(--color-warning-bg)]",
  danger: "text-[var(--color-danger)] bg-[var(--color-danger-bg)]",
  purple: "text-[var(--color-purple)] bg-[var(--color-purple-bg)]",
  info: "text-[var(--color-info)] bg-[var(--color-info-bg)]",
};

export function KpiCard({ kpi }: { kpi: KpiFixture }) {
  return (
    <Panel className="flex items-center gap-3 p-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClass[kpi.tone]}`}>
        <Icon name={kpi.icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-[var(--color-text-muted)]">{kpi.label}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="tabular-nums text-xl font-bold text-[var(--color-text)] sm:text-2xl">{kpi.value}</span>
          <span
            className={`tabular-nums text-xs font-medium ${
              kpi.deltaDirection === "up" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
            }`}
          >
            {kpi.deltaDirection === "up" ? "▲" : "▼"} {kpi.deltaLabel}
          </span>
        </div>
      </div>
    </Panel>
  );
}
