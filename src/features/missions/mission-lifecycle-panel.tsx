"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/panel";
import { ApiError } from "@/lib/http/api-client-error";
import { jalaliToUtcIso, utcIsoToJalali } from "@/lib/dates/jalali";
import { JalaliDateTimeInput } from "@/components/ui/jalali-datetime-input";
import { missionFailureClassificationLabel } from "@/lib/domain/mission-labels";
import {
  useArchiveMission,
  useCompleteMission,
  useFailMission,
  useReopenMission,
  useUnarchiveMission,
} from "@/features/missions/use-mission-queries";
import type { Mission, MissionFailureClassificationValue } from "@/features/missions/types";

/**
 * Phase 15 — کنترل‌های گذار چرخه عمر روی صفحه جزئیات مأموریت.
 *
 * ⚠️ نمایان‌بودن این دکمه‌ها **کنترل امنیتی نیست**. سرور مستقلاً هم نقش و هم اعتبار گذار را
 * بررسی می‌کند؛ اینجا فقط از نشان‌دادن کاری که قطعاً رد می‌شود پرهیز می‌کنیم (`CLAUDE.md` §۲).
 */

const CLASSIFICATIONS: MissionFailureClassificationValue[] = [
  "VEHICLE_BREAKDOWN",
  "ACCIDENT",
  "CARGO_ISSUE",
  "ROUTE_BLOCKED",
  "WEATHER",
  "DRIVER_UNAVAILABLE",
  "OTHER",
];

type DialogState =
  | { mode: "closed" }
  | { mode: "complete" }
  | { mode: "fail" }
  | { mode: "reopen" }
  | { mode: "archive" }
  | { mode: "unarchive" };

const fieldClass =
  "w-full rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";

function nowJalali() {
  return utcIsoToJalali(new Date().toISOString());
}

export interface MissionLifecyclePanelProps {
  mission: Mission;
  /** فقط مدیر و برنامه‌ریز مأموریت — ناظر وضعیت هیچ کنترلی نمی‌بیند (ADR-P15-06). */
  canManageLifecycle: boolean;
}

