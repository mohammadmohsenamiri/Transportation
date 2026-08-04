import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Icon } from "@/components/ui/icons";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-panel)]">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-bg)] text-[var(--color-primary)]">
            <Icon name="logo" className="h-7 w-7" />
          </span>
          <h1 className="text-lg font-bold text-[var(--color-text)]">تغییر رمز عبور</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {user.mustChangePassword
              ? "برای ادامه، ابتدا باید رمز عبور موقت خود را تغییر دهید."
              : "رمز عبور جدید را وارد کنید."}
          </p>
        </div>

        <ChangePasswordForm />
      </div>
    </div>
  );
}
