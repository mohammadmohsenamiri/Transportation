import { readSessionCookie } from "@/lib/http/session-cookie";
import { getSessionUser, type SessionUser } from "@/server/services/auth-service";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieValue = await readSessionCookie();
  return getSessionUser(cookieValue);
}
