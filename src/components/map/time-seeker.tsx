"use client";

import { useEffect, useRef, useState } from "react";
import { timeSeekerHours, timeSeekerCurrentPercent } from "@/demo/fixtures";
import { cn } from "@/lib/utils";

export function TimeSeeker() {
  const [mode, setMode] = useState<"live" | "historical">("live");
  const [playing, setPlaying] = useState(false);
  const [percent, setPercent] = useState(timeSeekerCurrentPercent);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setPercent((prev) => (prev >= 100 ? 0 : prev + 0.6));
    }, 80);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing]);

  function togglePlaying() {
    setMode("historical");
    setPlaying((v) => !v);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-3 sm:flex-row sm:items-center sm:p-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlaying}
          aria-label={playing ? "توقف پخش" : "پخش نمایشی"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-panel-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M7 5.5v13l11-6.5-11-6.5Z" />
            </svg>
          )}
        </button>

        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            mode === "live"
              ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
              : "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
          )}
        >
          {mode === "live" ? "زنده" : "تاریخی"}
        </span>
      </div>

      <div className="relative flex-1">
        <div className="h-1.5 w-full rounded-full bg-[var(--color-bg-sunken)]">
          <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${percent}%` }} />
        </div>
        <div
          className="tabular-nums absolute -top-6 -translate-x-1/2 rounded-md bg-[var(--color-bg-elevated)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text)] shadow"
          style={{ insetInlineStart: `${percent}%` }}
        >
          {timeSeekerHours[Math.min(timeSeekerHours.length - 1, Math.floor((percent / 100) * timeSeekerHours.length))]}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-[var(--color-text-subtle)]">
          {timeSeekerHours.map((hour) => (
            <span key={hour} className="tabular-nums">
              {hour}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          setMode("live");
          setPlaying(false);
          setPercent(timeSeekerCurrentPercent);
        }}
        className={cn(
          "shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-colors",
          mode === "live"
            ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
            : "border border-[var(--color-panel-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
        )}
      >
        بازگشت به اکنون
      </button>
    </div>
  );
}
