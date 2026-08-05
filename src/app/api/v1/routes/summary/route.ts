import { NextResponse } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { getRouteSummary } from "@/server/services/route-service";

export async function GET() {
  const result = await requireActor([RoleCode.ADMIN, RoleCode.MISSION_PLANNER, RoleCode.STATUS_VIEWER]);
  if ("response" in result) return result.response;

  return NextResponse.json(await getRouteSummary());
}
