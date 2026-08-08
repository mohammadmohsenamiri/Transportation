import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { replaceIconFile } from "@/server/services/icon-service";
import { adminErrorResponse, guardAdminWrite } from "@/lib/http/admin-errors";
import { DomainError } from "@/lib/errors/domain-error";
import { readIconMultipart } from "@/lib/http/icon-multipart";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * جایگزینی بایت‌های یک آیکن موجود. شناسه، نام، دسته و همه تخصیص‌ها دست‌نخورده می‌مانند؛
 * چون sha256 عوض می‌شود، ETag هم عوض می‌شود و کش مرورگر خودبه‌خود باطل می‌گردد.
 * توکن نسخه در فیلد متنی `version` فرم می‌آید — بدنه multipart جایی برای JSON ندارد.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const limited = guardAdminWrite(result.actor);
  if (limited) return limited;

  const { id } = await params;

  try {
    const form = await readIconMultipart(request);

    const version = Number(form.fields.version);
    if (!Number.isInteger(version) || version < 0) {
      throw new DomainError("ICON_VERSION_REQUIRED", "توکن نسخه ارسال نشده یا نامعتبر است.");
    }

    return NextResponse.json(
      await replaceIconFile(
        id,
        {
          filename: form.filename,
          declaredMimeType: form.declaredMimeType,
          size: form.size,
          bytes: form.bytes,
          version,
        },
        result.actor,
      ),
    );
  } catch (error) {
    if (error instanceof DomainError) return adminErrorResponse(error);
    throw error;
  }
}
