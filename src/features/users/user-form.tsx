"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ApiError } from "@/lib/http/api-client-error";
import { userRoleLabels, type UserRoleCode } from "@/features/users/types";

const roleValues: UserRoleCode[] = ["ADMIN", "MISSION_PLANNER", "STATUS_VIEWER"];

/**
 * قواعد اینجا آینه `validateUsername`/`validatePassword` در `src/lib/domain/user-rules.ts` هستند
 * تا کاربر پیش از رفت‌وبرگشت شبکه بازخورد بگیرد. مرجع همچنان سرور است — این لایه فقط راحتی است
 * و هرگز جای اعتبارسنجی سمت سرور را نمی‌گیرد (SEC-01).
 */
const createSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z][a-zA-Z0-9._-]{2,31}$/, "نام کاربری باید با حرف انگلیسی شروع شود و ۳ تا ۳۲ نویسه باشد."),
  displayName: z.string().trim().max(120).optional(),
  password: z.string().min(8, "رمز عبور حداقل ۸ نویسه است.").max(128),
  roles: z.array(z.enum(["ADMIN", "MISSION_PLANNER", "STATUS_VIEWER"])).min(1, "حداقل یک نقش انتخاب کنید."),
});

const editSchema = z.object({
  displayName: z.string().trim().max(120).optional(),
  roles: z.array(z.enum(["ADMIN", "MISSION_PLANNER", "STATUS_VIEWER"])).min(1, "حداقل یک نقش انتخاب کنید."),
});

export type UserCreateFormValues = z.infer<typeof createSchema>;
export type UserEditFormValues = z.infer<typeof editSchema>;

const fieldClass =
  "w-full rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";
const labelClass = "block text-xs font-medium text-[var(--color-text-muted)]";
const errorClass = "mt-1 text-xs text-[var(--color-danger)]";

function RolePicker({
  value,
  onChange,
  error,
}: {
  value: UserRoleCode[];
  onChange: (roles: UserRoleCode[]) => void;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className={labelClass}>نقش‌ها</legend>
      <div className="mt-2 flex flex-col gap-2">
        {roleValues.map((role) => (
          <label key={role} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input
              type="checkbox"
              checked={value.includes(role)}
              onChange={(event) =>
                onChange(event.target.checked ? [...value, role] : value.filter((item) => item !== role))
              }
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            {userRoleLabels[role]}
          </label>
        ))}
      </div>
      {error && <p className={errorClass}>{error}</p>}
    </fieldset>
  );
}

interface CreateProps {
  onSubmit: (values: UserCreateFormValues) => Promise<void>;
  onCancel: () => void;
  pending: boolean;
}

export function UserCreateForm({ onSubmit, onCancel, pending }: CreateProps) {
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserCreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { username: "", displayName: "", password: "", roles: ["STATUS_VIEWER"] },
  });

  const roles = watch("roles");

  async function submit(values: UserCreateFormValues) {
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field === "username" || field === "displayName" || field === "password") {
            setError(field, { message });
          }
        }
        if (Object.keys(error.fieldErrors).length === 0) setError("root", { message: error.message });
      }
    }
  }

  return (
    <form id="user-create-form" onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      {errors.root && (
        <p className="rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-xs text-[var(--color-danger)]">
          {errors.root.message}
        </p>
      )}

      <div>
        <label className={labelClass} htmlFor="user-username">
          نام کاربری
        </label>
        <input id="user-username" dir="ltr" autoComplete="off" className={`${fieldClass} mt-1`} {...register("username")} />
        {errors.username && <p className={errorClass}>{errors.username.message}</p>}
        <p className="mt-1 text-xs text-[var(--color-text-subtle)]">پس از ساخت کاربر قابل تغییر نیست.</p>
      </div>

      <div>
        <label className={labelClass} htmlFor="user-display-name">
          نام نمایشی
        </label>
        <input id="user-display-name" className={`${fieldClass} mt-1`} {...register("displayName")} />
        {errors.displayName && <p className={errorClass}>{errors.displayName.message}</p>}
      </div>

      <div>
        <label className={labelClass} htmlFor="user-password">
          رمز عبور اولیه
        </label>
        <input
          id="user-password"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          className={`${fieldClass} mt-1`}
          {...register("password")}
        />
        {errors.password && <p className={errorClass}>{errors.password.message}</p>}
        <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
          کاربر در نخستین ورود ملزم به تغییر آن است. این رمز در هیچ گزارشی ثبت نمی‌شود.
        </p>
      </div>

      <RolePicker
        value={roles}
        onChange={(next) => setValue("roles", next, { shouldValidate: true })}
        error={errors.roles?.message}
      />

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3.5 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
        >
          انصراف
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "در حال ذخیره…" : "ساخت کاربر"}
        </button>
      </div>
    </form>
  );
}

interface EditProps {
  defaultValues: UserEditFormValues;
  onSubmit: (values: UserEditFormValues) => Promise<void>;
  onCancel: () => void;
  pending: boolean;
}

export function UserEditForm({ defaultValues, onSubmit, onCancel, pending }: EditProps) {
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserEditFormValues>({ resolver: zodResolver(editSchema), defaultValues });

  const roles = watch("roles");

  async function submit(values: UserEditFormValues) {
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError) setError("root", { message: error.message });
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      {errors.root && (
        <p className="rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-xs text-[var(--color-danger)]">
          {errors.root.message}
        </p>
      )}

      <div>
        <label className={labelClass} htmlFor="user-edit-display-name">
          نام نمایشی
        </label>
        <input id="user-edit-display-name" className={`${fieldClass} mt-1`} {...register("displayName")} />
      </div>

      <RolePicker
        value={roles}
        onChange={(next) => setValue("roles", next, { shouldValidate: true })}
        error={errors.roles?.message}
      />

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3.5 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
        >
          انصراف
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "در حال ذخیره…" : "ذخیره تغییرات"}
        </button>
      </div>
    </form>
  );
}
