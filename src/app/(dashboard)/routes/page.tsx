import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasAnyRole } from "@/lib/permissions/roles";
import { RoutesListView } from "@/features/routes/routes-list-view";

export default async function RoutesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const canManage = hasAnyRole(user.roles, ["ADMIN", "MISSION_PLANNER"]);
  return <RoutesListView canManage={canManage} />;
}
