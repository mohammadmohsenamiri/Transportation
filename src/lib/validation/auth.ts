import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "نام کاربری الزامی است."),
  password: z.string().min(1, "رمز عبور الزامی است."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "رمز عبور فعلی الزامی است."),
    newPassword: z.string().min(8, "رمز عبور جدید باید حداقل ۸ کاراکتر باشد."),
    confirmPassword: z.string().min(1, "تکرار رمز عبور الزامی است."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "رمز عبور جدید و تکرار آن یکسان نیستند.",
    path: ["confirmPassword"],
  });
