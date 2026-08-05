import { z } from "zod";

export const mapProviderKindValues = ["INTERNAL_TMS", "INTERNAL_XYZ", "INTERNAL_WMTS", "EXTERNAL_XYZ"] as const;

export const mapProviderCreateSchema = z.object({
  name: z.string().trim().min(1, "نام الزامی است.").max(200, "نام نباید بیش از ۲۰۰ کاراکتر باشد."),
  kind: z.enum(mapProviderKindValues, { message: "نوع Provider نامعتبر است." }),
  urlTemplate: z.string().trim().min(1, "آدرس الزامی است.").max(1000),
  attribution: z.string().trim().max(300).nullable().optional(),
  minZoom: z.number().int().min(0).max(24),
  maxZoom: z.number().int().min(0).max(24),
  tileSize: z.union([z.literal(256), z.literal(512)]),
  subdomains: z.array(z.string().trim().min(1)).max(8).nullable().optional(),
  requiresApiKey: z.boolean(),
  secretReference: z.string().trim().max(300).nullable().optional(),
  isDefault: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
}).refine((data) => data.minZoom <= data.maxZoom, {
  message: "حداقل بزرگ‌نمایی باید کمتر یا مساوی حداکثر باشد.",
  path: ["minZoom"],
});

export const mapProviderUpdateSchema = z.object({
  name: z.string().trim().min(1, "نام الزامی است.").max(200).optional(),
  urlTemplate: z.string().trim().min(1, "آدرس الزامی است.").max(1000).optional(),
  attribution: z.string().trim().max(300).nullable().optional(),
  minZoom: z.number().int().min(0).max(24).optional(),
  maxZoom: z.number().int().min(0).max(24).optional(),
  tileSize: z.union([z.literal(256), z.literal(512)]).optional(),
  subdomains: z.array(z.string().trim().min(1)).max(8).nullable().optional(),
  requiresApiKey: z.boolean().optional(),
  secretReference: z.string().trim().max(300).nullable().optional(),
  isDefault: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
});

export type MapProviderCreateInput = z.infer<typeof mapProviderCreateSchema>;
export type MapProviderUpdateInput = z.infer<typeof mapProviderUpdateSchema>;
