"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { utcIsoToJalali } from "@/lib/dates/jalali";
import type { PlaybackSpeed } from "@/lib/domain/timeline-rules";
import type { TimelineEngine } from "@/features/map/use-timeline-engine";

function formatJalaliDateTime(date: Date): string {
  const j = utcIsoToJalali(date);
  const seconds = date.getUTCSeconds();
  return `${j.year}/${String(j.month).padStart(2, "0")}/${String(j.day).padStart(2, "0")} — ${String(j.hour).padStart(2, "0")}:${String(j.minute).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatHourLabel(date: Date): string {
  const j = utcIsoToJalali(date);
  return String(j.hour).padStart(2, "0");
}

const SPEED_LABEL: Record<PlaybackSpeed, string> = {
  0.25: "۰.۲۵×",
  0.5: "۰.۵×",
  1: "۱×",
  2: "۲×",
  4: "۴×",
  8: "۸×",
};

export interface TimelineSeekerProps {
  timeline: TimelineEngine;
}

/**
 * Phase 12 — کنترل نوار زمان: نشان‌دهنده حالت + play/pause + گام ±۵/±۱۵ دقیقه + slider + نشانگر
 * زمان جلالی + انتخاب سرعت + بازگشت به اکنون. طبق docs/UX_MAP_AND_DESIGN_SYSTEM.md §7 به‌صورت نواری
 * زیر نقشه (نه overlay روی آن) رندر می‌شود؛ فقط از خروجی useTimelineEngine می‌خواند/می‌نویسد و هیچ
 * موقعیت/محاسبه‌ای انجام نمی‌دهد.
 */
export function TimelineSeeker({ timeline }: TimelineSeekerProps) {
  const isLive = timeline.mode === "LIVE";
  const isPlaying = timeline.playbackState === "playing";
  const currentJalali = utcIsoToJalali(timeline.viewTime);
  const [jumpHour, setJumpHour] = useState(String(currentJalali.hour));
  const [jumpMinute, setJumpMinute] = useState(String(currentJalali.minute));

  // برچسب‌های ساعت روی نوار — ۵ نقطه مساوی طبق بازه فعلی (شروع، ۲۵٪، ۵۰٪، ۷۵٪، پایان)
  const tickPercents = [0, 25, 50, 75, 100];
  const rangeSpanMs = timeline.range.to.getTime() - timeline.range.from.getTime();
  const tickLabels = tickPercents.map((p) => formatHourLabel(new Date(timeline.range.from.getTime() + (p / 100) * rangeSpanMs)));

  function submitJump(event: React.FormEvent) {
    event.preventDefault();
    const hour = Math.min(23, Math.max(0, Number(jumpHour) || 0));
    const minute = Math.min(59, Math.max(0, Number(jumpMinute) || 0));
    timeline.seekToTime(new Date(timeline.range.from.getTime() + hour * 3_600_000 + minute * 60_000));
  }

  return (
    <Panel className="flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            isLive ? "bg-[var(--color-success-bg)] text-[var(--color-success)]" : "bg-[var(--color-warning-bg)] text-[var(--color-warning)]"
          }`}
        >
          {isLive ? "نمای زنده محاسباتی" : "بازسازی زمانی"}
        </span>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => timeline.stepBy(-15)}
            aria-label="۱۵ دقیقه عقب"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
          >
            <Icon name="skip-back" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => timeline.stepBy(-5)}
            aria-label="۵ دقیقه عقب"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => (isPlaying ? timeline.pause() : timeline.play())}
            aria-label={isPlaying ? "مکث پخش" : "پخش"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-panel-border)] text-[var(--color-text)] hover:text-[var(--color-primary)]"
          >
            <Icon name={isPlaying ? "pause" : "play"} className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => timeline.stepBy(5)}
            aria-label="۵ دقیقه جلو"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
          >
            <Icon name="chevron-left" className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => timeline.stepBy(15)}
            aria-label="۱۵ دقیقه جلو"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
          >
            <Icon name="skip-forward" className="h-4 w-4" />
          </button>
        </div>

        <span aria-label="زمان مشاهده جاری" className="ltr-inline tabular-nums shrink-0 text-xs font-medium text-[var(--color-text)]" dir="ltr">
          {formatJalaliDateTime(timeline.viewTime)}
        </span>

        <form onSubmit={submitJump} className="flex shrink-0 items-center gap-1 text-xs text-[var(--color-text-muted)]">
          پرش به
          <input
            type="number"
            min={0}
            max={23}
            value={jumpHour}
            onChange={(e) => setJumpHour(e.target.value)}
            aria-label="ساعت مقصد پرش"
            className="ltr-inline w-12 rounded-lg border border-[var(--color-panel-border)] bg-transparent px-1.5 py-1 text-center text-xs text-[var(--color-text)]"
          />
          :
          <input
            type="number"
            min={0}
            max={59}
            value={jumpMinute}
            onChange={(e) => setJumpMinute(e.target.value)}
            aria-label="دقیقه مقصد پرش"
            className="ltr-inline w-12 rounded-lg border border-[var(--color-panel-border)] bg-transparent px-1.5 py-1 text-center text-xs text-[var(--color-text)]"
          />
          <button type="submit" className="rounded-lg border border-[var(--color-panel-border)] px-2 py-1 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)]">
            برو
          </button>
        </form>

        <label className="flex shrink-0 items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          سرعت
          <select
            value={timeline.speed}
            onChange={(e) => timeline.setSpeed(Number(e.target.value) as PlaybackSpeed)}
            className="ltr-inline rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1 text-xs text-[var(--color-text)]"
          >
            {timeline.speeds.map((s) => (
              <option key={s} value={s}>
                {SPEED_LABEL[s]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={timeline.returnToLive}
          className={`me-auto shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
            isLive
              ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
              : "border border-[var(--color-panel-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          بازگشت به اکنون
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <input
          type="range"
          min={0}
          max={100}
          step={0.01}
          value={timeline.percent}
          onChange={(e) => timeline.seekToPercent(Number(e.target.value))}
          aria-label="نوار زمان — انتخاب لحظه مشاهده"
          className="w-full accent-[var(--color-primary)]"
        />
        <div className="flex justify-between text-[10px] text-[var(--color-text-subtle)]">
          {tickLabels.map((label, i) => (
            <span key={i} className="ltr-inline tabular-nums">
              {label}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}
