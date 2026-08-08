"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApiError } from "@/lib/http/api-client-error";
import { formatJalaliDateTime } from "@/lib/dates/display";
import {
  UserCreateForm,
  UserEditForm,
  type UserCreateFormValues,
  type UserEditFormValues,
} from "@/features/users/user-form";
import {
  useCreateUser,
  useDeleteUser,
  useReplaceUserRoles,
  useResetUserPassword,
  useTransitionUser,
  useUpdateUser,
  useUsers,
} from "@/features/users/use-user-queries";
import {
  userRoleLabels,
  userStatusLabels,
  type AdminUser,
  type UserRoleCode,
  type UserStatus,
} from "@/features/users/types";

type SheetState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; user: AdminUser }
  | { mode: "reset-password"; user: AdminUser }
  | { mode: "suspend"; user: AdminUser };

const statusFilters: { value: UserStatus | ""; label: string }[] = [
  { value: "", label: "همه وضعیت‌ها" },
  { value: "ACTIVE", label: "فعال" },
  { value: "INACTIVE", label: "غیرفعال" },
  { value: "SUSPENDED", label: "معلق" },
  { value: "DELETED", label: "حذف‌شده" },
];

const roleFilters: { value: UserRoleCode | ""; label: string }[] = [
  { value: "", label: "همه نقش‌ها" },
  { value: "ADMIN", label: userRoleLabels.ADMIN },
  { value: "MISSION_PLANNER", label: userRoleLabels.MISSION_PLANNER },
  { value: "STATUS_VIEWER", label: userRoleLabels.STATUS_VIEWER },
];

const controlClass =
  "rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";

