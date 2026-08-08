import { NextResponse, type NextRequest } from "next/server";
import { requireActor, errorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { getIconBytes } from "@/server/services/icon-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * تنها مسیر آیکن که برای هر سه نقش باز است — نقشه برای همه کاربران آیکن رسم می‌کند.
 *
 * سربرگ‌ها خط دفاع اصلی در برابر XSS از راه SVG هستند، نه پاک‌سازی محتوا: مرورگر فایل را در یک
 * origin ایزوله و بدون اجازه اجرای script یا بارگیری هیچ منبعی می‌بیند (ADR-P14-04). تحلیل‌گر
 * allowlist در `svg-analyzer.ts` لایه دوم است، نه اول.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const result = await requireActor([RoleCode.ADMIN, RoleCode.MISSION_PLANNER, RoleCode.STATUS_VIEWER]);
  if ("response" in result) return result.response;

  const { id } = await params;
  const icon = await getIconBytes(id);
  if (!icon) return errorResponse("ICON_NOT_FOUND", "آیکن یافت نشد.", 404);

  const etag = `"${icon.sha256}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  return new NextResponse(new Uint8Array(icon.bytes), {
    status: 200,
    headers: {
      "Content-Type": icon.mimeType,
      "Content-Length": String(icon.bytes.length),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "Content-Disposition": "inline",
      // محتوا با هش آدرس‌دهی نمی‌شود ولی ETag همان هش است؛ جایگزینی فایل، ETag را عوض می‌کند.
      "Cache-Control": "private, max-age=31536000, immutable",
      ETag: etag,
    },
  });
}
