import { NextResponse, type NextRequest } from "next/server";
import { requireActor, domainErrorResponse, errorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { getMissionById, updateMission, softDeleteDraftMission } from "@/server/services/mission-service";
import { missionUpdateSchema } from "@/lib/validation/mission";
import { flattenIssues } from "@/lib/validation/utils";
import { DomainError } from "@/lib/errors/domain-error";

const ALLOWED_ROLES = [RoleCode.ADMIN, RoleCode.MISSION_PLANNER];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const result = await requireActor(ALLOWED_ROLES);
  if ("response" in result) return result.response;

  const { id } = await params;
  const mission = await getMissionById(id);
  if (!mission) {
    return errorResponse("MISSION_NOT_FOUND", "مأموریت یافت نشد.", 404);
  }
  return NextResponse.json(mission);
}

const NOT_FOUND_CODES = new Set(["MISSION_NOT_FOUND"]);
const CONFLICT_CODES = new Set(["MISSION_ALREADY_STARTED", "MISSION_NOT_EDITABLE", "MISSION_NOT_DRAFT"]);

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const result = await requireActor(ALLOWED_ROLES);
  if ("response" in result) return result.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = missionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "ورودی نامعتبر است.", fieldErrors: flattenIssues(parsed.error) } },
      { status: 422 },
    );
  }

  try {
    const updated = await updateMission(id, parsed.data, result.actor);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof DomainError) {
      const status = NOT_FOUND_CODES.has(error.code) ? 404 : CONFLICT_CODES.has(error.code) ? 409 : 422;
      return domainErrorResponse(error, status);
    }
    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const result = await requireActor(ALLOWED_ROLES);
  if ("response" in result) return result.response;

  const { id } = await params;

  try {
    await softDeleteDraftMission(id, result.actor);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof DomainError) {
      const status = error.code === "MISSION_NOT_FOUND" ? 404 : 409;
      return domainErrorResponse(error, status);
    }
    throw error;
  }
}
