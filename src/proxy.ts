import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/security/session-token";

/**
 * بررسی سریع و بدون DB برای هدایت زودهنگام کاربران بدون session cookie.
 * enforcement واقعی (اعتبارسنجی session در DB) در هر Server Component/Action
 * به‌صورت مستقل انجام می‌شود؛ این فایل فقط برای تجربه کاربری بهتر است.
 */
export function proxy(request: NextRequest) {
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
