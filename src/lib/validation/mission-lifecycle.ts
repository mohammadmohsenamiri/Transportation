import { z } from "zod";

/**
 * Phase 15 — اعتبارسنجی مرزی گذارهای چرخه عمر مأموریت.
 *
 * ⚠️ Zod فقط **شکل** را اجرا می‌کند، دامنه **معنا** را. «آیا این یک زمان ISO معتبر است؟» کار
 * Zod است؛ «آیا این رسیدن پیش از زمان شروع است؟» کار گارد دامنه (LR-02). هیچ قاعده کسب‌وکاری
 * نباید به این فایل منتقل شود، وگرنه در تست واحد قابل آزمون نمی‌ماند.
 */

const versionField = z.number("توکن نسخه الزامی است.").int().nonnegative();
const reasonField = z
  .string()
  .trim()
  .min(3, "متن باید حداقل ۳ نویسه باشد.")
  .max(500, "متن نباید بیش از ۵۰۰ نویسه باشد.");

const isoWithOffset = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "زمان نامعتبر است.");

export const missionFailureClassificationSchema = z.enum([
  "VEHICLE_BREAKDOWN",
  "ACCIDENT",
  "CARGO_ISSUE",
  "ROUTE_BLOCKED",
  "WEATHER",
  "DRIVER_UNAVAILABLE",
  "OTHER",
]);

export const completeMissionSchema = z.object({
  version: versionField,
  actualArrivalAt: isoWithOffset,
  actualDepartureAt: isoWithOffset.nullish(),
});

export const failMissionSchema = z.object({
  version: versionField,
  failedAt: isoWithOffset,
  failureReason: reasonField,
  failureClassification: missionFailureClassificationSchema,
});

export const missionVersionOnlySchema = z.object({ version: versionField });

export const reopenMissionSchema = z.object({
  version: versionField,
  reopenReason: reasonField,
});

/** CC-04 — یادداشت توکن نسخه نمی‌گیرد. */
export const addMissionNoteSchema = z.object({
  body: z.string().trim().min(1, "متن یادداشت الزامی است.").max(2000, "متن یادداشت نباید بیش از ۲۰۰۰ نویسه باشد."),
});

// ---------------------------------------------------------------------------
// نوع مأموریت — داده مرجع
// ---------------------------------------------------------------------------

export const missionTypeCreateSchema = z.object({
  code: z.string().trim().max(32).nullish(),
  name: z.string().trim().min(1, "نام الزامی است.").max(120),
  description: z.string().trim().max(500).nullish(),
  isActive: z.boolean().optional(),
});
export type MissionTypeCreateInput = z.infer<typeof missionTypeCreateSchema>;

export const missionTypeUpdateSchema = z.object({
  code: z.string().trim().max(32).nullish(),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullish(),
  isActive: z.boolean().optional(),
});
export type MissionTypeUpdateInput = z.infer<typeof missionTypeUpdateSchema>;
