"use client";

import { useRef, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { Sheet } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApiError } from "@/lib/http/api-client-error";
import { formatFileSize } from "@/lib/dates/display";
import {
  useDeleteIcon,
  useIcons,
  useReplaceIcon,
  useRestoreIcon,
  useUploadIcon,
} from "@/features/icons/use-icon-queries";
import {
  iconCategoryLabels,
  iconCategoryValues,
  type IconAsset,
  type IconCategory,
} from "@/features/icons/types";

const controlClass =
  "rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";

export function IconLibrary() {
  const [category, setCategory] = useState<IconCategory | "">("");
  const [q, setQ] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(1);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState<IconCategory>("VEHICLE");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IconAsset | null>(null);
  const replaceTargetRef = useRef<IconAsset | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError } = useIcons({ category, q, includeDeleted, page });
  const uploadMutation = useUploadIcon();
  const replaceMutation = useReplaceIcon();
  const deleteMutation = useDeleteIcon();
  const restoreMutation = useRestoreIcon();

  async function runAction(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      return true;
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "عملیات با خطا مواجه شد.");
      return false;
    }
  }

  async function handleUpload() {
    if (!uploadFile) return;
    setUploadError(null);
    try {
      await uploadMutation.mutateAsync({ file: uploadFile, name: uploadName.trim(), category: uploadCategory });
      setUploadOpen(false);
      setUploadFile(null);
      setUploadName("");
    } catch (error) {
      // پیام سرور نام سازه ناامن SVG را می‌برد؛ عیناً نشان داده می‌شود تا مدیر بداند چه چیزی رد شد.
      setUploadError(error instanceof ApiError ? error.message : "بارگذاری آیکن ناموفق بود.");
    }
  }

  const icons = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(1);
          }}
          placeholder="جست‌وجوی نام آیکن"
          aria-label="جست‌وجوی آیکن"
          className={`${controlClass} min-w-0 flex-1`}
        />
        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value as IconCategory | "");
            setPage(1);
          }}
          aria-label="پالایش بر اساس دسته"
          className={controlClass}
        >
          <option value="">همه دسته‌ها</option>
          {iconCategoryValues.map((item) => (
            <option key={item} value={item}>
              {iconCategoryLabels[item]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(event) => {
              setIncludeDeleted(event.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 accent-[var(--color-primary)]"
          />
          نمایش حذف‌شده‌ها
        </label>
        <button
          type="button"
          onClick={() => {
            setUploadError(null);
            setUploadOpen(true);
          }}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          بارگذاری آیکن
        </button>
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {actionError}
        </p>
      )}

      {isLoading && (
        <Panel className="p-6 text-center text-sm text-[var(--color-text-muted)]">در حال بارگذاری…</Panel>
      )}
      {isError && (
        <Panel className="p-6 text-center text-sm text-[var(--color-danger)]">کتابخانه آیکن بارگذاری نشد.</Panel>
      )}
      {!isLoading && !isError && icons.length === 0 && (
        <Panel className="p-6 text-center text-sm text-[var(--color-text-muted)]">
          هنوز آیکنی بارگذاری نشده است. با دکمه «بارگذاری آیکن» شروع کنید.
        </Panel>
      )}

      {icons.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {icons.map((icon) => (
            <Panel key={icon.id} className="flex flex-col gap-3 p-3">
              <div className="flex h-24 items-center justify-center rounded-lg bg-[var(--color-bg-sunken)]">
                {/*
                  رندر فقط از راه <img src>: مرورگر فایل را در یک browsing context ایزوله می‌بیند،
                  پس حتی SVGِ دارای script هم اجرا نمی‌شود. هرگز inline نشود (ADR-P14-04).
                */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={icon.contentUrl}
                  alt={icon.name}
                  className="max-h-20 max-w-20 object-contain"
                  loading="lazy"
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--color-text)]" title={icon.name}>
                  {icon.name}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {iconCategoryLabels[icon.category]} · {formatFileSize(icon.fileSize)}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-text-subtle)]">
                  {icon.width && icon.height ? (
                    <span dir="ltr">
                      {icon.width}×{icon.height}
                    </span>
                  ) : (
                    "برداری"
                  )}
                  {" · "}
                  {icon.usageCount.toLocaleString("fa-IR")} استفاده
                </p>
                {icon.deletedAt && (
                  <p className="mt-1 text-xs font-medium text-[var(--color-danger)]">حذف‌شده</p>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 border-t border-[var(--color-panel-border)] pt-2">
                {icon.deletedAt ? (
                  <button
                    type="button"
                    onClick={() => runAction(() => restoreMutation.mutateAsync({ id: icon.id, version: icon.version }))}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)]"
                  >
                    بازگردانی
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        replaceTargetRef.current = icon;
                        replaceInputRef.current?.click();
                      }}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)]"
                    >
                      جایگزینی فایل
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(icon)}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                    >
                      حذف
                    </button>
                  </>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/* یک input مشترک برای جایگزینی، تا هر کارت یک المان پنهان اضافه نکند. */}
      <input
        ref={replaceInputRef}
        type="file"
        accept=".png,.svg,image/png,image/svg+xml"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          const target = replaceTargetRef.current;
          event.target.value = "";
          if (!file || !target) return;
          await runAction(() => replaceMutation.mutateAsync({ id: target.id, file, version: target.version }));
        }}
      />

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between gap-2 text-sm text-[var(--color-text-muted)]">
          <span>
            {data.total.toLocaleString("fa-IR")} آیکن — صفحه {page.toLocaleString("fa-IR")} از{" "}
            {totalPages.toLocaleString("fa-IR")}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              className="rounded-lg border border-[var(--color-panel-border)] px-3 py-1.5 disabled:opacity-40"
            >
              قبلی
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-lg border border-[var(--color-panel-border)] px-3 py-1.5 disabled:opacity-40"
            >
              بعدی
            </button>
          </div>
        </div>
      )}

      <Sheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="بارگذاری آیکن"
        description="فقط PNG و SVG، حداکثر ۲ مگابایت"
      >
        <div className="flex min-w-0 flex-col gap-4">
          {uploadError && (
            <p role="alert" className="rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-xs text-[var(--color-danger)]">
              {uploadError}
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)]" htmlFor="icon-name">
              نام آیکن
            </label>
            <input
              id="icon-name"
              value={uploadName}
              onChange={(event) => setUploadName(event.target.value)}
              className={`${controlClass} mt-1 w-full`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)]" htmlFor="icon-category">
              دسته
            </label>
            <select
              id="icon-category"
              value={uploadCategory}
              onChange={(event) => setUploadCategory(event.target.value as IconCategory)}
              className={`${controlClass} mt-1 w-full`}
            >
              {iconCategoryValues.map((item) => (
                <option key={item} value={item}>
                  {iconCategoryLabels[item]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)]" htmlFor="icon-file">
              فایل
            </label>
            <input
              id="icon-file"
              type="file"
              accept=".png,.svg,image/png,image/svg+xml"
              onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
              className={`${controlClass} mt-1 w-full`}
            />
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              ابعاد PNG باید بین ۱۶ تا ۵۱۲ پیکسل باشد. فایل SVG دارای script، رویداد یا ارجاع بیرونی پذیرفته نمی‌شود.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setUploadOpen(false)}
              className="rounded-lg px-3.5 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
            >
              انصراف
            </button>
            <button
              type="button"
              disabled={!uploadFile || uploadName.trim().length === 0 || uploadMutation.isPending}
              onClick={handleUpload}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {uploadMutation.isPending ? "در حال بارگذاری…" : "بارگذاری"}
            </button>
          </div>
        </div>
      </Sheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف آیکن"
        description={
          deleteTarget
            ? `آیکن «${deleteTarget.name}» حذف نرم می‌شود. ${
                deleteTarget.usageCount > 0
                  ? `${deleteTarget.usageCount.toLocaleString("fa-IR")} موجودیت از آن استفاده می‌کنند و تا زمان بازگردانی به نشانگر پیش‌فرض برمی‌گردند؛ تخصیص‌ها پاک نمی‌شوند.`
                  : "هیچ موجودیتی از آن استفاده نمی‌کند."
              }`
            : ""
        }
        confirmLabel="حذف آیکن"
        destructive
        pending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await runAction(() => deleteMutation.mutateAsync({ id: deleteTarget.id, version: deleteTarget.version }));
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
