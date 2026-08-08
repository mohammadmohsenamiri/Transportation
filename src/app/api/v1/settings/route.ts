import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { listSettings, updateSettings } from "@/server/services/settings-service";
import { settingsUpdateSchema } from "@/lib/validation/admin";
import { adminErrorResponse, guardAdminWrite, validationErrorResponse } from "@/lib/http/admin-errors";
import { DomainError } from "@/lib/errors/domain-error";

const ADMIN_ONLY = [RoleCode.ADMIN];

export async function GET(request: NextRequest) {
  const result = await requireActor(ADMIN_ONLY);
  if ("response" in result) return result.response;

  const group = request.nextUrl.searchParams.get("group");
  const settings = await listSettings();

  return NextResponse.json({
    items: group ? settings.filter((setting) => setting.definition.group === group) : settings,
  });
}

/** نوشتن دسته‌ای در یک تراکنش — یا همه یا هیچ (IS-03). */
export async function PUT(request: NextRequest) {
  const result = await requireActor(ADMIN_ONLY);
  if ("response" in result) return result.response;

  const limited = guardAdminWrite(result.actor);
  if (limited) return limited;

  const parsed = settingsUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error);

  try {
    await updateSettings(parsed.data.changes, result.actor);
    return NextResponse.json({ items: await listSettings() });
  } catch (error) {
    if (error instanceof DomainError) return adminErrorResponse(error);
    throw error;
  }
}
