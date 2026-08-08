import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { replaceUserRoles } from "@/server/services/user-service";
import { userRolesSchema } from "@/lib/validation/admin";
import { adminErrorResponse, guardAdminWrite, validationErrorResponse } from "@/lib/http/admin-errors";
import { DomainError } from "@/lib/errors/domain-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** جایگزینی کامل مجموعه نقش‌ها — نه افزودن/کاستن تدریجی (ADR-P14-03). */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const limited = guardAdminWrite(result.actor);
  if (limited) return limited;

  const { id } = await params;
  const parsed = userRolesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error);

  try {
    return NextResponse.json(
      await replaceUserRoles(
        id,
        { version: parsed.data.version, roles: parsed.data.roles as RoleCode[] },
        result.actor,
      ),
    );
  } catch (error) {
    if (error instanceof DomainError) return adminErrorResponse(error);
    throw error;
  }
}
