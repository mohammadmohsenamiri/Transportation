"use server";

import { redirect } from "next/navigation";
import { changePassword } from "@/server/services/auth-service";
import { DomainError } from "@/lib/errors/domain-error";
import { changePasswordSchema } from "@/lib/validation/auth";
import { flattenIssues } from "@/lib/validation/utils";
import { getCurrentUser } from "@/lib/auth/current-user";

export interface ChangePasswordActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function changePasswordAction(
  _prevState: ChangePasswordActionState,
  formData: FormData,
): Promise<ChangePasswordActionState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: flattenIssues(parsed.error) };
  }

  try {
    await changePassword({
      userId: user.id,
      currentSessionId: user.sessionId,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return { error: error.message, fieldErrors: error.fieldErrors };
    }
    throw error;
  }

  redirect("/dashboard");
}
