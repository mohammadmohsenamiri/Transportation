import { z } from "zod";
import { MAX_ROUTE_POINTS } from "@/lib/domain/route-csv";

const codePattern = /^[A-Za-z0-9_-]+$/;

export const routeSourceValues = ["CSV", "MAP_DRAWING"] as const;

export const routePointInputSchema = z.object({
  sequence: z.number("ترتیب باید عدد باشد.").int("ترتیب باید عدد صحیح باشد.").positive("ترتیب باید مثبت باشد."),
  latitude: z
    .number("عرض جغرافیایی باید عدد باشد.")
    .min(-90, "عرض جغرافیایی باید بین -۹۰ و ۹۰ باشد.")
    .max(90, "عرض جغرافیایی باید بین -۹۰ و ۹۰ باشد."),
  longitude: z
    .number("طول جغرافیایی باید عدد باشد.")
    .min(-180, "طول جغرافیایی باید بین -۱۸۰ و ۱۸۰ باشد.")
    .max(180, "طول جغرافیایی باید بین -۱۸۰ و ۱۸۰ باشد."),
  label: z.string().trim().max(200, "برچسب نباید بیش از ۲۰۰ کاراکتر باشد.").nullable().optional(),
});
export type RoutePointInput = z.infer<typeof routePointInputSchema>;

const pointsArraySchema = z
  .array(routePointInputSchema)
  .min(2, "مسیر باید حداقل دو نقطه داشته باشد.")
  .max(MAX_ROUTE_POINTS, `تعداد نقاط نباید بیش از ${MAX_ROUTE_POINTS} باشد.`)
  .refine(
    (points) => new Set(points.map((p) => p.sequence)).size === points.length,
    "مقدار ترتیب (sequence) نقاط باید یکتا باشد.",
  );

export const routeCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "شناسه مسیر الزامی است.")
    .max(50, "شناسه نباید بیش از ۵۰ کاراکتر باشد.")
    .regex(codePattern, "شناسه فقط می‌تواند شامل حروف/اعداد انگلیسی، خط تیره و زیرخط باشد."),
  name: z.string().trim().min(1, "نام الزامی است.").max(200, "نام نباید بیش از ۲۰۰ کاراکتر باشد."),
  description: z.string().trim().max(1000).nullable().optional(),
  source: z.enum(routeSourceValues),
  points: pointsArraySchema,
});
export type RouteCreateInput = z.infer<typeof routeCreateSchema>;

export const routeImportConfirmSchema = z.object({
  previewToken: z.string().min(1, "توکن پیش‌نمایش نامعتبر است."),
  code: z
    .string()
    .trim()
    .min(1, "شناسه مسیر الزامی است.")
    .max(50)
    .regex(codePattern, "شناسه فقط می‌تواند شامل حروف/اعداد انگلیسی، خط تیره و زیرخط باشد."),
  name: z.string().trim().min(1, "نام الزامی است.").max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  points: pointsArraySchema,
});
export type RouteImportConfirmInput = z.infer<typeof routeImportConfirmSchema>;

export const routeNewVersionSchema = z.object({
  source: z.enum(routeSourceValues),
  points: pointsArraySchema,
});
export type RouteNewVersionInput = z.infer<typeof routeNewVersionSchema>;

export const routePatchSchema = z.object({
  name: z.string().trim().min(1, "نام الزامی است.").max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
});
export type RoutePatchInput = z.infer<typeof routePatchSchema>;

export const routeDuplicateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "شناسه مسیر الزامی است.")
    .max(50)
    .regex(codePattern, "شناسه فقط می‌تواند شامل حروف/اعداد انگلیسی، خط تیره و زیرخط باشد."),
  name: z.string().trim().min(1, "نام الزامی است.").max(200),
});
export type RouteDuplicateInput = z.infer<typeof routeDuplicateSchema>;
