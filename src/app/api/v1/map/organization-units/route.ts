import { NextResponse } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { listOrganizationUnitsForMap } from "@/server/services/organization-service";

export async function GET() {
  const result = await requireActor([RoleCode.ADMIN, RoleCode.STATUS_VIEWER, RoleCode.MISSION_PLANNER]);
  if ("response" in result) return result.response;

  const items = await listOrganizationUnitsForMap();
  return NextResponse.json({ items });
}
