import { NextResponse, type NextRequest } from "next/server";
import { requireActor, domainErrorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { listShipments, createShipment } from "@/server/services/shipment-service";
import { shipmentCreateSchema, shipmentStatusValues } from "@/lib/validation/shipment";
import { flattenIssues } from "@/lib/validation/utils";
import { DomainError } from "@/lib/errors/domain-error";

const ALLOWED_ROLES = [RoleCode.ADMIN, RoleCode.MISSION_PLANNER];

export async function GET(request: NextRequest) {
  const result = await requireActor(ALLOWED_ROLES);
  if ("response" in result) return result.response;

  const searchParams = request.nextUrl.searchParams;
  const statusParam = searchParams.get("status");
  const status = shipmentStatusValues.includes(statusParam as (typeof shipmentStatusValues)[number])
    ? (statusParam as (typeof shipmentStatusValues)[number])
    : undefined;

  const items = await listShipments({
    q: searchParams.get("q") ?? undefined,
    status,
    cargoTypeId: searchParams.get("cargoTypeId") ?? undefined,
    originWarehouseId: searchParams.get("originWarehouseId") ?? undefined,
    availableForMission: searchParams.get("availableForMission") === "true",
  });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const result = await requireActor(ALLOWED_ROLES);
  if ("response" in result) return result.response;

  const body = await request.json().catch(() => null);
  const parsed = shipmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "ورودی نامعتبر است.", fieldErrors: flattenIssues(parsed.error) } },
      { status: 422 },
    );
  }

  try {
    const created = await createShipment(parsed.data, result.actor);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) return domainErrorResponse(error, 422);
    throw error;
  }
}
