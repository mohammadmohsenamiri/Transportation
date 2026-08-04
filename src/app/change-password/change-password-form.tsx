"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordActionState } from "./actions";

const initialState: ChangePasswordActionState = {};

const fields = [
  { name: "currentPassword", label: "رمز عبور فعلی", autoComplete: "current-password" },
  { name: "newPassword", label: "رمز عبور جدید", autoComplete: "new-password" },
  { name: "confirmPassword", label: "تکرار رمز عبور جدید", autoComplete: "new-password" },
] as const;

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {state.error && (
        <div className="rounded-xl bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {state.error}
        </div>
      )}

      {fields.map((field) => (
        <div key={field.name} className="flex flex-col gap-1.5">
          <label htmlFor={field.name} className="text-sm font-medium text-[var(--color-text)]">
            {field.label}
          </label>
          <input
            id={field.name}
            name={field.name}
            type="password"
            autoComplete={field.autoComplete}
            className="rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2.5 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
            aria-invalid={Boolean(state.fieldErrors?.[field.name])}
            aria-describedby={state.fieldErrors?.[field.name] ? `${field.name}-error` : undefined}
          />
          {state.fieldErrors?.[field.name] && (
            <p id={`${field.name}-error`} className="text-xs text-[var(--color-danger)]">
              {state.fieldErrors[field.name]}
            </p>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] transition-opacity disabled:opacity-60"
      >
        {isPending ? "در حال ذخیره..." : "تغییر رمز عبور"}
      </button>
    </form>
  );
}
