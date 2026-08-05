import { NextResponse, type NextRequest } from "next/server";
import { requireActor, errorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { exportRouteCsv } from "@/server/services/route-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const result = await requireActor([RoleCode.ADMIN, RoleCode.MISSION_PLANNER, RoleCode.STATUS_VIEWER]);
  if ("response" in result) return result.response;

  const { id } = await params;
  const exported = await exportRouteCsv(id);
  if (!exported) {
    return errorResponse("ROUTE_NOT_FOUND", "مسیر یافت نشد.", 404);
  }

  return new NextResponse(exported.content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exported.filename}"`,
    },
  });
}
