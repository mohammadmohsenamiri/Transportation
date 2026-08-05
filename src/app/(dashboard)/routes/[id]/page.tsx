import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasAnyRole } from "@/lib/permissions/roles";
import { RouteDetailView } from "@/features/routes/route-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RouteDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const canManage = hasAnyRole(user.roles, ["ADMIN", "MISSION_PLANNER"]);
  return <RouteDetailView routeId={id} canManage={canManage} />;
}
