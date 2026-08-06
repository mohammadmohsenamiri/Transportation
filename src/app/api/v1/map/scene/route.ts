import { NextResponse, type NextRequest } from "next/server";
import { requireActor, errorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { simulateQuerySchema } from "@/lib/validation/simulation";
import { getMapScene } from "@/server/services/map-scene-service";

const ALLOWED_ROLES = [RoleCode.ADMIN, RoleCode.MISSION_PLANNER, RoleCode.STATUS_VIEWER];

export async function GET(request: NextRequest) {
  const result = await requireActor(ALLOWED_ROLES);
  if ("response" in result) return result.response;

  const rawViewTime = request.nextUrl.searchParams.get("viewTime") ?? undefined;
  const parsed = simulateQuerySchema.safeParse({ viewTime: rawViewTime });
  if (!parsed.success) {
    return errorResponse("SIMULATION_INVALID_VIEW_TIME", "زمان مشاهده نامعتبر است.", 422, {
      viewTime: "زمان مشاهده نامعتبر است.",
    });
  }

  const viewTime = parsed.data.viewTime ? new Date(parsed.data.viewTime) : new Date();
  const missions = await getMapScene(viewTime);

  return NextResponse.json({ viewTime: viewTime.toISOString(), missions });
}
