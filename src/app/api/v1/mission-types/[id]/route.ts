import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { deleteMissionType, updateMissionType } from "@/server/services/mission-type-service";
import { missionTypeUpdateSchema } from "@/lib/validation/mission-lifecycle";
import { missionLifecycleErrorResponse, missionValidationErrorResponse } from "@/lib/http/mission-errors";
import { DomainError } from "@/lib/errors/domain-error";

const ADMIN_ONLY = [RoleCode.ADMIN];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const result = await requireActor(ADMIN_ONLY);
  if ("response" in result) return result.response;

  const { id } = await params;
  const parsed = missionTypeUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return missionValidationErrorResponse(parsed.error);

  try {
    return NextResponse.json(await updateMissionType(id, parsed.data, result.actor));
  } catch (error) {
    if (error instanceof DomainError) return missionLifecycleErrorResponse(error);
    throw error;
  }
}

/** حذف نرم؛ نوعی که مأموریتی از آن استفاده می‌کند ۴۰۹ می‌گیرد. */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const result = await requireActor(ADMIN_ONLY);
  if ("response" in result) return result.response;

  const { id } = await params;

  try {
    await deleteMissionType(id, result.actor);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof DomainError) return missionLifecycleErrorResponse(error);
    throw error;
  }
}
