import type { KpiTone } from "@/demo/fixtures";
import { cn } from "@/lib/utils";

const toneClass: Record<KpiTone, string> = {
  primary: "text-[var(--color-primary)] bg-[var(--color-primary-bg)]",
  success: "text-[var(--color-success)] bg-[var(--color-success-bg)]",
  warning: "text-[var(--color-warning)] bg-[var(--color-warning-bg)]",
  danger: "text-[var(--color-danger)] bg-[var(--color-danger-bg)]",
  purple: "text-[var(--color-purple)] bg-[var(--color-purple-bg)]",
  info: "text-[var(--color-info)] bg-[var(--color-info-bg)]",
};

export function StatusBadge({ tone, label, className }: { tone: KpiTone; label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        toneClass[tone],
        className ?? "",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

const missionStatusTone: Record<"WAITING" | "IN_PROGRESS" | "ARRIVED" | "CANCELLED", KpiTone> = {
  WAITING: "warning",
  IN_PROGRESS: "primary",
  ARRIVED: "success",
  CANCELLED: "danger",
};

export function MissionStatusBadge({
  status,
  label,
  className,
}: {
  status: "WAITING" | "IN_PROGRESS" | "ARRIVED" | "CANCELLED";
  label: string;
  className?: string;
}) {
  return <StatusBadge tone={missionStatusTone[status]} label={label} className={className} />;
}
