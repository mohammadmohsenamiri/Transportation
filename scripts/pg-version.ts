import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/** ابزار تشخیصی — نسخه PostgreSQL برای تصمیم‌گیری درباره محدودیت‌های ALTER TYPE. */
async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const rows = await prisma.$queryRaw<{ version: string }[]>`SELECT version()`;
    console.log(rows[0]?.version ?? "unknown");
  } finally {
    await prisma.$disconnect();
  }
}

main();
