import { getCurrentUser } from "@/lib/auth/current-user";
import { hasAnyRole } from "@/lib/permissions/roles";
import { MapView } from "@/features/map/map-view";

export default async function MapPage() {
  const user = await getCurrentUser();
  const canCreateMission = !!user && hasAnyRole(user.roles, ["ADMIN", "MISSION_PLANNER"]);

  return <MapView canCreateMission={canCreateMission} />;
}