export function MissionLifecyclePanel({ mission, canManageLifecycle }: MissionLifecyclePanelProps) {
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const [arrivalAt, setArrivalAt] = useState(nowJalali);
  const [departureAt, setDepartureAt] = useState<ReturnType<typeof nowJalali> | null>(null);
  const [failedAt, setFailedAt] = useState(nowJalali);
  const [failureReason, setFailureReason] = useState("");
  const [classification, setClassification] = useState<MissionFailureClassificationValue>("VEHICLE_BREAKDOWN");
  const [reopenReason, setReopenReason] = useState("");

  const completeMutation = useCompleteMission();
  const failMutation = useFailMission();
  const archiveMutation = useArchiveMission();
  const unarchiveMutation = useUnarchiveMission();
  const reopenMutation = useReopenMission();

  const pending =
    completeMutation.isPending ||
    failMutation.isPending ||
    archiveMutation.isPending ||
    unarchiveMutation.isPending ||
    reopenMutation.isPending;

  /**
   * CC-06 — تعارض نسخه باید *قابل بازیابی* باشد، نه یک ۴۰۹ خام. کاربر پیام فارسی و دکمه
   * تازه‌سازی می‌بیند و هیچ نوشته‌ای بی‌صدا بازنویسی نمی‌شود.
   */
  async function run(action: () => Promise<unknown>) {
    setError(null);
    setConflict(false);
    try {
      await action();
      setDialog({ mode: "closed" });
    } catch (caught) {
      if (caught instanceof ApiError) {
        setConflict(caught.code === "MISSION_VERSION_CONFLICT");
        setError(caught.message);
      } else {
        setError("عملیات با خطا مواجه شد.");
      }
    }
  }

  const status = mission.persistedStatus;
  const canComplete = status === "SCHEDULED";
  const canFail = status === "SCHEDULED";
  const canArchive = status === "COMPLETED" || status === "FAILED" || status === "CANCELLED";
  const canUnarchive = status === "ARCHIVED";
  const canReopen = status === "COMPLETED" || status === "FAILED";

  if (!canManageLifecycle) return null;
  if (!canComplete && !canFail && !canArchive && !canUnarchive && !canReopen) return null;

  return (
    <Panel className="p-4 sm:p-5">
      <h2 className="text-sm font-bold text-[var(--color-text)]">چرخه عمر مأموریت</h2>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        ثبت آنچه واقعاً رخ داده است — این اطلاعات جدا از برنامه‌ریزی نگهداری می‌شود و آن را بازنویسی نمی‌کند.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-xs text-[var(--color-danger)]"
        >
          {error}
          {conflict && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ms-2 font-bold underline"
            >
              تازه‌سازی صفحه
            </button>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {canComplete && (
          <ActionButton label="ثبت تکمیل" tone="success" onClick={() => setDialog({ mode: "complete" })} />
        )}
        {canFail && <ActionButton label="ثبت شکست" tone="danger" onClick={() => setDialog({ mode: "fail" })} />}
        {canReopen && <ActionButton label="بازگشایی" tone="primary" onClick={() => setDialog({ mode: "reopen" })} />}
        {canArchive && <ActionButton label="بایگانی" tone="neutral" onClick={() => setDialog({ mode: "archive" })} />}
        {canUnarchive && (
          <ActionButton label="خروج از بایگانی" tone="primary" onClick={() => setDialog({ mode: "unarchive" })} />
        )}
      </div>

      {dialog.mode === "complete" && (
        <LifecycleForm
          title="ثبت تکمیل مأموریت"
          description="زمان رسیدن واقعی ثبت می‌شود و مرسوله‌های مأموریت «تحویل‌شده» می‌شوند. زودتر یا دیرتر از تخمین بودن، خطا نیست."
          confirmLabel="ثبت تکمیل"
          pending={pending}
          onCancel={() => setDialog({ mode: "closed" })}
          onConfirm={() =>
            run(() =>
              completeMutation.mutateAsync({
                id: mission.id,
                version: mission.version,
                actualArrivalAt: jalaliToUtcIso(arrivalAt),
                actualDepartureAt: departureAt ? jalaliToUtcIso(departureAt) : null,
              }),
            )
          }
        >
          <label className="block text-xs font-medium text-[var(--color-text-muted)]">
            زمان رسیدن واقعی
            <JalaliDateTimeInput value={arrivalAt} onChange={setArrivalAt} />
          </label>
          <label className="mt-3 block text-xs font-medium text-[var(--color-text-muted)]">
            زمان حرکت واقعی (اختیاری)
            <JalaliDateTimeInput value={departureAt ?? arrivalAt} onChange={setDepartureAt} />
          </label>
        </LifecycleForm>
      )}

      {dialog.mode === "fail" && (
        <LifecycleForm
          title="ثبت شکست مأموریت"
          description="مرسوله‌ها به «در انتظار اعزام» برمی‌گردند تا دوباره برنامه‌ریزی شوند."
          confirmLabel="ثبت شکست"
          destructive
          pending={pending}
          disabled={failureReason.trim().length < 3}
          onCancel={() => setDialog({ mode: "closed" })}
          onConfirm={() =>
            run(() =>
              failMutation.mutateAsync({
                id: mission.id,
                version: mission.version,
                failedAt: jalaliToUtcIso(failedAt),
                failureReason: failureReason.trim(),
                failureClassification: classification,
              }),
            )
          }
        >
          <label className="block text-xs font-medium text-[var(--color-text-muted)]">
            زمان شکست
            <JalaliDateTimeInput value={failedAt} onChange={setFailedAt} />
          </label>
          <label className="mt-3 block text-xs font-medium text-[var(--color-text-muted)]" htmlFor="failure-class">
            طبقه‌بندی علت
          </label>
          <select
            id="failure-class"
            value={classification}
            onChange={(event) => setClassification(event.target.value as MissionFailureClassificationValue)}
            className={`${fieldClass} mt-1`}
          >
            {CLASSIFICATIONS.map((item) => (
              <option key={item} value={item}>
                {missionFailureClassificationLabel[item]}
              </option>
            ))}
          </select>
          <label className="mt-3 block text-xs font-medium text-[var(--color-text-muted)]" htmlFor="failure-reason">
            شرح علت
          </label>
          <textarea
            id="failure-reason"
            rows={3}
            value={failureReason}
            onChange={(event) => setFailureReason(event.target.value)}
            className={`${fieldClass} mt-1`}
          />
        </LifecycleForm>
      )}

      {dialog.mode === "reopen" && (
        <LifecycleForm
          title="بازگشایی مأموریت"
          description="مأموریت به «برنامه‌ریزی‌شده» برمی‌گردد و واقعیت‌های ثبت‌شده پاک می‌شوند. اگر مرسوله‌ای در این فاصله به مأموریت دیگری رفته باشد، بازگشایی رد می‌شود."
          confirmLabel="بازگشایی"
          pending={pending}
          disabled={reopenReason.trim().length < 3}
          onCancel={() => setDialog({ mode: "closed" })}
          onConfirm={() =>
            run(() =>
              reopenMutation.mutateAsync({
                id: mission.id,
                version: mission.version,
                reopenReason: reopenReason.trim(),
              }),
            )
          }
        >
          <label className="block text-xs font-medium text-[var(--color-text-muted)]" htmlFor="reopen-reason">
            دلیل بازگشایی
          </label>
          <textarea
            id="reopen-reason"
            rows={3}
            value={reopenReason}
            onChange={(event) => setReopenReason(event.target.value)}
            className={`${fieldClass} mt-1`}
          />
        </LifecycleForm>
      )}

      {dialog.mode === "archive" && (
        <LifecycleForm
          title="بایگانی مأموریت"
          description={`مأموریت «${mission.code}» از نماهای عملیاتی خارج می‌شود. سوابق و مرسوله‌ها تغییری نمی‌کنند و بعداً قابل خروج از بایگانی است.`}
          confirmLabel="بایگانی"
          pending={pending}
          onCancel={() => setDialog({ mode: "closed" })}
          onConfirm={() => run(() => archiveMutation.mutateAsync({ id: mission.id, version: mission.version }))}
        />
      )}

      {dialog.mode === "unarchive" && (
        <LifecycleForm
          title="خروج از بایگانی"
          description={`مأموریت «${mission.code}» به وضعیت پیش از بایگانی برمی‌گردد.`}
          confirmLabel="خروج از بایگانی"
          pending={pending}
          onCancel={() => setDialog({ mode: "closed" })}
          onConfirm={() => run(() => unarchiveMutation.mutateAsync({ id: mission.id, version: mission.version }))}
        />
      )}
    </Panel>
  );
}

function ActionButton({
  label,
  tone,
  onClick,
}: {
  label: string;
  tone: "success" | "danger" | "primary" | "neutral";
  onClick: () => void;
}) {
  const toneClass =
    tone === "success"
      ? "bg-[var(--color-success)] text-white"
      : tone === "danger"
        ? "bg-[var(--color-danger)] text-white"
        : tone === "primary"
          ? "bg-[var(--color-primary)] text-white"
          : "border border-[var(--color-panel-border)] text-[var(--color-text)]";

  return (
    <button
      type="button"
      onClick={onClick}
      // حداقل ۴۴ پیکسل ارتفاع برای هدف لمسی (AX-04).
      className={`min-h-11 rounded-lg px-4 py-2 text-sm font-medium ${toneClass}`}
    >
      {label}
    </button>
  );
}

function LifecycleForm({
  title,
  description,
  confirmLabel,
  destructive = false,
  pending,
  disabled = false,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  pending: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] p-4">
      <h3 className="text-sm font-bold text-[var(--color-text)]">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{description}</p>

      {children && <div className="mt-3">{children}</div>}

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-lg px-3.5 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
        >
          انصراف
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending || disabled}
          className={`min-h-11 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
            destructive ? "bg-[var(--color-danger)]" : "bg-[var(--color-primary)]"
          }`}
        >
          {pending ? "در حال ثبت…" : confirmLabel}
        </button>
      </div>
    </div>
  );
}
