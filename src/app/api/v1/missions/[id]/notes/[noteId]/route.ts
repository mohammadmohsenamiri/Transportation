import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { deleteMissionNote } from "@/server/services/mission-note-service";
import { missionLifecycleErrorResponse } from "@/lib/http/mission-errors";
import { DomainError } from "@/lib/errors/domain-error";

interface RouteParams {
  params: Promise<{ id: string; noteId: string }>;
}

/** حذف نرم؛ بررسی «نویسنده یا مدیر» در لایه سرویس انجام می‌شود، نه اینجا. */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const result = await requireActor([RoleCode.ADMIN, RoleCode.MISSION_PLANNER]);
  if ("response" in result) return result.response;

  const { id, noteId } = await params;

  try {
    await deleteMissionNote(id, noteId, result.actor);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof DomainError) {
      return error.code === "FORBIDDEN"
        ? NextResponse.json({ error: { code: error.code, message: error.message, fieldErrors: {} } }, { status: 403 })
        : missionLifecycleErrorResponse(error);
    }
    throw error;
  }
}
