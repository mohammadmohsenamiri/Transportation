import { NextResponse, type NextRequest } from "next/server";
import { requireActor, domainErrorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { listMissions, createMissionDraft } from "@/server/services/mission-service";
import { missionCreateSchema } from "@/lib/validation/mission";
import { flattenIssues } from "@/lib/validation/utils";
import { DomainError } from "@/lib/errors/domain-error";

const ALLOWED_ROLES = [RoleCode.ADMIN, RoleCode.MISSION_PLANNER];
const PERSISTED_STATUS_VALUES = ["DRAFT", "SCHEDULED", "COMPLETED", "FAILED", "CANCELLED", "ARCHIVED"] as const;

export async function GET(request: NextRequest) {
  const result = await requireActor(ALLOWED_ROLES);
  if ("response" in result) return result.response;

  const searchParams = request.nextUrl.searchParams;
  const statusParam = searchParams.get("persistedStatus");
  const persistedStatus = PERSISTED_STATUS_VALUES.includes(statusParam as (typeof PERSISTED_STATUS_VALUES)[number])
    ? (statusParam as (typeof PERSISTED_STATUS_VALUES)[number])
    : undefined;

  const items = await listMissions({
    q: searchParams.get("q") ?? undefined,
    persistedStatus,
    vehicleId: searchParams.get("vehicleId") ?? undefined,
    originWarehouseId: searchParams.get("originWarehouseId") ?? undefined,
  });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const result = await requireActor(ALLOWED_ROLES);
  if ("response" in result) return result.response;

  const body = await request.json().catch(() => null);
  const parsed = missionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "ورودی نامعتبر است.", fieldErrors: flattenIssues(parsed.error) } },
      { status: 422 },
    );
  }

  try {
    const created = await createMissionDraft(parsed.data, result.actor);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) return domainErrorResponse(error, 422);
    throw error;
  }
}
