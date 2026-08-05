import "dotenv/config";
import { PrismaClient, RoleCode } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../../src/lib/security/password";

async function upsertUserWithRole(
  username: string,
  password: string,
  mustChangePassword: boolean,
  roleCode: RoleCode,
) {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const role = await prisma.role.upsert({
      where: { code: roleCode },
      update: {},
      create: { code: roleCode, name: roleCode },
    });

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.upsert({
      where: { username },
      update: { passwordHash, mustChangePassword, isActive: true },
      create: { username, passwordHash, mustChangePassword },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const [, , mode, ...args] = process.argv;

  if (mode === "admin") {
    await upsertUserWithRole("e2e_admin", "E2eAdmin123!", false, RoleCode.ADMIN);
    return;
  }

  if (mode === "viewer") {
    await upsertUserWithRole("e2e_viewer", "E2eViewer123!", false, RoleCode.STATUS_VIEWER);
    return;
  }

  if (mode === "planner") {
    await upsertUserWithRole("e2e_planner", "E2ePlanner123!", false, RoleCode.MISSION_PLANNER);
    return;
  }

  if (mode === "force-change") {
    const [username, password] = args;
    if (!username || !password) {
      throw new Error("force-change نیازمند username و password است.");
    }
    await upsertUserWithRole(username, password, true, RoleCode.STATUS_VIEWER);
    return;
  }

  throw new Error(`mode ناشناخته: ${mode}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
