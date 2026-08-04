"use server";

import { redirect } from "next/navigation";
import { logout } from "@/server/services/auth-service";
import { getRequestContext } from "@/lib/http/request-context";
import { clearSessionCookie, readSessionCookie } from "@/lib/http/session-cookie";

export async function logoutAction(): Promise<void> {
  const cookieValue = await readSessionCookie();
  const context = await getRequestContext();
  await logout(cookieValue, context);
  await clearSessionCookie();
  redirect("/login");
}
