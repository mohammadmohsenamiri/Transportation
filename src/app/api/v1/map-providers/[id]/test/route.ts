import { NextResponse, type NextRequest } from "next/server";
import { requireActor, domainErrorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { testMapProviderConnection } from "@/server/services/map-provider-service";
import { DomainError } from "@/lib/errors/domain-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const { id } = await params;

  try {
    const testResult = await testMapProviderConnection(id, result.actor);
    return NextResponse.json(testResult);
  } catch (error) {
    if (error instanceof DomainError) {
      return domainErrorResponse(error, 404);
    }
    throw error;
  }
}
