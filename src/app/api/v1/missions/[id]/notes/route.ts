import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { addMissionNote, listMissionNotes } from "@/server/services/mission-note-service";
import { addMissionNoteSchema } from "@/lib/validation/mission-lifecycle";
import { missionLifecycleErrorResponse, missionValidationErrorResponse } from "@/lib/http/mission-errors";
import { DomainError } from "@/lib/errors/domain-error";

const NOTE_ROLES = [RoleCode.ADMIN, RoleCode.MISSION_PLANNER];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const result = await requireActor(NOTE_ROLES);
  if ("response" in result) return result.response;

  const { id } = await params;
  return NextResponse.json({ items: await listMissionNotes(id, result.actor) });
}

/** CC-04 — یادداشت توکن نسخه نمی‌گیرد و `Mission.version` را جابه‌جا نمی‌کند. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const result = await requireActor(NOTE_ROLES);
  if ("response" in result) return result.response;

  const { id } = await params;
  const parsed = addMissionNoteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return missionValidationErrorResponse(parsed.error);

  try {
    return NextResponse.json(await addMissionNote(id, parsed.data.body, result.actor), { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) return missionLifecycleErrorResponse(error);
    throw error;
  }
}
