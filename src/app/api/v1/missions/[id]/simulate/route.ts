import { NextResponse, type NextRequest } from "next/server";
import { requireActor, domainErrorResponse, errorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { simulateQuerySchema } from "@/lib/validation/simulation";
import { getMissionSimulation } from "@/server/services/simulation-service";
import { DomainError } from "@/lib/errors/domain-error";

const ALLOWED_ROLES = [RoleCode.ADMIN, RoleCode.MISSION_PLANNER, RoleCode.STATUS_VIEWER];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const result = await requireActor(ALLOWED_ROLES);
  if ("response" in result) return result.response;

  const { id } = await params;

  const rawViewTime = request.nextUrl.searchParams.get("viewTime") ?? undefined;
  const parsed = simulateQuerySchema.safeParse({ viewTime: rawViewTime });
  if (!parsed.success) {
    return errorResponse("SIMULATION_INVALID_VIEW_TIME", "زمان مشاهده نامعتبر است.", 422, {
      viewTime: "زمان مشاهده نامعتبر است.",
    });
  }

  // تنها new Date() بدون آرگومان کل این قابلیت — عمداً همین‌جا، در مرز HTTP، نه داخل موتور pure (06-API.md §2.1)
  const viewTime = parsed.data.viewTime ? new Date(parsed.data.viewTime) : new Date();

  try {
    const simulation = await getMissionSimulation(id, viewTime);
    return NextResponse.json({
      ...simulation,
      estimatedArrivalAt: simulation.estimatedArrivalAt.toISOString(),
      viewTime: viewTime.toISOString(),
    });
  } catch (error) {
    if (error instanceof DomainError) {
      const status = error.code === "MISSION_NOT_FOUND" ? 404 : error.code === "SIMULATION_ROUTE_SNAPSHOT_MISSING" ? 500 : 422;
      return domainErrorResponse(error, status);
    }
    throw error;
  }
}
