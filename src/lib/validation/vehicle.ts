import { z } from "zod";

const codePattern = /^[A-Za-z0-9_-]+$/;

export const vehicleTypeCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(codePattern, "کد فقط می‌تواند شامل حروف/اعداد انگلیسی، خط تیره و زیرخط باشد.")
    .nullable()
    .optional(),
  name: z.string().trim().min(1, "نام الزامی است.").max(200, "نام نباید بیش از ۲۰۰ کاراکتر باشد."),
  description: z.string().trim().max(500).nullable().optional(),
});

export const vehicleTypeUpdateSchema = z.object({
  name: z.string().trim().min(1, "نام الزامی است.").max(200).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const cargoTypeCreateSchema = vehicleTypeCreateSchema;
export const cargoTypeUpdateSchema = vehicleTypeUpdateSchema;

export const vehicleReadinessValues = ["READY", "OUT_OF_SERVICE"] as const;

export const vehicleCreateSchema = z.object({
  identifier: z.string().trim().min(1, "شناسه الزامی است.").max(50, "شناسه نباید بیش از ۵۰ کاراکتر باشد."),
  plateNumber: z.string().trim().max(50).nullable().optional(),
  vehicleTypeId: z.uuid("نوع خودرو نامعتبر است."),
  fuelTankLiters: z.number("ظرفیت باک باید عدد باشد.").positive("ظرفیت باک باید عددی مثبت باشد."),
  avgConsumptionPer100Km: z
    .number("مصرف متوسط باید عدد باشد.")
    .positive("مصرف متوسط باید عددی مثبت باشد."),
  avgSpeedKmh: z.number("سرعت متوسط باید عدد باشد.").positive("سرعت متوسط باید عددی مثبت باشد."),
  readiness: z.enum(vehicleReadinessValues).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const vehicleUpdateSchema = z.object({
  plateNumber: z.string().trim().max(50).nullable().optional(),
  vehicleTypeId: z.uuid("نوع خودرو نامعتبر است.").optional(),
  fuelTankLiters: z.number().positive("ظرفیت باک باید عددی مثبت باشد.").optional(),
  avgConsumptionPer100Km: z.number().positive("مصرف متوسط باید عددی مثبت باشد.").optional(),
  avgSpeedKmh: z.number().positive("سرعت متوسط باید عددی مثبت باشد.").optional(),
  readiness: z.enum(vehicleReadinessValues).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type VehicleTypeCreateInput = z.infer<typeof vehicleTypeCreateSchema>;
export type VehicleTypeUpdateInput = z.infer<typeof vehicleTypeUpdateSchema>;
export type CargoTypeCreateInput = z.infer<typeof cargoTypeCreateSchema>;
export type CargoTypeUpdateInput = z.infer<typeof cargoTypeUpdateSchema>;
export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;
export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>;
