import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * بازگرداندن دسترسی ورود یک کاربر از خط فرمان.
 *
 * مسیر اضطراری است، نه جایگزین `/system/users`: وقتی *همه* مدیران غیرفعال شده‌اند هیچ‌کس نمی‌تواند
 * وارد شود تا از رابط کاربری وضعیت را برگرداند. مثل هر تغییر دیگری audit می‌شود، ولی چون هیچ actor
 * احرازهویت‌شده‌ای پشتش نیست با `actorUserId: null` ثبت می‌شود.
 *
 * استفاده: node node_modules/tsx/dist/cli.mjs scripts/reactivate-user.ts <username>
 */
async function main() {
  const username = process.argv[2];
  if (!username) {
    throw new Error("نام کاربری الزامی است: reactivate-user.ts <username>");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const before = await prisma.user.findUnique({ where: { username } });
    if (!before) throw new Error(`کاربر «${username}» یافت نشد.`);

    const after = await prisma.user.update({
      where: { username },
      data: {
        isActive: true,
        suspendedAt: null,
        suspensionReason: null,
        deletedAt: null,
        version: { increment: 1 },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: null,
        action: "user.reactivated_via_cli",
        entityType: "User",
        entityId: after.id,
        beforeJson: {
          isActive: before.isActive,
          suspendedAt: before.suspendedAt?.toISOString() ?? null,
          deletedAt: before.deletedAt?.toISOString() ?? null,
        },
        afterJson: { isActive: true, suspendedAt: null, deletedAt: null },
      },
    });

    console.log(`کاربر «${username}» فعال شد. رمز عبور تغییر نکرده است.`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
