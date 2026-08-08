"use client";

import { useState } from "react";
import { useCancelMission } from "@/features/missions/use-mission-queries";
import { ApiError } from "@/lib/http/api-client-error";

export interface MissionCancelDialogProps {
  missionId: string;
  /** Phase 15 — نسخه‌ای که صفحه خوانده است؛ پیش‌شرط نوشتن (FR-10). */
  missionVersion: number;
  open: boolean;
  onClose: () => void;
  onCancelled: () => void;
}

export function MissionCancelDialog({ missionId, missionVersion, open, onClose, onCancelled }: MissionCancelDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useCancelMission();

  if (!open) return null;

  async function handleConfirm() {
    setError(null);
    try {
      await mutation.mutateAsync({ id: missionId, cancellationReason: reason, version: missionVersion });
      setReason("");
      onCancelled();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "لغو مأموریت ناموفق بود.");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label="لغو مأموریت">
      <button type="button" aria-label="بستن" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] p-5 shadow-2xl">
        <h2 className="text-sm font-bold text-[var(--color-text)]">لغو مأموریت</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
          این مأموریت لغو می‌شود و مرسوله‌های آن آزاد خواهند شد. برای تخصیص دوباره، مأموریت را تکثیر کنید.
        </p>
        <label className="mt-3 block text-xs font-medium text-[var(--color-text)]">
          دلیل لغو
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1.5 text-sm text-[var(--color-text)]"
            placeholder="مثلاً: تغییر برنامه ارسال"
          />
        </label>
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
            disabled={!reason.trim() || mutation.isPending}
            className="rounded-xl bg-[var(--color-danger)] px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {mutation.isPending ? "در حال لغو..." : "لغو مأموریت"}
          </button>
        </div>
      </div>
    </div>
  );
}
