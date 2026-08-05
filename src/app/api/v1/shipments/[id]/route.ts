import { NextResponse, type NextRequest } from "next/server";
import { requireActor, domainErrorResponse, errorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { getShipmentById, updateShipment, softDeleteShipment } from "@/server/services/shipment-service";
import { shipmentUpdateSchema } from "@/lib/validation/shipment";
import { flattenIssues } from "@/lib/validation/utils";
import { DomainError } from "@/lib/errors/domain-error";

const ALLOWED_ROLES = [RoleCode.ADMIN, RoleCode.MISSION_PLANNER];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const result = await requireActor(ALLOWED_ROLES);
  if ("response" in result) return result.response;

  const { id } = await params;
  const shipment = await getShipmentById(id);
  if (!shipment) {
    return errorResponse("SHIPMENT_NOT_FOUND", "مرسوله یافت نشد.", 404);
  }
  return NextResponse.json(shipment);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const result = await requireActor(ALLOWED_ROLES);
  if ("response" in result) return result.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = shipmentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "ورودی نامعتبر است.", fieldErrors: flattenIssues(parsed.error) } },
      { status: 422 },
    );
  }

  try {
    const updated = await updateShipment(id, parsed.data, result.actor);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof DomainError) {
      const status = error.code === "SHIPMENT_NOT_FOUND" ? 404 : 422;
      return domainErrorResponse(error, status);
    }
    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const result = await requireActor(ALLOWED_ROLES);
  if ("response" in result) return result.response;

  const { id } = await params;

  try {
    await softDeleteShipment(id, result.actor);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof DomainError) {
      const status = error.code === "SHIPMENT_NOT_FOUND" ? 404 : 409;
      return domainErrorResponse(error, status);
    }
    throw error;
  }
}
