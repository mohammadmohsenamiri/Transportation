import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Icon } from "@/components/ui/icons";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.mustChangePassword ? "/change-password" : "/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-panel)]">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-bg)] text-[var(--color-primary)]">
            <Icon name="logo" className="h-7 w-7" />
          </span>
          <h1 className="text-lg font-bold text-[var(--color-text)]">آرمان حمل</h1>
          <p className="text-sm text-[var(--color-text-muted)]">ورود به سامانه مدیریت حمل‌ونقل</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
