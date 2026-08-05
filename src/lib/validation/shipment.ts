import { z } from "zod";

export const shipmentStatusValues = [
  "DRAFT",
  "WAITING_FOR_DISPATCH",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
] as const;

export const shipmentDestinationModeValues = ["ORGANIZATION_UNIT", "COORDINATES"] as const;

const trackingCodePattern = /^[A-Za-z0-9_-]+$/;

const shipmentSharedFields = {
  trackingCode: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(trackingCodePattern, "کد رهگیری فقط می‌تواند شامل حروف/اعداد انگلیسی، خط تیره و زیرخط باشد.")
    .nullable()
    .optional(),
  title: z.string().trim().min(1, "عنوان الزامی است.").max(200, "عنوان نباید بیش از ۲۰۰ کاراکتر باشد.").optional(),
  cargoTypeId: z.uuid("نوع بار نامعتبر است.").optional(),
  originWarehouseId: z.uuid("انبار مبدأ نامعتبر است.").optional(),
  destinationMode: z.enum(shipmentDestinationModeValues).optional(),
  destinationOrganizationUnitId: z.uuid("گره سازمانی نامعتبر است.").nullable().optional(),
  destinationTitle: z.string().trim().max(200, "عنوان مقصد نباید بیش از ۲۰۰ کاراکتر باشد.").nullable().optional(),
  destinationLatitude: z
    .number("عرض جغرافیایی باید عدد باشد.")
    .min(-90, "عرض جغرافیایی باید بین -۹۰ و ۹۰ باشد.")
    .max(90, "عرض جغرافیایی باید بین -۹۰ و ۹۰ باشد.")
    .nullable()
    .optional(),
  destinationLongitude: z
    .number("طول جغرافیایی باید عدد باشد.")
    .min(-180, "طول جغرافیایی باید بین -۱۸۰ و ۱۸۰ باشد.")
    .max(180, "طول جغرافیایی باید بین -۱۸۰ و ۱۸۰ باشد.")
    .nullable()
    .optional(),
  weightKg: z.number("وزن باید عدد باشد.").positive("وزن باید عددی مثبت باشد.").nullable().optional(),
  volumeM3: z.number("حجم باید عدد باشد.").positive("حجم باید عددی مثبت باشد.").nullable().optional(),
  notes: z.string().trim().max(1000, "توضیحات نباید بیش از ۱۰۰۰ کاراکتر باشد.").nullable().optional(),
};

function refineDestination(
  data: {
    destinationMode?: (typeof shipmentDestinationModeValues)[number];
    destinationOrganizationUnitId?: string | null;
    destinationTitle?: string | null;
    destinationLatitude?: number | null;
    destinationLongitude?: number | null;
  },
  ctx: z.RefinementCtx,
) {
  if (!data.destinationMode) return;

  if (data.destinationMode === "ORGANIZATION_UNIT") {
    if (!data.destinationOrganizationUnitId) {
      ctx.addIssue({
        code: "custom",
        path: ["destinationOrganizationUnitId"],
        message: "انتخاب گره سازمانی مقصد الزامی است.",
      });
    }
  } else {
    if (!data.destinationTitle || data.destinationTitle.trim() === "") {
      ctx.addIssue({ code: "custom", path: ["destinationTitle"], message: "عنوان مقصد الزامی است." });
    }
    if (data.destinationLatitude === null || data.destinationLatitude === undefined) {
      ctx.addIssue({ code: "custom", path: ["destinationLatitude"], message: "عرض جغرافیایی مقصد الزامی است." });
    }
    if (data.destinationLongitude === null || data.destinationLongitude === undefined) {
      ctx.addIssue({ code: "custom", path: ["destinationLongitude"], message: "طول جغرافیایی مقصد الزامی است." });
    }
  }
}

export const shipmentCreateSchema = z
  .object({
    ...shipmentSharedFields,
    title: z.string().trim().min(1, "عنوان الزامی است.").max(200, "عنوان نباید بیش از ۲۰۰ کاراکتر باشد."),
    cargoTypeId: z.uuid("نوع بار نامعتبر است."),
    originWarehouseId: z.uuid("انبار مبدأ نامعتبر است."),
    destinationMode: z.enum(shipmentDestinationModeValues),
  })
  .superRefine(refineDestination);
export type ShipmentCreateInput = z.infer<typeof shipmentCreateSchema>;

export const shipmentUpdateSchema = z
  .object({
    ...shipmentSharedFields,
    status: z.enum(shipmentStatusValues).optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine(refineDestination);
export type ShipmentUpdateInput = z.infer<typeof shipmentUpdateSchema>;
