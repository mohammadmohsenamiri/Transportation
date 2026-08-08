import { NextResponse, type NextRequest } from "next/server";
import { requireActor, errorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { getUserById, transitionUser, updateUser } from "@/server/services/user-service";
import { userUpdateSchema, userVersionSchema } from "@/lib/validation/admin";
import { adminErrorResponse, guardAdminWrite, validationErrorResponse } from "@/lib/http/admin-errors";
import { DomainError } from "@/lib/errors/domain-error";

const ADMIN_ONLY = [RoleCode.ADMIN];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const result = await requireActor(ADMIN_ONLY);
  if ("response" in result) return result.response;

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) return errorResponse("USER_NOT_FOUND", "کاربر یافت نشد.", 404);
  return NextResponse.json(user);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const result = await requireActor(ADMIN_ONLY);
  if ("response" in result) return result.response;

  const limited = guardAdminWrite(result.actor);
  if (limited) return limited;

  const { id } = await params;
  const parsed = userUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error);

  try {
    return NextResponse.json(
      await updateUser(id, { version: parsed.data.version, displayName: parsed.data.displayName ?? null }, result.actor),
    );
  } catch (error) {
    if (error instanceof DomainError) return adminErrorResponse(error);
    throw error;
  }
}

/** حذف نرم — رکورد و کل تاریخچه‌اش باقی می‌مانند (ADR-P14-05). */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const result = await requireActor(ADMIN_ONLY);
  if ("response" in result) return result.response;

  const limited = guardAdminWrite(result.actor);
  if (limited) return limited;

  const { id } = await params;
  const parsed = userVersionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error);

  try {
    return NextResponse.json(await transitionUser(id, "delete", { version: parsed.data.version }, result.actor));
  } catch (error) {
    if (error instanceof DomainError) return adminErrorResponse(error);
    throw error;
  }
}
