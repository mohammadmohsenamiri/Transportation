"use server";

import { redirect } from "next/navigation";
import { login } from "@/server/services/auth-service";
import { DomainError } from "@/lib/errors/domain-error";
import { loginSchema } from "@/lib/validation/auth";
import { flattenIssues } from "@/lib/validation/utils";
import { getRequestContext } from "@/lib/http/request-context";
import { setSessionCookie } from "@/lib/http/session-cookie";

export interface LoginActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: flattenIssues(parsed.error) };
  }

  const { ipAddress, userAgent } = await getRequestContext();

  let result;
  try {
    result = await login({ ...parsed.data, ipAddress, userAgent });
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message, fieldErrors: error.fieldErrors };
    }
    throw error;
  }

  await setSessionCookie(result.cookieValue, result.expiresAt);
  redirect(result.user.mustChangePassword ? "/change-password" : "/dashboard");
}
