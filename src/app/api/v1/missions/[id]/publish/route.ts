import { NextResponse, type NextRequest } from "next/server";
import { requireActor, domainErrorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { publishMission } from "@/server/services/mission-service";
import { DomainError } from "@/lib/errors/domain-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const NOT_FOUND_CODES = new Set(["MISSION_NOT_FOUND"]);
const CONFLICT_CODES = new Set(["MISSION_NOT_DRAFT", "MISSION_VEHICLE_TIME_CONFLICT", "SHIPMENT_ALREADY_ASSIGNED"]);

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const result = await requireActor([RoleCode.ADMIN, RoleCode.MISSION_PLANNER]);
  if ("response" in result) return result.response;

  const { id } = await params;

  try {
    const published = await publishMission(id, result.actor);
    return NextResponse.json(published);
  } catch (error) {
    if (error instanceof DomainError) {
      const status = NOT_FOUND_CODES.has(error.code) ? 404 : CONFLICT_CODES.has(error.code) ? 409 : 422;
      return domainErrorResponse(error, status);
    }
    throw error;
  }
}
