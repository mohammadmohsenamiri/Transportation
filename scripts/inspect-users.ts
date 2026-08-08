import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/** ابزار تشخیصی موقت — وضعیت ورود همه کاربران را نشان می‌دهد. */
async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const users = await prisma.user.findMany({
      where: { username: { not: { startsWith: "e2e_u_" } } },
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: "asc" },
    });

    for (const user of users) {
      const blockers: string[] = [];
      if (!user.isActive) blockers.push("isActive=false");
      if (user.suspendedAt) blockers.push(`suspendedAt=${user.suspendedAt.toISOString()}`);
      if (user.deletedAt) blockers.push(`deletedAt=${user.deletedAt.toISOString()}`);

      console.log(
        [
          user.username.padEnd(18),
          user.roles.map((link) => link.role.code).join(",").padEnd(30),
          blockers.length === 0 ? "OK — می‌تواند وارد شود" : `BLOCKED: ${blockers.join(" | ")}`,
          user.mustChangePassword ? "(mustChangePassword)" : "",
        ].join("  "),
      );
    }

    console.log(`\nمجموع: ${users.length} کاربر (کاربران موقت تست e2e_u_* نادیده گرفته شدند)`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
