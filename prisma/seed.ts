import "dotenv/config";
import { PrismaClient, RoleCode } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/security/password";

const ROLE_LABELS: Record<RoleCode, string> = {
  MISSION_PLANNER: "برنامه‌ریز مأموریت",
  STATUS_VIEWER: "بیننده وضعیت",
  ADMIN: "مدیر سامانه",
};

async function main() {
  const adminUsername = process.env.SEED_ADMIN_USERNAME;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    throw new Error("SEED_ADMIN_USERNAME و SEED_ADMIN_PASSWORD در .env تنظیم نشده‌اند.");
  }
  if (adminPassword.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD باید حداقل ۸ کاراکتر باشد.");
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    for (const code of Object.values(RoleCode)) {
      await prisma.role.upsert({
        where: { code },
        update: { name: ROLE_LABELS[code] },
        create: { code, name: ROLE_LABELS[code] },
      });
    }

    const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: "ADMIN" } });
    const passwordHash = await hashPassword(adminPassword);

    const admin = await prisma.user.upsert({
      where: { username: adminUsername },
      update: {},
      create: {
        username: adminUsername,
        passwordHash,
        mustChangePassword: true,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
      update: {},
      create: { userId: admin.id, roleId: adminRole.id },
    });

    console.log(`seed کامل شد: نقش‌ها ایجاد/به‌روزرسانی شدند و کاربر Admin «${adminUsername}» آماده است.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
