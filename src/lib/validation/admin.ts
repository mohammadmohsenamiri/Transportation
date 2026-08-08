import { z } from "zod";

/** Phase 14 — اعتبارسنجی مرزی همه endpointهای مدیریتی. */

const versionField = z.number().int().nonnegative();
const reasonField = z.string().trim().min(3).max(500);

export const roleCodeSchema = z.enum(["MISSION_PLANNER", "STATUS_VIEWER", "ADMIN"]);

export const userCreateSchema = z.object({
  username: z.string().min(1),
  displayName: z.string().nullish(),
  password: z.string().min(1),
  roles: z.array(roleCodeSchema).min(1),
});

/** فقط نام نمایشی قابل ویرایش است — نام کاربری تغییرناپذیر است (BR-U03). */
export const userUpdateSchema = z.object({
  version: versionField,
  displayName: z.string().nullish(),
});

/** بدنه‌ای که فقط توکن همروندی دارد — برای گذارهای کاربر و حذف/بازگردانی آیکن یکسان است. */
export const versionOnlySchema = z.object({ version: versionField });

export const userVersionSchema = versionOnlySchema;

export const userSuspendSchema = z.object({
  version: versionField,
  reason: reasonField,
});

export const userRolesSchema = z.object({
  version: versionField,
  roles: z.array(roleCodeSchema).min(1),
});

export const userResetPasswordSchema = z.object({
  version: versionField,
  newPassword: z.string().min(1),
});

export const userStatusSchema = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"]);

export const iconCategorySchema = z.enum(["VEHICLE", "OFFICE", "WAREHOUSE", "DESTINATION", "OTHER"]);

export const iconAssignmentSchema = z.object({
  targetType: z.enum(["ORGANIZATION_UNIT", "VEHICLE_TYPE", "VEHICLE"]),
  targetId: z.string().uuid(),
  iconAssetId: z.string().uuid().nullable(),
});

export const settingsUpdateSchema = z.object({
  changes: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.unknown(),
        version: versionField,
      }),
    )
    .min(1),
});

export const settingResetSchema = z.object({ version: versionField });

export const auditQuerySchema = z.object({
  actorUserId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});
