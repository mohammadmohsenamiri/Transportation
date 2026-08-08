import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import {
  archiveMission,
  completeMission,
  failMission,
  reopenMission,
  unarchiveMission,
} from "../src/server/services/mission-service";
import { DomainError } from "../src/lib/errors/domain-error";
import { RoleCode } from "../src/lib/permissions/roles";
import type { ActorContext } from "../src/server/services/permission-service";

/**
 * راستی‌آزمایی سرویس‌های چرخه عمر روی DB واقعی، پیش از ساختن لایه API روی آن‌ها.
 *
 * یک مأموریت `SCHEDULED` موجود را برمی‌دارد، کل چرخه را روی آن می‌راند و در پایان با بازگشایی و
 * لغو، وضعیت را به جایی برمی‌گرداند که مأموریت دیگر در نمای عملیاتی زنده ظاهر نشود.
 * ⚠️ فقط برای محیط توسعه.
 */
async function main() {
  const actorUser = await prisma.user.findFirst({
    where: { username: "e2e_admin" },
    include: { roles: { include: { role: true } } },
  });
  if (!actorUser) throw new Error("کاربر e2e_admin یافت نشد.");

  const actor: ActorContext = {
    userId: actorUser.id,
    username: actorUser.username,
    roles: actorUser.roles.map((link) => link.role.code as RoleCode),
  };

  const mission = await prisma.mission.findFirst({
    where: { persistedStatus: "SCHEDULED", deletedAt: null, startAt: { lt: new Date() } },
    orderBy: { startAt: "desc" },
  });
  if (!mission) throw new Error("هیچ مأموریت SCHEDULED با زمان شروع گذشته یافت نشد.");

  console.log(`مأموریت آزمایشی: ${mission.code} (version=${mission.version})`);

  // 1) تکمیل
  const completed = await completeMission(
    mission.id,
    { version: mission.version, actualArrivalAt: new Date() },
    actor,
  );
  console.log(`  تکمیل  → ${completed.persistedStatus}/${completed.displayStatus} v${completed.version} انحراف=${completed.arrivalVarianceMinutes}`);

  // 2) تعارض نسخه روی گذاری که *مجاز* است — با توکن کهنه روی مأموریت تکمیل‌شده، بایگانی مجاز
  //    است ولی نسخه کهنه باید آن را رد کند. این تنها راه اثبات جدا بودن دو گارد است.
  try {
    await archiveMission(mission.id, mission.version, actor);
    console.error("  ✗ تعارض نسخه تشخیص داده نشد");
  } catch (error) {
    const code = error instanceof DomainError ? error.code : "?";
    console.log(`  بایگانی با نسخه کهنه (گذار مجاز) → ${code}`);
  }

  // 3) بایگانی و خروج از بایگانی
  const archived = await archiveMission(mission.id, completed.version, actor);
  console.log(`  بایگانی → ${archived.persistedStatus} (پیش از بایگانی: ${archived.statusBeforeArchive}) v${archived.version}`);

  const unarchived = await unarchiveMission(mission.id, archived.version, actor);
  console.log(`  خروج از بایگانی → ${unarchived.persistedStatus} v${unarchived.version}`);

  // 4) بازگشایی، سپس شکست
  const reopened = await reopenMission(
    mission.id,
    { version: unarchived.version, reopenReason: "راستی‌آزمایی خودکار چرخه عمر" },
    actor,
  );
  console.log(`  بازگشایی → ${reopened.persistedStatus} تعداد=${reopened.reopenCount} رسیدن‌واقعی=${reopened.actualArrivalAt}`);

  const failed = await failMission(
    mission.id,
    {
      version: reopened.version,
      failedAt: new Date(),
      failureReason: "راستی‌آزمایی خودکار — این مأموریت واقعی نیست",
      failureClassification: "OTHER",
    },
    actor,
  );
  console.log(`  شکست  → ${failed.persistedStatus}/${failed.displayStatus} v${failed.version}`);

  // 5) گذار نامعتبر
  try {
    await completeMission(mission.id, { version: failed.version, actualArrivalAt: new Date() }, actor);
    console.error("  ✗ گذار نامعتبر رد نشد");
  } catch (error) {
    const code = error instanceof DomainError ? error.code : "?";
    console.log(`  تکمیلِ مأموریت ناموفق → ${code}`);
  }

  const shipments = await prisma.missionShipment.findMany({
    where: { missionId: mission.id },
    include: { shipment: { select: { status: true } } },
  });
  console.log(`  مرسوله‌ها: ${shipments.map((s) => `${s.shipment.status}/فعال=${s.isActiveAssignment}`).join(" · ") || "ندارد"}`);

  await prisma.$disconnect();
}

main();
