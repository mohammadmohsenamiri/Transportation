import { NextResponse, type NextRequest } from "next/server";
import { requireActor, domainErrorResponse, errorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { routeImportConfirmSchema } from "@/lib/validation/route";
import { flattenIssues } from "@/lib/validation/utils";
import { verifyRoutePreviewToken } from "@/lib/security/route-preview-token";
import { confirmRouteCsvImport } from "@/server/services/route-service";
import { DomainError } from "@/lib/errors/domain-error";

const TOKEN_ERROR_MESSAGES: Record<string, string> = {
  MALFORMED: "توکن پیش‌نمایش نامعتبر است.",
  SIGNATURE: "توکن پیش‌نمایش نامعتبر است.",
  EXPIRED: "زمان پیش‌نمایش منقضی شده است؛ فایل را دوباره بارگذاری کنید.",
  ACTOR_MISMATCH: "این پیش‌نمایش متعلق به کاربر دیگری است.",
  POINTS_MISMATCH: "نقاط ارسالی با پیش‌نمایش تأییدشده مطابقت ندارد؛ فایل را دوباره بارگذاری کنید.",
};

export async function POST(request: NextRequest) {
  const result = await requireActor([RoleCode.ADMIN, RoleCode.MISSION_PLANNER]);
  if ("response" in result) return result.response;

  const body = await request.json().catch(() => null);
  const parsed = routeImportConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "ورودی نامعتبر است.", fieldErrors: flattenIssues(parsed.error) } },
      { status: 422 },
    );
  }

  const tokenCheck = verifyRoutePreviewToken(parsed.data.previewToken, result.actor.userId, parsed.data.points);
  if (!tokenCheck.valid) {
    return errorResponse("ROUTE_IMPORT_TOKEN_INVALID", TOKEN_ERROR_MESSAGES[tokenCheck.reason ?? "MALFORMED"], 422);
  }

  try {
    const created = await confirmRouteCsvImport(
      {
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        points: parsed.data.points,
      },
      result.actor,
    );
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) return domainErrorResponse(error, 422);
    throw error;
  }
}
