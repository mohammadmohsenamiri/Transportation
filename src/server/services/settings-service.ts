import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors/domain-error";
import { logAudit } from "@/server/services/audit-service";
import type { ActorContext } from "@/server/services/permission-service";
import {
  SETTING_DEFINITIONS,
  getSettingDefinition,
  parseSettingValue,
  type SettingDefinition,
} from "@/lib/settings/settings-registry";

/**
 * Phase 14 — سرویس تنظیمات سامانه.
 *
 * ترتیب اولویت (BR-S01…S04): متغیر محیطی ← رکورد DB ← پیش‌فرض رجیستری.
 * متغیر محیطی همیشه برنده است و تنظیم را «قفل» می‌کند؛ زیرساخت نباید از یک فرم وب قابل
 * بازنویسی باشد.
 *
 * cache در حافظه و per-process است — همان محدودیتی که `rate-limit.ts` شیپ‌شده دارد. باطل‌سازی
 * صریح پس از هر نوشتن انجام می‌شود، پس TTL لازم نیست (TTL فقط کهنگی اضافه می‌کرد).
 * استقرار چندنمونه‌ای به Phase 17 موکول است.
 */

export type SettingValue = string | number | boolean;

/** همان الگوی تشخیص نقض یکتایی که بقیه سرویس‌ها استفاده می‌کنند. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002"
  );
}

const cache = new Map<string, SettingValue>();

export function invalidateSettingsCache(key?: string): void {
  if (key) cache.delete(key);
  else cache.clear();
}

function envValueFor(definition: SettingDefinition): SettingValue | null {
  if (!definition.envVar) return null;
  const raw = process.env[definition.envVar];
  if (raw === undefined || raw.trim().length === 0) return null;
  return parseSettingValue(definition.key, raw);
}

export function isEnvLocked(key: string): boolean {
  return envValueFor(getSettingDefinition(key)) !== null;
}

/** مقدار مؤثر یک تنظیم. کلید ناشناخته خطا می‌دهد (BR-S03). */
export async function getSetting(key: string): Promise<SettingValue> {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const definition = getSettingDefinition(key);

  const fromEnv = envValueFor(definition);
  if (fromEnv !== null) {
    cache.set(key, fromEnv);
    return fromEnv;
  }

  const row = await prisma.systemSetting.findUnique({ where: { key } });
  let value: SettingValue = definition.defaultValue;

  if (row) {
    try {
      value = parseSettingValue(key, row.value);
    } catch {
      // BR-S04: یک رکورد خراب نباید برنامه را بشکند — پیش‌فرض استفاده و مغایرت ثبت می‌شود.
      console.error(`[settings] مقدار ذخیره‌شده کلید «${key}» نامعتبر است؛ مقدار پیش‌فرض استفاده شد.`);
    }
  }

  cache.set(key, value);
  return value;
}

export interface EffectiveSetting {
  key: string;
  value: SettingValue;
  defaultValue: SettingValue;
  isDefault: boolean;
  isEnvLocked: boolean;
  version: number;
  definition: SettingDefinition;
}

/** همه کلیدهای رجیستری، چه رکورد داشته باشند چه نه. */
export async function listSettings(): Promise<EffectiveSetting[]> {
  const rows = await prisma.systemSetting.findMany();
  const rowsByKey = new Map(rows.map((row) => [row.key, row]));

  return SETTING_DEFINITIONS.map((definition) => {
    const row = rowsByKey.get(definition.key);
    const locked = envValueFor(definition);

    let value: SettingValue = definition.defaultValue;
    if (locked !== null) {
      value = locked;
    } else if (row) {
      try {
        value = parseSettingValue(definition.key, row.value);
      } catch {
        console.error(`[settings] مقدار ذخیره‌شده کلید «${definition.key}» نامعتبر است.`);
      }
    }

    return {
      key: definition.key,
      value,
      defaultValue: definition.defaultValue,
      isDefault: value === definition.defaultValue,
      isEnvLocked: locked !== null,
      version: row?.version ?? 0,
      definition,
    };
  });
}

export interface SettingChange {
  key: string;
  value: unknown;
  version: number;
}

/**
 * نوشتن دسته‌ای — **یا همه یا هیچ** (IS-03). یک فرم تنظیمات نباید نیمه‌اعمال شود.
 * برای هر کلید یک رکورد audit جدا نوشته می‌شود، نه یکی برای کل دسته، تا هر تغییر
 * مستقلاً قابل ردیابی باشد.
 */
