import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/security/session-token";

/**
 * در استقرار واقعی (پشت reverse proxy با TLS) باید true باشد. فقط برای اجرای محلی/آزمون
 * روی HTTP ساده (بدون TLS)، با COOKIE_INSECURE=true می‌توان موقتاً غیرفعال کرد — پیش‌فرض
 * همیشه امن (بر اساس NODE_ENV) است.
 */
const secureCookies = process.env.COOKIE_INSECURE === "true" ? false : process.env.NODE_ENV === "production";

export async function setSessionCookie(value: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function readSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}
