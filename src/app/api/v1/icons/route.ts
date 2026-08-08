import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import { listIcons, uploadIcon } from "@/server/services/icon-service";
import { iconCategorySchema } from "@/lib/validation/admin";
import { adminErrorResponse, guardAdminWrite } from "@/lib/http/admin-errors";
import { DomainError } from "@/lib/errors/domain-error";
import type { IconCategory } from "@/generated/prisma/client";
import { readIconMultipart } from "@/lib/http/icon-multipart";

const ADMIN_ONLY = [RoleCode.ADMIN];

export async function GET(request: NextRequest) {
  const result = await requireActor(ADMIN_ONLY);
  if ("response" in result) return result.response;

  const params = request.nextUrl.searchParams;
  const category = params.get("category");

  return NextResponse.json(
    await listIcons({
      category:
        category && iconCategorySchema.safeParse(category).success ? (category as IconCategory) : undefined,
      q: params.get("q") ?? undefined,
      includeDeleted: params.get("includeDeleted") === "true",
      page: Number(params.get("page")) || undefined,
      pageSize: Number(params.get("pageSize")) || undefined,
    }),
  );
}

export async function POST(request: NextRequest) {
  const result = await requireActor(ADMIN_ONLY);
  if ("response" in result) return result.response;

  const limited = guardAdminWrite(result.actor);
  if (limited) return limited;

  try {
    const form = await readIconMultipart(request);

    const category = iconCategorySchema.safeParse(form.fields.category);
    if (!category.success) {
      throw new DomainError("ICON_CATEGORY_INVALID", "دسته آیکن نامعتبر است.", {
        category: "یکی از دسته‌های مجاز را انتخاب کنید.",
      });
    }

    const created = await uploadIcon(
      {
        filename: form.filename,
        declaredMimeType: form.declaredMimeType,
        size: form.size,
        bytes: form.bytes,
        name: form.fields.name ?? "",
        category: category.data as IconCategory,
      },
      result.actor,
    );
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) return adminErrorResponse(error);
    throw error;
  }
}
