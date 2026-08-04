import { z } from "zod";

export const organizationLevelValues = [
  "COUNTRY_OFFICE",
  "GROUP_OFFICE",
  "DISTRIBUTOR_OFFICE",
  "WAREHOUSE",
] as const;

export const organizationUnitCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "کد الزامی است.")
    .max(50, "کد نباید بیش از ۵۰ کاراکتر باشد.")
    .regex(/^[A-Za-z0-9_-]+$/, "کد فقط می‌تواند شامل حروف/اعداد انگلیسی، خط تیره و زیرخط باشد."),
  name: z.string().trim().min(1, "نام الزامی است.").max(200, "نام نباید بیش از ۲۰۰ کاراکتر باشد."),
  level: z.enum(organizationLevelValues, { message: "سطح نامعتبر است." }),
  parentId: z.uuid("شناسه والد نامعتبر است.").nullable(),
  latitude: z.number().min(-90, "عرض جغرافیایی باید بین ۹۰- و ۹۰ باشد.").max(90).nullable().optional(),
  longitude: z.number().min(-180, "طول جغرافیایی باید بین ۱۸۰- و ۱۸۰ باشد.").max(180).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
});

export const organizationUnitUpdateSchema = z.object({
  name: z.string().trim().min(1, "نام الزامی است.").max(200).optional(),
  parentId: z.uuid("شناسه والد نامعتبر است.").nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type OrganizationUnitCreateInput = z.infer<typeof organizationUnitCreateSchema>;
export type OrganizationUnitUpdateInput = z.infer<typeof organizationUnitUpdateSchema>;
