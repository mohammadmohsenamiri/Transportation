import { NextResponse, type NextRequest } from "next/server";
import { requireActor, domainErrorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { listOrganizationUnits, createOrganizationUnit } from "@/server/services/organization-service";
import { organizationUnitCreateSchema, organizationLevelValues } from "@/lib/validation/organization";
import { flattenIssues } from "@/lib/validation/utils";
import { DomainError } from "@/lib/errors/domain-error";

export async function GET(request: NextRequest) {
  const result = await requireActor([RoleCode.ADMIN, RoleCode.MISSION_PLANNER]);
  if ("response" in result) return result.response;

  const searchParams = request.nextUrl.searchParams;
  const levelParam = searchParams.get("level");
  const level = organizationLevelValues.includes(levelParam as (typeof organizationLevelValues)[number])
    ? (levelParam as (typeof organizationLevelValues)[number])
    : undefined;
  const parentId = searchParams.get("parentId") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  const units = await listOrganizationUnits({ level, parentId: parentId || undefined, q });
  return NextResponse.json({ items: units });
}

export async function POST(request: NextRequest) {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const body = await request.json().catch(() => null);
  const parsed = organizationUnitCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "ورودی نامعتبر است.", fieldErrors: flattenIssues(parsed.error) } },
      { status: 422 },
    );
  }

  try {
    const created = await createOrganizationUnit(parsed.data, result.actor);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) {
      return domainErrorResponse(error, 422);
    }
    throw error;
  }
}
