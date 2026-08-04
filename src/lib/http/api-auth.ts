import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { assertRole, type ActorContext } from "@/server/services/permission-service";
import { DomainError } from "@/lib/errors/domain-error";
import type { RoleCode } from "@/lib/permissions/roles";

export function errorResponse(code: string, message: string, status: number, fieldErrors: Record<string, string> = {}) {
  return NextResponse.json({ error: { code, message, fieldErrors } }, { status });
}

export function domainErrorResponse(error: DomainError, status = 400) {
  return errorResponse(error.code, error.message, status, error.fieldErrors);
}

export async function requireActor(
  allowedRoles: readonly RoleCode[],
): Promise<{ actor: ActorContext } | { response: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return { response: errorResponse("UNAUTHENTICATED", "ابتدا وارد شوید.", 401) };
  }

  const actor: ActorContext = { userId: user.id, username: user.username, roles: user.roles };

  try {
    assertRole(actor, allowedRoles);
  } catch (error) {
    if (error instanceof DomainError) {
      return { response: domainErrorResponse(error, 403) };
    }
    throw error;
  }

  return { actor };
}
