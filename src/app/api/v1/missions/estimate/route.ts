import { NextResponse, type NextRequest } from "next/server";
import { requireActor, domainErrorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { estimateMissionPreview } from "@/server/services/mission-service";
import { missionEstimateSchema } from "@/lib/validation/mission";
import { flattenIssues } from "@/lib/validation/utils";
import { DomainError } from "@/lib/errors/domain-error";

export async function POST(request: NextRequest) {
  const result = await requireActor([RoleCode.ADMIN, RoleCode.MISSION_PLANNER]);
  if ("response" in result) return result.response;

  const body = await request.json().catch(() => null);
  const parsed = missionEstimateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "ورودی نامعتبر است.", fieldErrors: flattenIssues(parsed.error) } },
      { status: 422 },
    );
  }

  try {
    const estimate = await estimateMissionPreview(parsed.data);
    return NextResponse.json(estimate);
  } catch (error) {
    if (error instanceof DomainError) return domainErrorResponse(error, 422);
    throw error;
  }
}
