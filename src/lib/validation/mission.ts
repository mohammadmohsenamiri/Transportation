import { z } from "zod";

const isoDateTimeSchema = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "زمان نامعتبر است.");

export const missionCreateSchema = z.object({
  shipmentIds: z.array(z.uuid("شناسه مرسوله نامعتبر است.")).min(1, "حداقل یک مرسوله باید انتخاب شود."),
  vehicleId: z.uuid("خودرو نامعتبر است."),
  startAt: isoDateTimeSchema,
  routeId: z.uuid("مسیر نامعتبر است.").nullable().optional(),
  notes: z.string().trim().max(1000, "توضیحات نباید بیش از ۱۰۰۰ کاراکتر باشد.").nullable().optional(),
});
export type MissionCreateInput = z.infer<typeof missionCreateSchema>;

/**
 * Phase 15 (V-03) — توکن همروندی روی هر عملیات تغییردهنده مأموریت اجباری است.
 * حذف آن ۴۲۲ می‌دهد، نه موفقیت بی‌صدا.
 */
export const missionVersionField = z.number("توکن نسخه الزامی است.").int().nonnegative();

export const missionUpdateSchema = z.object({
  version: missionVersionField,
  shipmentIds: z.array(z.uuid()).min(1, "حداقل یک مرسوله باید انتخاب شود.").optional(),
  vehicleId: z.uuid("خودرو نامعتبر است.").optional(),
  startAt: isoDateTimeSchema.optional(),
  routeId: z.uuid("مسیر نامعتبر است.").nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});
export type MissionUpdateInput = z.infer<typeof missionUpdateSchema>;

export const missionCancelSchema = z.object({
  version: missionVersionField,
  cancellationReason: z.string().trim().min(1, "دلیل لغو الزامی است.").max(500, "دلیل لغو نباید بیش از ۵۰۰ کاراکتر باشد."),
});
export type MissionCancelInput = z.infer<typeof missionCancelSchema>;

export const missionDuplicateSchema = z.object({
  startAt: isoDateTimeSchema,
});
export type MissionDuplicateInput = z.infer<typeof missionDuplicateSchema>;

export const missionEstimateSchema = z.object({
  originLatitude: z.number().min(-90).max(90),
  originLongitude: z.number().min(-180).max(180),
  destinationLatitude: z.number().min(-90).max(90),
  destinationLongitude: z.number().min(-180).max(180),
  speedKmh: z.number("سرعت باید عدد باشد.").positive("سرعت باید عددی مثبت باشد."),
  routeId: z.uuid().nullable().optional(),
  fuelConsumptionPer100Km: z.number().positive().nullable().optional(),
});
export type MissionEstimateInputPayload = z.infer<typeof missionEstimateSchema>;
