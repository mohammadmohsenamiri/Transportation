import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "ابتدا وارد شوید.", fieldErrors: {} } },
      { status: 401 },
    );
  }

  return NextResponse.json({
    id: user.id,
    username: user.username,
    roles: user.roles,
    mustChangePassword: user.mustChangePassword,
  });
}
