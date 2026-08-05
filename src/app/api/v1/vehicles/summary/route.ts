import { NextResponse } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { getFleetSummary } from "@/server/services/vehicle-service";

export async function GET() {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const summary = await getFleetSummary();
  return NextResponse.json(summary);
}
