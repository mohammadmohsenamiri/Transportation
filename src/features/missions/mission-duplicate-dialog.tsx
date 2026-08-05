"use client";

import { useState } from "react";
import { JalaliDateTimeInput } from "@/components/ui/jalali-datetime-input";
import { jalaliToUtcIso, isValidJalaliDateTime, utcIsoToJalali, type JalaliDateTime } from "@/lib/dates/jalali";
import { useDuplicateMission } from "@/features/missions/use-mission-queries";
import { ApiError } from "@/lib/http/api-client-error";

export interface MissionDuplicateDialogProps {
  missionId: string;
  open: boolean;
  onClose: () => void;
  onDuplicated: (newMissionId: string) => void;
}

function defaultStartAt(): JalaliDateTime {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const jalali = utcIsoToJalali(tomorrow.toISOString());
  return { ...jalali, hour: 8, minute: 0 };
}

export function MissionDuplicateDialog({ missionId, open, onClose, onDuplicated }: MissionDuplicateDialogProps) {
  const [startAt, setStartAt] = useState<JalaliDateTime>(defaultStartAt());
  const [error, setError] = useState<string | null>(null);
  const mutation = useDuplicateMission();

  if (!open) return null;

  // «در آینده بودن» را سرور بررسی می‌کند؛ اینجا فقط اعتبار ساختاری بررسی می‌شود (بدون فراخوانی Date.now در render)
  const startAtValid = isValidJalaliDateTime(startAt);

  async function handleConfirm() {
    setError(null);
    try {
      const created = await mutation.mutateAsync({ id: missionId, startAt: jalaliToUtcIso(startAt) });
      onDuplicated(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تکثیر مأموریت ناموفق بود.");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="تکثیر مأموریت">
      <button type="button" aria-label="بستن" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] p-5 shadow-2xl">
        <h2 className="text-sm font-bold text-[var(--color-text)]">تکثیر مأموریت</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
          مأموریت پیش‌نویس جدیدی با همان خودرو، مبدأ/مقصد، مرسوله‌ها و مسیر با زمان شروع جدید ساخته می‌شود.
        </p>
        <div className="mt-3">
          <JalaliDateTimeInput value={startAt} onChange={setStartAt} error={!startAtValid ? "زمان شروع باید در آینده باشد." : null} />
        </div>
        {error && <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--color-panel-border)] px-3.5 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)]"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!startAtValid || mutation.isPending}
            className="rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] disabled:opacity-60"
          >
            {mutation.isPending ? "در حال تکثیر..." : "تکثیر"}
          </button>
        </div>
      </div>
    </div>
  );
}
