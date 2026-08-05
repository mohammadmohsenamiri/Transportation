import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasAnyRole } from "@/lib/permissions/roles";
import { Panel } from "@/components/ui/panel";
import { MissionsListView } from "@/features/missions/missions-list-view";

export default async function MissionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!hasAnyRole(user.roles, ["ADMIN", "MISSION_PLANNER"])) {
    return (
      <Panel className="p-6 text-center">
        <h1 className="text-base font-bold text-[var(--color-text)]">دسترسی مجاز نیست</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          مدیریت مأموریت‌ها فقط برای نقش‌های برنامه‌ریز مأموریت و مدیر سامانه در دسترس است.
        </p>
      </Panel>
    );
  }

  return <MissionsListView canManage />;
}
