import { NextResponse, type NextRequest } from "next/server";
import { requireActor, domainErrorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { listVehicles, createVehicle } from "@/server/services/vehicle-service";
import { vehicleCreateSchema, vehicleReadinessValues } from "@/lib/validation/vehicle";
import { flattenIssues } from "@/lib/validation/utils";
import { DomainError } from "@/lib/errors/domain-error";

export async function GET(request: NextRequest) {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const searchParams = request.nextUrl.searchParams;
  const readinessParam = searchParams.get("readiness");
  const readiness = vehicleReadinessValues.includes(
    readinessParam as (typeof vehicleReadinessValues)[number],
  )
    ? (readinessParam as (typeof vehicleReadinessValues)[number])
    : undefined;

  const items = await listVehicles({
    vehicleTypeId: searchParams.get("vehicleTypeId") ?? undefined,
    readiness,
    q: searchParams.get("q") ?? undefined,
  });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const body = await request.json().catch(() => null);
  const parsed = vehicleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "ورودی نامعتبر است.", fieldErrors: flattenIssues(parsed.error) } },
      { status: 422 },
    );
  }

  try {
    const created = await createVehicle(parsed.data, result.actor);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) {
      return domainErrorResponse(error, 422);
    }
    throw error;
  }
}
