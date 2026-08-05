import { NextResponse, type NextRequest } from "next/server";
import { requireActor, errorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { parseRouteCsvPreview } from "@/server/services/route-service";
import { createRoutePreviewToken } from "@/lib/security/route-preview-token";
import { MAX_CSV_FILE_SIZE_BYTES } from "@/lib/domain/route-csv";

const ALLOWED_MIME_TYPES = new Set(["", "text/csv", "application/vnd.ms-excel", "text/plain"]);

export async function POST(request: NextRequest) {
  const result = await requireActor([RoleCode.ADMIN, RoleCode.MISSION_PLANNER]);
  if ("response" in result) return result.response;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return errorResponse("ROUTE_CSV_FILE_REQUIRED", "فایل CSV ارسال نشده است.", 422);
  }

  const nameLower = file.name.toLowerCase();
  if (!nameLower.endsWith(".csv") || !ALLOWED_MIME_TYPES.has(file.type)) {
    return errorResponse("ROUTE_CSV_INVALID_TYPE", "فقط فایل با پسوند CSV مجاز است.", 422);
  }

  if (file.size > MAX_CSV_FILE_SIZE_BYTES) {
    return errorResponse("ROUTE_CSV_TOO_LARGE", "حجم فایل نباید بیش از ۵ مگابایت باشد.", 422);
  }

  const text = await file.text();
  const preview = parseRouteCsvPreview(text, result.actor, createRoutePreviewToken);

  return NextResponse.json(preview);
}
