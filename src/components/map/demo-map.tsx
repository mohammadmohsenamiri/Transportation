"use client";

import { Icon } from "@/components/ui/icons";
import type { DemoVehicleMarker } from "@/demo/fixtures";
import { missionStatusLabel } from "@/demo/fixtures";
import { cn } from "@/lib/utils";

const statusColorVar: Record<DemoVehicleMarker["status"], string> = {
  WAITING: "var(--color-warning)",
  IN_PROGRESS: "var(--color-primary)",
  ARRIVED: "var(--color-success)",
  CANCELLED: "var(--color-danger)",
};

export function DemoMap({
  markers,
  selectedId,
  onSelect,
}: {
  markers: DemoVehicleMarker[];
  selectedId: string | null;
  onSelect: (marker: DemoVehicleMarker) => void;
}) {
  return (
    <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)]">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-panel-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-panel-border) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 45% 40%, var(--color-panel-glow), transparent 60%)",
        }}
      />

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-70">
        <path
          d="M 44 34 Q 55 40 66 22"
          stroke="var(--color-primary)"
          strokeWidth="0.4"
          fill="none"
          strokeDasharray="1.4 1.2"
        />
        <path
          d="M 44 34 Q 42 44 40 52"
          stroke="var(--color-text-subtle)"
          strokeWidth="0.3"
          fill="none"
          strokeDasharray="1.4 1.2"
        />
        <path
          d="M 40 52 Q 33 58 24 62"
          stroke="var(--color-text-subtle)"
          strokeWidth="0.3"
          fill="none"
          strokeDasharray="1.4 1.2"
        />
        <path
          d="M 40 52 Q 44 64 47 74"
          stroke="var(--color-text-subtle)"
          strokeWidth="0.3"
          fill="none"
          strokeDasharray="1.4 1.2"
        />
        <path
          d="M 40 52 Q 40 60 40 66"
          stroke="var(--color-text-subtle)"
          strokeWidth="0.3"
          fill="none"
          strokeDasharray="1.4 1.2"
        />
      </svg>

      {markers.map((marker) => {
        const active = marker.id === selectedId;
        return (
          <button
            key={marker.id}
            type="button"
            onClick={() => onSelect(marker)}
            aria-label={`مشاهده جزئیات خودرو ${marker.label} در ${marker.city} (${missionStatusLabel[marker.status]})`}
            aria-pressed={active}
            style={{ left: `${marker.leftPercent}%`, top: `${marker.topPercent}%` }}
            className={cn(
              "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 focus:outline-none",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-lg transition-transform",
                active && "scale-125",
              )}
              style={{
                backgroundColor: "var(--color-bg-elevated)",
                borderColor: statusColorVar[marker.status],
                color: statusColorVar[marker.status],
              }}
            >
              <Icon name="truck" className="h-4 w-4" />
            </span>
            <span className="tabular-nums rounded-md bg-[var(--color-bg-elevated)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text)] shadow">
              {marker.city}
            </span>
          </button>
        );
      })}

      <div className="absolute bottom-3 start-3 rounded-lg bg-[var(--color-bg-elevated)]/90 px-2.5 py-1 text-[11px] text-[var(--color-text-muted)] shadow">
        نقشه پیش‌نمایش غیرعملیاتی — بدون داده مکانی واقعی
      </div>
    </div>
  );
}
