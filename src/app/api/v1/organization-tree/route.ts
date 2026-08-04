import { NextResponse } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { getOrganizationTree } from "@/server/services/organization-service";

export async function GET() {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const units = await getOrganizationTree();
  return NextResponse.json({ items: units });
}
