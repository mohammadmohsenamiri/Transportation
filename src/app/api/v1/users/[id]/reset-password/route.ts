import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { resetUserPassword } from "@/server/services/user-service";
import { userResetPasswordSchema } from "@/lib/validation/admin";
import { adminErrorResponse, guardAdminWrite, validationErrorResponse } from "@/lib/http/admin-errors";
import { DomainError } from "@/lib/errors/domain-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * پاسخ عمداً فقط DTO کاربر است و هیچ ماده رمزی برنمی‌گرداند؛ رمز جدید را همان کسی دارد که
 * فرستاده است (BR-P06). خطای اعتبارسنجی رمز هم از مسیر استاندارد ۴۲۲ می‌آید تا پیام آن به کاربر
 * برسد بدون آنکه مقدار رمز جایی ثبت شود.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const limited = guardAdminWrite(result.actor);
  if (limited) return limited;

  const { id } = await params;
  const parsed = userResetPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error);

  try {
    return NextResponse.json(
      await resetUserPassword(id, { version: parsed.data.version, newPassword: parsed.data.newPassword }, result.actor),
    );
  } catch (error) {
    if (error instanceof DomainError) return adminErrorResponse(error);
    throw error;
  }
}
