import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isAdmin } from "@/lib/permissions/roles";
import { Panel } from "@/components/ui/panel";
import { OrganizationTreeView } from "@/features/organization/organization-tree-view";

export default async function OrganizationPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!isAdmin(user.roles)) {
    return (
      <Panel className="p-6 text-center">
        <h1 className="text-base font-bold text-[var(--color-text)]">دسترسی مجاز نیست</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          مدیریت ساختار سازمانی فقط برای نقش مدیر سامانه در دسترس است.
        </p>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">ساختار سازمانی</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          مدیریت دفاتر کشوری، گروه، توزیع‌کننده و انبارها در نمای درختی
        </p>
      </div>

      <OrganizationTreeView />
    </div>
  );
}
