import { NextResponse } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { getActivePublicProvider } from "@/server/services/map-provider-service";

export async function GET() {
  const result = await requireActor([RoleCode.ADMIN, RoleCode.STATUS_VIEWER, RoleCode.MISSION_PLANNER]);
  if ("response" in result) return result.response;

  const provider = await getActivePublicProvider();
  return NextResponse.json({ provider });
}