export function UserList() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<UserRoleCode | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [page, setPage] = useState(1);
  const [sheet, setSheet] = useState<SheetState>({ mode: "closed" });
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  // وضعیت DELETED فقط زمانی معنا دارد که رکوردهای حذف‌شده هم واکشی شوند.
  const includeDeleted = status === "DELETED" || status === "";

  const { data, isLoading, isError } = useUsers({ q, role, status, includeDeleted, page });

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const rolesMutation = useReplaceUserRoles();
  const transitionMutation = useTransitionUser();
  const deleteMutation = useDeleteUser();
  const resetMutation = useResetUserPassword();

  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    rolesMutation.isPending ||
    transitionMutation.isPending ||
    deleteMutation.isPending ||
    resetMutation.isPending;

  /** خطای سرور به‌جای پرتاب، بالای جدول نشان داده می‌شود — «آخرین مدیر» رایج‌ترین موردش است. */
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

  async function handleCreate(values: UserCreateFormValues) {
    await createMutation.mutateAsync({
      username: values.username,
      displayName: values.displayName?.trim() ? values.displayName.trim() : null,
      password: values.password,
      roles: values.roles,
    });
    setSheet({ mode: "closed" });
  }

  async function handleEdit(user: AdminUser, values: UserEditFormValues) {
    const displayName = values.displayName?.trim() ? values.displayName.trim() : null;
    const updated = await updateMutation.mutateAsync({ id: user.id, version: user.version, displayName });

    const sameRoles =
      updated.roles.length === values.roles.length && values.roles.every((item) => updated.roles.includes(item));
    if (!sameRoles) {
      await rolesMutation.mutateAsync({ id: user.id, version: updated.version, roles: values.roles });
    }
    setSheet({ mode: "closed" });
  }

  const users = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    // `min-w-0` لازم است: مقدار پیش‌فرض `min-width: auto` روی آیتم flex اجازه می‌دهد جدول عریض
    // ظرف خودش را کش بیاورد و اسکرول افقی به کل صفحه سرریز کند، به‌جای اینکه داخل ظرف بماند.
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(1);
          }}
          placeholder="جست‌وجوی نام کاربری یا نام نمایشی"
          aria-label="جست‌وجوی کاربر"
          className={`${controlClass} min-w-0 flex-1`}
        />
        <select
          value={role}
          onChange={(event) => {
            setRole(event.target.value as UserRoleCode | "");
            setPage(1);
          }}
          aria-label="پالایش بر اساس نقش"
          className={controlClass}
        >
          {roleFilters.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as UserStatus | "");
            setPage(1);
          }}
          aria-label="پالایش بر اساس وضعیت"
          className={controlClass}
        >
          {statusFilters.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSheet({ mode: "create" })}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          کاربر جدید
        </button>
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {actionError}
        </p>
      )}

      <Panel className="min-w-0 overflow-hidden">
        {isLoading && <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">در حال بارگذاری…</p>}
        {isError && (
          <p className="p-6 text-center text-sm text-[var(--color-danger)]">فهرست کاربران بارگذاری نشد.</p>
        )}
        {!isLoading && !isError && users.length === 0 && (
          <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">کاربری با این شرایط یافت نشد.</p>
        )}

        {users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-start text-sm">
              <thead className="bg-[var(--color-bg-sunken)] text-xs text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">نام کاربری</th>
                  <th className="px-4 py-3 text-start font-medium">نام نمایشی</th>
                  <th className="px-4 py-3 text-start font-medium">نقش‌ها</th>
                  <th className="px-4 py-3 text-start font-medium">وضعیت</th>
                  <th className="px-4 py-3 text-start font-medium">آخرین ورود</th>
                  <th className="px-4 py-3 text-start font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-[var(--color-panel-border)]">
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]" dir="ltr">
                      {user.username}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{user.displayName ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">
                      {user.roles.map((item) => userRoleLabels[item]).join("، ")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge {...userStatusLabels[user.status]} />
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">
                      {user.lastLoginAt ? formatJalaliDateTime(user.lastLoginAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {user.status !== "DELETED" && (
                          <>
                            <RowAction label="ویرایش" onClick={() => setSheet({ mode: "edit", user })} />
                            <RowAction
                              label="بازنشانی رمز"
                              onClick={() => {
                                setNewPassword("");
                                setSheet({ mode: "reset-password", user });
                              }}
                            />
                            {user.status === "SUSPENDED" ? (
                              <RowAction
                                label="رفع تعلیق"
                                onClick={() =>
                                  runAction(() =>
                                    transitionMutation.mutateAsync({
                                      id: user.id,
                                      transition: "unsuspend",
                                      version: user.version,
                                    }),
                                  )
                                }
                              />
                            ) : (
                              <RowAction
                                label="تعلیق"
                                onClick={() => {
                                  setSuspendReason("");
                                  setSheet({ mode: "suspend", user });
                                }}
                              />
                            )}
                            <RowAction
                              label={user.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
                              onClick={() =>
                                runAction(() =>
                                  transitionMutation.mutateAsync({
                                    id: user.id,
                                    transition: user.isActive ? "deactivate" : "activate",
                                    version: user.version,
                                  }),
                                )
                              }
                            />
                            <RowAction label="حذف" destructive onClick={() => setDeleteTarget(user)} />
                          </>
                        )}
                        {user.status === "DELETED" && (
                          <RowAction
                            label="بازگردانی"
                            onClick={() =>
                              runAction(() =>
                                transitionMutation.mutateAsync({
                                  id: user.id,
                                  transition: "restore",
                                  version: user.version,
                                }),
                              )
                            }
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between gap-2 text-sm text-[var(--color-text-muted)]">
          <span>
            {data.total.toLocaleString("fa-IR")} کاربر — صفحه {page.toLocaleString("fa-IR")} از{" "}
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
        open={sheet.mode === "create"}
        onClose={() => setSheet({ mode: "closed" })}
        title="کاربر جدید"
        description="نام کاربری پس از ساخت قابل تغییر نیست."
      >
        <UserCreateForm
          onSubmit={handleCreate}
          onCancel={() => setSheet({ mode: "closed" })}
          pending={createMutation.isPending}
        />
      </Sheet>

      <Sheet
        open={sheet.mode === "edit"}
        onClose={() => setSheet({ mode: "closed" })}
        title="ویرایش کاربر"
        description={sheet.mode === "edit" ? sheet.user.username : undefined}
      >
        {sheet.mode === "edit" && (
          <UserEditForm
            defaultValues={{ displayName: sheet.user.displayName ?? "", roles: sheet.user.roles }}
            onSubmit={(values) => handleEdit(sheet.user, values)}
            onCancel={() => setSheet({ mode: "closed" })}
            pending={updateMutation.isPending || rolesMutation.isPending}
          />
        )}
      </Sheet>

      <Sheet
        open={sheet.mode === "reset-password"}
        onClose={() => setSheet({ mode: "closed" })}
        title="بازنشانی رمز عبور"
        description={sheet.mode === "reset-password" ? sheet.user.username : undefined}
      >
        {sheet.mode === "reset-password" && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)]" htmlFor="reset-password">
                رمز عبور جدید
              </label>
              <input
                id="reset-password"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className={`${controlClass} mt-1 w-full`}
              />
              <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                همه نشست‌های فعال این کاربر بسته می‌شوند و در ورود بعدی باید رمز را تغییر دهد. این رمز در هیچ گزارشی ثبت
                نمی‌شود.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSheet({ mode: "closed" })}
                className="rounded-lg px-3.5 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={pending || newPassword.length < 8}
                onClick={async () => {
                  const user = sheet.user;
                  const ok = await runAction(() =>
                    resetMutation.mutateAsync({ id: user.id, version: user.version, newPassword }),
                  );
                  setNewPassword("");
                  if (ok) setSheet({ mode: "closed" });
                }}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                بازنشانی رمز
              </button>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet
        open={sheet.mode === "suspend"}
        onClose={() => setSheet({ mode: "closed" })}
        title="تعلیق کاربر"
        description={sheet.mode === "suspend" ? sheet.user.username : undefined}
      >
        {sheet.mode === "suspend" && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)]" htmlFor="suspend-reason">
                دلیل تعلیق
              </label>
              <textarea
                id="suspend-reason"
                rows={3}
                value={suspendReason}
                onChange={(event) => setSuspendReason(event.target.value)}
                className={`${controlClass} mt-1 w-full`}
              />
              <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                دلیل در سیاهه ممیزی ثبت می‌شود و کاربر معلق تا رفع تعلیق نمی‌تواند وارد شود.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSheet({ mode: "closed" })}
                className="rounded-lg px-3.5 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={pending || suspendReason.trim().length < 3}
                onClick={async () => {
                  const user = sheet.user;
                  const ok = await runAction(() =>
                    transitionMutation.mutateAsync({
                      id: user.id,
                      transition: "suspend",
                      version: user.version,
                      reason: suspendReason.trim(),
                    }),
                  );
                  if (ok) setSheet({ mode: "closed" });
                }}
                className="rounded-lg bg-[var(--color-warning)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                تعلیق کاربر
              </button>
            </div>
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف کاربر"
        description={
          deleteTarget
            ? `کاربر «${deleteTarget.username}» حذف نرم می‌شود: امکان ورود از او گرفته می‌شود ولی سوابق و سیاهه ممیزی او باقی می‌ماند و بعداً قابل بازگردانی است.`
            : ""
        }
        confirmLabel="حذف کاربر"
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

function RowAction({
  label,
  onClick,
  destructive = false,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        destructive
          ? "rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
          : "rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)]"
      }
    >
      {label}
    </button>
  );
}
