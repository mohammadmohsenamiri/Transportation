import { NextResponse, type NextRequest } from "next/server";
import { requireActor, domainErrorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { listCargoTypes, createCargoType } from "@/server/services/cargo-type-service";
import { cargoTypeCreateSchema } from "@/lib/validation/vehicle";
import { flattenIssues } from "@/lib/validation/utils";
import { DomainError } from "@/lib/errors/domain-error";

export async function GET(request: NextRequest) {
  const result = await requireActor([RoleCode.ADMIN, RoleCode.MISSION_PLANNER]);
  if ("response" in result) return result.response;

  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const items = await listCargoTypes({ q });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const body = await request.json().catch(() => null);
  const parsed = cargoTypeCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "ورودی نامعتبر است.", fieldErrors: flattenIssues(parsed.error) } },
      { status: 422 },
    );
  }

  try {
    const created = await createCargoType(parsed.data, result.actor);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) {
      return domainErrorResponse(error, 422);
    }
    throw error;
  }
}
