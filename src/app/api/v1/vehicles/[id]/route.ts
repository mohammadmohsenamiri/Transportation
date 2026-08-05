import { NextResponse, type NextRequest } from "next/server";
import { requireActor, domainErrorResponse, errorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { getVehicleById, updateVehicle, softDeleteVehicle } from "@/server/services/vehicle-service";
import { vehicleUpdateSchema } from "@/lib/validation/vehicle";
import { flattenIssues } from "@/lib/validation/utils";
import { DomainError } from "@/lib/errors/domain-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const { id } = await params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) {
    return errorResponse("VEHICLE_NOT_FOUND", "خودرو یافت نشد.", 404);
  }
  return NextResponse.json(vehicle);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = vehicleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "ورودی نامعتبر است.", fieldErrors: flattenIssues(parsed.error) } },
      { status: 422 },
    );
  }

  try {
    const updated = await updateVehicle(id, parsed.data, result.actor);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof DomainError) {
      const status = error.code === "VEHICLE_NOT_FOUND" ? 404 : 422;
      return domainErrorResponse(error, status);
    }
    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const { id } = await params;

  try {
    await softDeleteVehicle(id, result.actor);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof DomainError) {
      const status = error.code === "VEHICLE_NOT_FOUND" ? 404 : 409;
      return domainErrorResponse(error, status);
    }
    throw error;
  }
}
