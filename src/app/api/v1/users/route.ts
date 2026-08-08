import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { createUser, listUsers } from "@/server/services/user-service";
import { roleCodeSchema, userCreateSchema, userStatusSchema } from "@/lib/validation/admin";
import { adminErrorResponse, guardAdminWrite, validationErrorResponse } from "@/lib/http/admin-errors";
import { DomainError } from "@/lib/errors/domain-error";

/** مدیریت کاربران فقط برای ADMIN — گیت پیش از خواندن بدنه اعمال می‌شود. */
const ADMIN_ONLY = [RoleCode.ADMIN];

export async function GET(request: NextRequest) {
  const result = await requireActor(ADMIN_ONLY);
  if ("response" in result) return result.response;

  const params = request.nextUrl.searchParams;
  const role = params.get("role");
  const status = params.get("status");

  const users = await listUsers({
    q: params.get("q") ?? undefined,
    role: role ? (roleCodeSchema.safeParse(role).success ? (role as RoleCode) : undefined) : undefined,
    status: status ? (userStatusSchema.safeParse(status).success ? (status as never) : undefined) : undefined,
    includeDeleted: params.get("includeDeleted") === "true",
    page: Number(params.get("page")) || undefined,
    pageSize: Number(params.get("pageSize")) || undefined,
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const result = await requireActor(ADMIN_ONLY);
  if ("response" in result) return result.response;

  const limited = guardAdminWrite(result.actor);
  if (limited) return limited;

  const parsed = userCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error);

  try {
    const created = await createUser(
      {
        username: parsed.data.username,
        displayName: parsed.data.displayName ?? null,
        password: parsed.data.password,
        roles: parsed.data.roles as RoleCode[],
      },
      result.actor,
    );
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) return adminErrorResponse(error);
    throw error;
  }
}
