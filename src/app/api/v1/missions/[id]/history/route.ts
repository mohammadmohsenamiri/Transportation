import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { getMissionHistory } from "@/server/services/mission-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const result = await requireActor([RoleCode.ADMIN, RoleCode.MISSION_PLANNER]);
  if ("response" in result) return result.response;

  const { id } = await params;
  const entries = await getMissionHistory(id);

  return NextResponse.json({
    items: entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      actorUserId: entry.actorUserId,
      beforeJson: entry.beforeJson,
      afterJson: entry.afterJson,
      occurredAt: entry.occurredAt.toISOString(),
    })),
  });
}
