"use client";

import { useActionState } from "react";
import { loginAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {state.error && (
        // role="alert" لازم است تا رد شدن ورود برای کاربر screen reader هم اعلام شود؛ بدون آن
        // تنها بازخورد شکست، یک تغییر بصری بی‌صداست.
        <div
          role="alert"
          className="rounded-xl bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]"
        >
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium text-[var(--color-text)]">
          نام کاربری
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoFocus
          className="rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2.5 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
          aria-invalid={Boolean(state.fieldErrors?.username)}
          aria-describedby={state.fieldErrors?.username ? "username-error" : undefined}
        />
        {state.fieldErrors?.username && (
          <p id="username-error" className="text-xs text-[var(--color-danger)]">
            {state.fieldErrors.username}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-[var(--color-text)]">
          رمز عبور
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2.5 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
        />
        {state.fieldErrors?.password && (
          <p id="password-error" className="text-xs text-[var(--color-danger)]">
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] transition-opacity disabled:opacity-60"
      >
        {isPending ? "در حال ورود..." : "ورود"}
      </button>
    </form>
  );
}
