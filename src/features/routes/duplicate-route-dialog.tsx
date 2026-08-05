"use client";

import { useState } from "react";
import { useDuplicateRoute } from "@/features/routes/use-route-queries";
import { ApiError } from "@/lib/http/api-client-error";

export interface DuplicateRouteDialogProps {
  routeId: string;
  suggestedName: string;
  open: boolean;
  onClose: () => void;
  onDuplicated: (newRouteId: string) => void;
}

export function DuplicateRouteDialog({ routeId, suggestedName, open, onClose, onDuplicated }: DuplicateRouteDialogProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState(suggestedName);
  const [error, setError] = useState<string | null>(null);
  const mutation = useDuplicateRoute();

  if (!open) return null;

  async function handleSubmit() {
    setError(null);
    try {
      const created = await mutation.mutateAsync({ id: routeId, payload: { code, name } });
      onDuplicated(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تکثیر مسیر ناموفق بود.");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="تکثیر مسیر">
      <button type="button" aria-label="بستن" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] p-5 shadow-2xl">
        <h2 className="text-sm font-bold text-[var(--color-text)]">تکثیر مسیر</h2>
        <div className="mt-3 flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--color-text)]">
            شناسه مسیر جدید
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="ltr-inline mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1.5 text-sm"
              placeholder="RT-1404-002"
            />
          </label>
          <label className="text-xs font-medium text-[var(--color-text)]">
            نام مسیر جدید
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1.5 text-sm"
            />
          </label>
          {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
        </div>
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
            onClick={handleSubmit}
            disabled={!code || !name || mutation.isPending}
            className="rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] disabled:opacity-60"
          >
            {mutation.isPending ? "در حال انجام..." : "تکثیر"}
          </button>
        </div>
      </div>
    </div>
  );
}
