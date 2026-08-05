import { NextResponse, type NextRequest } from "next/server";
import { requireActor, domainErrorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { cancelMission } from "@/server/services/mission-service";
import { missionCancelSchema } from "@/lib/validation/mission";
import { flattenIssues } from "@/lib/validation/utils";
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
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "ورودی نامعتبر است.", fieldErrors: flattenIssues(parsed.error) } },
      { status: 422 },
    );
  }

  try {
    const cancelled = await cancelMission(id, parsed.data.cancellationReason, result.actor);
    return NextResponse.json(cancelled);
  } catch (error) {
    if (error instanceof DomainError) {
      const status = error.code === "MISSION_NOT_FOUND" ? 404 : error.code === "MISSION_NOT_CANCELLABLE" ? 409 : 422;
      return domainErrorResponse(error, status);
    }
    throw error;
  }
}
