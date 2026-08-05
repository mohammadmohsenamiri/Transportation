import { NextResponse, type NextRequest } from "next/server";
import { requireActor, domainErrorResponse, errorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { updateCargoType, softDeleteCargoType, listCargoTypes } from "@/server/services/cargo-type-service";
import { cargoTypeUpdateSchema } from "@/lib/validation/vehicle";
import { flattenIssues } from "@/lib/validation/utils";
import { DomainError } from "@/lib/errors/domain-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const { id } = await params;
  const items = await listCargoTypes({});
  const item = items.find((cargoType) => cargoType.id === id);
  if (!item) {
    return errorResponse("CARGO_TYPE_NOT_FOUND", "نوع بار یافت نشد.", 404);
  }
  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = cargoTypeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "ورودی نامعتبر است.", fieldErrors: flattenIssues(parsed.error) } },
      { status: 422 },
    );
  }

  try {
    const updated = await updateCargoType(id, parsed.data, result.actor);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof DomainError) {
      const status = error.code === "CARGO_TYPE_NOT_FOUND" ? 404 : 422;
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
    await softDeleteCargoType(id, result.actor);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof DomainError) {
      const status = error.code === "CARGO_TYPE_NOT_FOUND" ? 404 : 409;
      return domainErrorResponse(error, status);
    }
    throw error;
  }
}
