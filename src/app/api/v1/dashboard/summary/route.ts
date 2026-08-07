import { NextResponse, type NextRequest } from "next/server";
import { requireActor, errorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { dashboardSummaryQuerySchema } from "@/lib/validation/dashboard";
import { getDashboardSummary } from "@/server/services/dashboard-service";

/**
 * فرانمای وضعیت برای هر سه نقش احرازهویت‌شده باز است — طبق `PROJECT_SPEC.md` §۴ («مشاهده داشبورد
 * و نقشه» برای هر سه نقش). این عمداً با endpointهای summary قدیمی‌تر (مأموریت، ناوگان، مرسوله)
 * فرق دارد که هرکدام برای صفحه مدیریتی خودشان محدودتر گیت شده‌اند و دست‌نخورده باقی می‌مانند.
 */
const ALLOWED_ROLES = [RoleCode.ADMIN, RoleCode.MISSION_PLANNER, RoleCode.STATUS_VIEWER];

export async function GET(request: NextRequest) {
  const result = await requireActor(ALLOWED_ROLES);
  if ("response" in result) return result.response;

  const parsed = dashboardSummaryQuerySchema.safeParse({
    viewTime: request.nextUrl.searchParams.get("viewTime") ?? undefined,
    range: request.nextUrl.searchParams.get("range") ?? undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "viewTime") fieldErrors.viewTime = "زمان مشاهده نامعتبر است.";
      if (field === "range") fieldErrors.range = "بازه زمانی نامعتبر است.";
    }
    return errorResponse("DASHBOARD_INVALID_QUERY", "پارامترهای فرانمای وضعیت نامعتبر است.", 422, fieldErrors);
  }

  const viewTime = parsed.data.viewTime ? new Date(parsed.data.viewTime) : new Date();
  const summary = await getDashboardSummary({ viewTime, range: parsed.data.range });

  return NextResponse.json(summary);
}
