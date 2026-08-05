import { NextResponse, type NextRequest } from "next/server";
import { requireActor, domainErrorResponse } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { listMapProviders, createMapProvider } from "@/server/services/map-provider-service";
import { mapProviderCreateSchema } from "@/lib/validation/map-provider";
import { flattenIssues } from "@/lib/validation/utils";
import { DomainError } from "@/lib/errors/domain-error";

export async function GET() {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const items = await listMapProviders();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const result = await requireActor([RoleCode.ADMIN]);
  if ("response" in result) return result.response;

  const body = await request.json().catch(() => null);
  const parsed = mapProviderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "ورودی نامعتبر است.", fieldErrors: flattenIssues(parsed.error) } },
      { status: 422 },
    );
  }

  try {
    const created = await createMapProvider(parsed.data, result.actor);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) {
      return domainErrorResponse(error, 422);
    }
    throw error;
  }
}