export async function updateSettings(changes: SettingChange[], actor: ActorContext): Promise<void> {
  if (changes.length === 0) return;

  // اعتبارسنجی کامل پیش از هر نوشتن؛ اولین خطا کل دسته را رد می‌کند.
  const prepared = changes.map((change) => {
    const definition = getSettingDefinition(change.key);
    if (envValueFor(definition) !== null) {
      throw new DomainError(
        "SETTING_ENV_LOCKED",
        `«${definition.labelFa}» با متغیر محیطی تنظیم شده و از این صفحه قابل تغییر نیست.`,
        { [change.key]: "این تنظیم با متغیر محیطی قفل شده است." },
      );
    }
    return { definition, value: parseSettingValue(change.key, change.value), version: change.version };
  });

  const before = await prisma.systemSetting.findMany({
    where: { key: { in: prepared.map((item) => item.definition.key) } },
  });
  const beforeByKey = new Map(before.map((row) => [row.key, row]));

  await prisma.$transaction(async (tx) => {
    for (const item of prepared) {
      const existing = beforeByKey.get(item.definition.key);

      if (existing) {
        const updated = await tx.systemSetting.updateMany({
          where: { key: item.definition.key, version: item.version },
          data: { value: item.value, version: { increment: 1 }, updatedById: actor.userId },
        });
        if (updated.count === 0) {
          throw new DomainError(
            "SETTING_VERSION_CONFLICT",
            "این تنظیم توسط کاربر دیگری تغییر کرده است. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.",
          );
        }
      } else {
        // رکورد تنبل ساخته می‌شود؛ نسخه مورد انتظار برای کلید بدون رکورد صفر است.
        if (item.version !== 0) {
          throw new DomainError(
            "SETTING_VERSION_CONFLICT",
            "این تنظیم توسط کاربر دیگری تغییر کرده است. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.",
          );
        }
        try {
          await tx.systemSetting.create({
            data: { key: item.definition.key, value: item.value, version: 1, updatedById: actor.userId },
          });
        } catch (error) {
          // دو نویسنده هم‌زمان روی کلیدی که هنوز رکورد ندارد، هر دو به این شاخه می‌رسند؛ بازنده
          // نقض کلید یکتا می‌گیرد. این دقیقاً همان تعارض نسخه است (نسخه صفرِ فرستنده کهنه شده)
          // و باید ۴۰۹ بدهد، نه ۵۰۰ خام.
          if (isUniqueViolation(error)) {
            throw new DomainError(
              "SETTING_VERSION_CONFLICT",
              "این تنظیم توسط کاربر دیگری تغییر کرده است. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.",
            );
          }
          throw error;
        }
      }
    }
  });

  for (const item of prepared) {
    invalidateSettingsCache(item.definition.key);
    await logAudit({
      actorUserId: actor.userId,
      action: "setting.changed",
      entityType: "SystemSetting",
      entityId: item.definition.key,
      beforeJson: { key: item.definition.key, value: (beforeByKey.get(item.definition.key)?.value ?? item.definition.defaultValue) as never },
      afterJson: { key: item.definition.key, value: item.value },
    });
  }
}

/** بازگرداندن به پیش‌فرض = حذف رکورد، تا دوباره از رجیستری خوانده شود. */
export async function resetSetting(key: string, version: number, actor: ActorContext): Promise<void> {
  const definition = getSettingDefinition(key);
  if (envValueFor(definition) !== null) {
    throw new DomainError("SETTING_ENV_LOCKED", `«${definition.labelFa}» با متغیر محیطی قفل شده است.`);
  }

  const existing = await prisma.systemSetting.findUnique({ where: { key } });
  if (!existing) return; // از قبل پیش‌فرض است — عملیات بی‌اثر

  const deleted = await prisma.systemSetting.deleteMany({ where: { key, version } });
  if (deleted.count === 0) {
    throw new DomainError("SETTING_VERSION_CONFLICT", "این تنظیم توسط کاربر دیگری تغییر کرده است.");
  }

  invalidateSettingsCache(key);
  await logAudit({
    actorUserId: actor.userId,
    action: "setting.reset",
    entityType: "SystemSetting",
    entityId: key,
    beforeJson: { key, value: existing.value as never },
    afterJson: { key, value: definition.defaultValue },
  });
}
