"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/panel";
import { ApiError } from "@/lib/http/api-client-error";
import { formatJalaliDateTime } from "@/lib/dates/display";
import {
  useAddMissionNote,
  useDeleteMissionNote,
  useMissionNotes,
} from "@/features/missions/use-mission-queries";

/**
 * Phase 15 — رشته یادداشت‌های مأموریت.
 *
 * `Mission.notes` قدیمی (یادداشت اولیه برنامه‌ریز) جای دیگری در صفحه نمایش داده می‌شود و اینجا
 * ادغام نمی‌شود؛ آن ستون نویسنده و زمان ندارد و ساختنشان یعنی جعل داده ممیزی (ADR-P15-09).
 * برای همین هر دو با برچسب متفاوت دیده می‌شوند، نه در یک فهرست.
 */
export function MissionNoteThread({ missionId }: { missionId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: notes, isLoading, isError } = useMissionNotes(missionId);
  const addMutation = useAddMissionNote();
  const deleteMutation = useDeleteMissionNote();

  async function handleAdd() {
    setError(null);
    try {
      await addMutation.mutateAsync({ id: missionId, body: body.trim() });
      setBody("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "ثبت یادداشت ناموفق بود.");
    }
  }

  return (
    <Panel className="p-4 sm:p-5">
      <h2 className="text-sm font-bold text-[var(--color-text)]">یادداشت‌ها</h2>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        یادداشت‌ها در هر وضعیتی قابل افزودن‌اند و ترتیبشان از جدیدترین است.
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-xs text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="mt-3">
        <label className="block text-xs font-medium text-[var(--color-text-muted)]" htmlFor="new-note">
          یادداشت تازه
        </label>
        <textarea
          id="new-note"
          rows={2}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            disabled={body.trim().length === 0 || addMutation.isPending}
            onClick={handleAdd}
            className="min-h-11 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {addMutation.isPending ? "در حال ثبت…" : "افزودن یادداشت"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {isLoading && <p className="text-sm text-[var(--color-text-muted)]">در حال بارگذاری…</p>}
        {isError && <p className="text-sm text-[var(--color-danger)]">یادداشت‌ها بارگذاری نشدند.</p>}
        {!isLoading && !isError && (notes?.length ?? 0) === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">هنوز یادداشتی ثبت نشده است.</p>
        )}

        {(notes ?? []).map((note) => (
          <div key={note.id} className="rounded-lg border border-[var(--color-panel-border)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">
                <span dir="ltr">{note.createdByUsername}</span> · {formatJalaliDateTime(note.createdAt)}
              </span>
              {note.canDelete && (
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate({ id: missionId, noteId: note.id })}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                >
                  حذف
                </button>
              )}
            </div>
            <p className="mt-1.5 text-sm leading-6 whitespace-pre-wrap text-[var(--color-text)]">{note.body}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
