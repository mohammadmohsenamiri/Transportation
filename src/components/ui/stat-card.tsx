import type { IconName } from "@/components/ui/icons";
import { Icon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";

export type StatTone = "primary" | "success" | "warning" | "danger" | "purple" | "info";

const toneClass: Record<StatTone, string> = {
  primary: "text-[var(--color-primary)] bg-[var(--color-primary-bg)]",
  success: "text-[var(--color-success)] bg-[var(--color-success-bg)]",
  warning: "text-[var(--color-warning)] bg-[var(--color-warning-bg)]",
  danger: "text-[var(--color-danger)] bg-[var(--color-danger-bg)]",
  purple: "text-[var(--color-purple)] bg-[var(--color-purple-bg)]",
  info: "text-[var(--color-info)] bg-[var(--color-info-bg)]",
};

export function StatCard({
  icon,
  tone,
  label,
  value,
}: {
  icon: IconName;
  tone: StatTone;
  label: string;
  value: string | number;
}) {
  return (
    <Panel className="flex items-center gap-3 p-4" aria-label={`${label}: ${value}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClass[tone]}`}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-[var(--color-text-muted)]">{label}</p>
        <span data-testid="stat-value" className="tabular-nums block text-xl font-bold text-[var(--color-text)] sm:text-2xl">
          {value}
        </span>
      </div>
    </Panel>
  );
}
