"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/panel";
import { Sheet } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApiError } from "@/lib/http/api-client-error";
import {
  useCreateMissionType,
  useDeleteMissionType,
  useMissionTypes,
  useUpdateMissionType,
} from "@/features/missions/use-mission-queries";
import type { MissionType } from "@/features/missions/types";

/**
 * Phase 15 — مدیریت نوع مأموریت به‌عنوان داده مرجع (ADR-P15-08).
 * الگو عمداً همان صفحه‌های «نوع خودرو» و «نوع بار» است؛ نوعی که مأموریتی از آن استفاده می‌کند
 * قابل حذف نیست.
 */

type SheetState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; item: MissionType };

const fieldClass =
  "w-full rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";

export function MissionTypeList() {
  const { data: items, isLoading, isError } = useMissionTypes();
  const [sheet, setSheet] = useState<SheetState>({ mode: "closed" });
  const [deleteTarget, setDeleteTarget] = useState<MissionType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const createMutation = useCreateMissionType();
  const updateMutation = useUpdateMissionType();
  const deleteMutation = useDeleteMissionType();

  function openCreate() {
    setName("");
    setCode("");
    setDescription("");
    setIsActive(true);
    setError(null);
    setSheet({ mode: "create" });
  }

  function openEdit(item: MissionType) {
    setName(item.name);
    setCode(item.code ?? "");
    setDescription(item.description ?? "");
    setIsActive(item.isActive);
    setError(null);
    setSheet({ mode: "edit", item });
  }

  async function handleSubmit() {
    setError(null);
    const payload = {
      name: name.trim(),
      code: code.trim() || null,
      description: description.trim() || null,
      isActive,
    };

    try {
      if (sheet.mode === "create") {
        await createMutation.mutateAsync(payload);
      } else if (sheet.mode === "edit") {
        await updateMutation.mutateAsync({ id: sheet.item.id, payload });
      }
      setSheet({ mode: "closed" });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "ذخیره نوع مأموریت ناموفق بود.");
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[var(--color-text-muted)]">
          دسته‌بندی عملیاتی مأموریت‌ها. تعیین نوع برای هر مأموریت اختیاری است.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="min-h-11 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          نوع جدید
        </button>
      </div>

      {error && sheet.mode === "closed" && (
        <p role="alert" className="rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <Panel className="min-w-0 overflow-hidden">
        {isLoading && <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">در حال بارگذاری…</p>}
        {isError && <p className="p-6 text-center text-sm text-[var(--color-danger)]">فهرست بارگذاری نشد.</p>}
        {!isLoading && !isError && (items?.length ?? 0) === 0 && (
          <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">هنوز نوع مأموریتی تعریف نشده است.</p>
        )}

        {(items?.length ?? 0) > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-start text-sm">
              <thead className="bg-[var(--color-bg-sunken)] text-xs text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">نام</th>
                  <th className="px-4 py-3 text-start font-medium">کد</th>
                  <th className="px-4 py-3 text-start font-medium">وضعیت</th>
                  <th className="px-4 py-3 text-start font-medium">مأموریت‌ها</th>
                  <th className="px-4 py-3 text-start font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {(items ?? []).map((item) => (
                  <tr key={item.id} className="border-t border-[var(--color-panel-border)]">
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]">{item.name}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]" dir="ltr">
                      {item.code ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{item.isActive ? "فعال" : "غیرفعال"}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">
                      {item.missionCount.toLocaleString("fa-IR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)]"
                        >
                          ویرایش
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Sheet
        open={sheet.mode !== "closed"}
        onClose={() => setSheet({ mode: "closed" })}
        title={sheet.mode === "edit" ? "ویرایش نوع مأموریت" : "نوع مأموریت جدید"}
      >
        <div className="flex flex-col gap-4">
          {error && (
            <p role="alert" className="rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-xs text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)]" htmlFor="mt-name">
              نام
            </label>
            <input id="mt-name" value={name} onChange={(e) => setName(e.target.value)} className={`${fieldClass} mt-1`} />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)]" htmlFor="mt-code">
              کد (اختیاری)
            </label>
            <input id="mt-code" dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} className={`${fieldClass} mt-1`} />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)]" htmlFor="mt-desc">
              توضیحات (اختیاری)
            </label>
            <textarea
              id="mt-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${fieldClass} mt-1`}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            فعال
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSheet({ mode: "closed" })}
              className="min-h-11 rounded-lg px-3.5 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
            >
              انصراف
            </button>
            <button
              type="button"
              disabled={name.trim().length === 0 || createMutation.isPending || updateMutation.isPending}
              onClick={handleSubmit}
              className="min-h-11 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              ذخیره
            </button>
          </div>
        </div>
      </Sheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف نوع مأموریت"
        description={
          deleteTarget
            ? deleteTarget.missionCount > 0
              ? `«${deleteTarget.name}» توسط ${deleteTarget.missionCount.toLocaleString("fa-IR")} مأموریت استفاده می‌شود و قابل حذف نیست.`
              : `«${deleteTarget.name}» حذف نرم می‌شود.`
            : ""
        }
        confirmLabel="حذف"
        destructive
        pending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setError(null);
          try {
            await deleteMutation.mutateAsync(deleteTarget.id);
          } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : "حذف ناموفق بود.");
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
