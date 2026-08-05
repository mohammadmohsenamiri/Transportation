"use client";

import { jalaaliMonthLength } from "jalaali-js";
import { jalaliMonthNames, type JalaliDateTime } from "@/lib/dates/jalali";

const inputClass =
  "w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1.5 text-sm tabular-nums text-[var(--color-text)]";

export interface JalaliDateTimeInputProps {
  value: JalaliDateTime;
  onChange: (value: JalaliDateTime) => void;
  error?: string | null;
}

export function JalaliDateTimeInput({ value, onChange, error }: JalaliDateTimeInputProps) {
  function patch(partial: Partial<JalaliDateTime>) {
    onChange({ ...value, ...partial });
  }

  let maxDay = 31;
  try {
    maxDay = jalaaliMonthLength(value.year, value.month);
  } catch {
    // سال/ماه هنوز کامل تایپ نشده؛ حداکثر پیش‌فرض حفظ می‌شود
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs font-medium text-[var(--color-text)]">
          سال
          <input
            type="number"
            dir="ltr"
            value={value.year}
            onChange={(e) => patch({ year: Number(e.target.value) })}
            className={`ltr-inline mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-xs font-medium text-[var(--color-text)]">
          ماه
          <select value={value.month} onChange={(e) => patch({ month: Number(e.target.value) })} className={`mt-1 ${inputClass}`}>
            {jalaliMonthNames.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-[var(--color-text)]">
          روز
          <input
            type="number"
            dir="ltr"
            min={1}
            max={maxDay}
            value={value.day}
            onChange={(e) => patch({ day: Number(e.target.value) })}
            className={`ltr-inline mt-1 ${inputClass}`}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-[var(--color-text)]">
          ساعت
          <input
            type="number"
            dir="ltr"
            min={0}
            max={23}
            value={value.hour}
            onChange={(e) => patch({ hour: Number(e.target.value) })}
            className={`ltr-inline mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-xs font-medium text-[var(--color-text)]">
          دقیقه
          <input
            type="number"
            dir="ltr"
            min={0}
            max={59}
            value={value.minute}
            onChange={(e) => patch({ minute: Number(e.target.value) })}
            className={`ltr-inline mt-1 ${inputClass}`}
          />
        </label>
      </div>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
