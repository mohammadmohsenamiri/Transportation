import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { createMissionType, listMissionTypes } from "@/server/services/mission-type-service";
import { missionTypeCreateSchema } from "@/lib/validation/mission-lifecycle";
import { missionLifecycleErrorResponse, missionValidationErrorResponse } from "@/lib/http/mission-errors";
import { DomainError } from "@/lib/errors/domain-error";

/** خواندن برای برنامه‌ریز هم باز است چون ویزارد ساخت مأموریت به آن نیاز دارد؛ *مدیریت* فقط مدیر. */
export async function GET(request: NextRequest) {
  const result = await requireActor([RoleCode.ADMIN, RoleCode.MISSION_PLANNER]);
  if ("response" in result) return result.response;

  const params = request.nextUrl.searchParams;
  return NextResponse.json({
    items: await listMissionTypes({
      q: params.get("q") ?? undefined,
      activeOnly: params.get("activeOnly") === "true",
    }),
  });
}

export async function POST(request: NextRequest) {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const parsed = missionTypeCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return missionValidationErrorResponse(parsed.error);

  try {
    return NextResponse.json(await createMissionType(parsed.data, result.actor), { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) return missionLifecycleErrorResponse(error);
    throw error;
  }
}
