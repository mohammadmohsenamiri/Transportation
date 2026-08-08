import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { assignIcon, type AssignmentTarget } from "@/server/services/icon-service";
import { iconAssignmentSchema } from "@/lib/validation/admin";
import { adminErrorResponse, guardAdminWrite, validationErrorResponse } from "@/lib/http/admin-errors";
import { DomainError } from "@/lib/errors/domain-error";

/**
 * تخصیص آیکن به یک واحد سازمانی، نوع خودرو یا خودرو. `iconAssetId: null` تخصیص را برمی‌دارد.
 *
 * برخلاف بقیه endpointهای این فاز توکن نسخه نمی‌گیرد: سه موجودیت مقصد ستون `version` ندارند و
 * افزودن آن به آن‌ها خارج از دامنه این فاز است. تخصیص یک نوشتن تک‌فیلدی است، کاملاً audit می‌شود
 * و آخرین نوشتن برنده است — این انحراف عمدی از §۴٫۶ سند API است.
 */
export async function PUT(request: NextRequest) {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const limited = guardAdminWrite(result.actor);
  if (limited) return limited;

  const parsed = iconAssignmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error);

  try {
    await assignIcon(
      {
        targetType: parsed.data.targetType as AssignmentTarget,
        targetId: parsed.data.targetId,
        iconAssetId: parsed.data.iconAssetId,
      },
      result.actor,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof DomainError) return adminErrorResponse(error);
    throw error;
  }
}
