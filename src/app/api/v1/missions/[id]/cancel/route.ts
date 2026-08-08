import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { cancelMission } from "@/server/services/mission-service";
import { missionCancelSchema } from "@/lib/validation/mission";
import { missionLifecycleErrorResponse, missionValidationErrorResponse } from "@/lib/http/mission-errors";
import { DomainError } from "@/lib/errors/domain-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const result = await requireActor([RoleCode.ADMIN, RoleCode.MISSION_PLANNER]);
  if ("response" in result) return result.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = missionCancelSchema.safeParse(body);
  if (!parsed.success) return missionValidationErrorResponse(parsed.error);

  try {
    const cancelled = await cancelMission(id, parsed.data.cancellationReason, parsed.data.version, result.actor);
    return NextResponse.json(cancelled);
  } catch (error) {
    if (error instanceof DomainError) return missionLifecycleErrorResponse(error);
    throw error;
  }
}
