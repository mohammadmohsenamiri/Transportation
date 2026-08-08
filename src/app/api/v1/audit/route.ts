import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { listAuditActions, listAuditEntries } from "@/server/services/audit-query-service";
import { auditQuerySchema } from "@/lib/validation/admin";
import { validationErrorResponse } from "@/lib/http/admin-errors";

/**
 * فقط خواندنی و فقط برای ADMIN. هیچ endpointی برای نوشتن یا حذف رکورد audit وجود ندارد و
 * نباید ساخته شود — سیاهه ممیزی فقط از راه `logAudit` در لایه سرویس رشد می‌کند (SEC-17).
 */
export async function GET(request: NextRequest) {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const params = request.nextUrl.searchParams;
  if (params.get("facets") === "actions") {
    return NextResponse.json({ actions: await listAuditActions() });
  }

  const parsed = auditQuerySchema.safeParse(Object.fromEntries(params.entries()));
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { from, to, ...rest } = parsed.data;
  return NextResponse.json(
    await listAuditEntries({
      ...rest,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    }),
  );
}
