import type { DonutSegmentFixture } from "@/demo/fixtures";

const toneVar: Record<DonutSegmentFixture["tone"], string> = {
  primary: "var(--color-primary)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  purple: "var(--color-purple)",
  info: "var(--color-info)",
};

export function DonutChart({ segments, centerLabel }: { segments: DonutSegmentFixture[]; centerLabel: string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = 15.9;
  const circumference = 2 * Math.PI * radius;

  const dashLengths = segments.map((segment) => (segment.value / total) * circumference);
  const dashOffsets = dashLengths.map((_, index) => -dashLengths.slice(0, index).reduce((sum, length) => sum + length, 0));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle cx="18" cy="18" r={radius} fill="none" stroke="var(--color-panel-border)" strokeWidth="4" />
          {segments.map((segment, index) => (
            <circle
              key={segment.id}
              cx="18"
              cy="18"
              r={radius}
              fill="none"
              stroke={toneVar[segment.tone]}
              strokeWidth="4"
              strokeDasharray={`${dashLengths[index]} ${circumference - dashLengths[index]}`}
              strokeDashoffset={dashOffsets[index]}
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular-nums text-xl font-bold text-[var(--color-text)]">{total.toLocaleString("fa-IR")}</span>
          <span className="text-xs text-[var(--color-text-muted)]">{centerLabel}</span>
        </div>
      </div>
      <ul className="flex w-full flex-col gap-2">
        {segments.map((segment) => (
          <li key={segment.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: toneVar[segment.tone] }} />
              {segment.label}
            </span>
            <span className="tabular-nums text-[var(--color-text)]">
              {segment.value.toLocaleString("fa-IR")} ({segment.percentLabel})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
