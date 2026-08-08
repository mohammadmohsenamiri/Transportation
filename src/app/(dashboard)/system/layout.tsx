import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isAdmin } from "@/lib/permissions/roles";
import { Panel } from "@/components/ui/panel";
import { SystemTabs } from "@/components/layout/system-tabs";

export default async function SystemLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!isAdmin(user.roles)) {
    return (
      <Panel className="p-6 text-center">
        <h1 className="text-base font-bold text-[var(--color-text)]">دسترسی مجاز نیست</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          تنظیمات سامانه فقط برای نقش مدیر سامانه در دسترس است.
        </p>
      </Panel>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">تنظیمات سامانه</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">مدیریت داده‌های مرجع و پیکربندی سامانه</p>
      </div>
      <SystemTabs />
      {children}
    </div>
  );
}
