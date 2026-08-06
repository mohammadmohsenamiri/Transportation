"use client";

import { useEffect, useState } from "react";
import {
  PLAYBACK_SPEEDS,
  advanceBySpeed,
  clampToRange,
  defaultTimeRange,
  stepMinutes,
  timeForPercent,
  percentForTime,
  type PlaybackSpeed,
  type TimeRange,
} from "@/lib/domain/timeline-rules";

export type TimelineMode = "LIVE" | "HISTORICAL";
export type PlaybackState = "stopped" | "playing" | "paused";

/** فاصله واقعی هر تیک پخش (میلی‌ثانیه) — طبق ADR-028 در docs/DECISIONS.md، بین smoothness و بار سرور تعادل برقرار می‌کند. */
const PLAYBACK_TICK_MS = 1000;
/** فاصله به‌روزرسانی نمایشی نشانگر زمان در حالت زنده (فقط UI — cursor/متن نوار زمان)، مستقل از تناوب واقعی fetch فاز ۱۰. */
const LIVE_DISPLAY_TICK_MS = 1000;

/**
 * Phase 12 — «موتور زمان‌بندی»: تنها منبع مشترک «الان کدام viewTime نمایش داده می‌شود» برای کل صفحه
 * نقشه عملیاتی — دقیقاً همان تعمیم قاعده «یک selectedMissionId مشترک» فاز ۱۱ به «یک viewTime مشترک»
 * (docs/phase-12-timeline-engine/00-README.md §7.2, «Synchronization Context»).
 *
 * این hook هیچ موقعیت/فاصله/وضعیت مأموریت محاسبه نمی‌کند — فقط تصمیم می‌گیرد کدام viewTime باید به
 * useMapScene(viewTime) فاز ۱۰ داده شود؛ محاسبه واقعی صحنه همچنان منحصراً کار همان hook/endpoint فاز ۱۰ است.
 */
export function useTimelineEngine() {
  const [mode, setMode] = useState<TimelineMode>("LIVE");
  const [playbackState, setPlaybackState] = useState<PlaybackState>("stopped");
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [range, setRange] = useState<TimeRange>(() => defaultTimeRange(new Date()));
  const [historicalViewTime, setHistoricalViewTime] = useState<Date>(() => new Date());
  const [liveNow, setLiveNow] = useState<Date>(() => new Date());

  // تیک ساعت زنده — فقط برای نمایش (حرکت نشانگر/متن ساعت روی نوار زمان). خودِ fetch صحنه در حالت
  // زنده مستقل و طبق همان بازه ۵ ثانیه‌ای فاز ۱۰ باقی می‌ماند (viewTimeParam در LIVE برابر
  // undefined است، نه این مقدار محلی) — طبق هدف G7 هیچ درخواست شبکه جدیدی از این تیک ناشی نمی‌شود.
  useEffect(() => {
    if (mode !== "LIVE") return;
    const id = setInterval(() => setLiveNow(new Date()), LIVE_DISPLAY_TICK_MS);
    return () => clearInterval(id);
  }, [mode]);

  // تیک پخش — فقط در حالت HISTORICAL و playbackState==="playing" فعال است؛ هر تیک واقعی زمانِ
  // انتخاب‌شده را به‌اندازه PLAYBACK_TICK_MS × speed جلو می‌برد. توقف در انتهای بازه داخل همین
  // callback (نه بدنه همزمان effect) انجام می‌شود — طبق الگوی مجاز React برای بروزرسانی state از
  // callback یک سیستم خارجی (تایمر)، نه فراخوانی همزمان در بدنه effect.
  useEffect(() => {
    if (mode !== "HISTORICAL" || playbackState !== "playing") return;
    const id = setInterval(() => {
      setHistoricalViewTime((prev) => {
        const next = advanceBySpeed(prev, PLAYBACK_TICK_MS, speed);
        if (next.getTime() >= range.to.getTime()) {
          setPlaybackState("stopped");
          return range.to;
        }
        return next;
      });
    }, PLAYBACK_TICK_MS);
    return () => clearInterval(id);
  }, [mode, playbackState, speed, range]);

  const viewTime = mode === "LIVE" ? liveNow : historicalViewTime;
  const viewTimeParam = mode === "LIVE" ? undefined : viewTime.toISOString();

  function pinHistorical(time: Date, nextPlaybackState: PlaybackState) {
    setMode("HISTORICAL");
    setHistoricalViewTime(clampToRange(time, range));
    setPlaybackState(nextPlaybackState);
  }

  /** جابه‌جایی دستی (drag روی slider، دکمه گام، ورود مستقیم ساعت) — اگر در حال پخش بود، مکث می‌کند؛ در غیر این صورت متوقف می‌ماند. */
  function seekToTime(time: Date) {
    pinHistorical(time, playbackState === "playing" ? "paused" : "stopped");
  }

  function seekToPercent(percent: number) {
    seekToTime(timeForPercent(percent, range));
  }

  function stepBy(minutes: number) {
    seekToTime(stepMinutes(viewTime, minutes, range));
  }

  /** Play از حالت زنده هم قابل فراخوانی است: زمان جاری پین می‌شود و پخش رو به جلو (حتی به آینده) آغاز می‌شود. */
  function play() {
    if (mode === "LIVE") {
      pinHistorical(liveNow, "playing");
      return;
    }
    setPlaybackState("playing");
  }

  function pause() {
    setPlaybackState("paused");
  }

  /** Stop برخلاف Pause، نشانگر را هم به ابتدای بازه بازمی‌گرداند — رفتار استاندارد کنترل پخش رسانه. */
  function stop() {
    setPlaybackState("stopped");
    setHistoricalViewTime(range.from);
  }

  function replay() {
    setMode("HISTORICAL");
    setHistoricalViewTime(range.from);
    setPlaybackState("playing");
  }

  /** بازگشت یک‌مرحله‌ای به زنده — طبق docs/PROJECT_SPEC.md §10 و هدف G4. */
  function returnToLive() {
    const now = new Date();
    setMode("LIVE");
    setPlaybackState("stopped");
    setLiveNow(now);
    setRange(defaultTimeRange(now));
  }

  return {
    mode,
    playbackState,
    speed,
    setSpeed,
    speeds: PLAYBACK_SPEEDS,
    range,
    viewTime,
    viewTimeParam,
    percent: percentForTime(viewTime, range),
    seekToTime,
    seekToPercent,
    stepBy,
    play,
    pause,
    stop,
    replay,
    returnToLive,
  };
}

export type TimelineEngine = ReturnType<typeof useTimelineEngine>;
