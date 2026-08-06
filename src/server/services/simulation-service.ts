import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors/domain-error";
import {
  simulateMissionPosition,
  type MissionSimulationResult,
  type MissionSnapshot,
  type SimulationRoutePoint,
} from "@/lib/domain/mission-simulation";

/**
 * لایه سرویس فاز ۹ — تنها فایل این فاز که Prisma را مستقیم فراخوانی می‌کند (07-DATABASE.md §3).
 * موتور شبیه‌سازی (mission-simulation.ts) کاملاً pure و بدون I/O باقی می‌ماند.
 */
export async function getMissionSimulation(missionId: string, viewTime: Date): Promise<MissionSimulationResult> {
  const mission = await prisma.mission.findFirst({
    where: { id: missionId, deletedAt: null },
    include: {
      route: {
        include: { points: { orderBy: { sequence: "asc" } } },
      },
    },
  });

  if (!mission) {
    throw new DomainError("MISSION_NOT_FOUND", "مأموریت یافت نشد.");
  }

  let routePoints: SimulationRoutePoint[] | undefined;
  if (mission.routeId) {
    // پین‌شدن نسخه مسیر از طریق FK تضمین می‌شود (ADR-P9-08)؛ این فقط یک assertion دفاعی است.
    if (!mission.route || mission.route.version !== mission.routeVersion) {
      throw new DomainError("SIMULATION_ROUTE_SNAPSHOT_MISSING", "نسخه مسیر ثبت‌شده روی مأموریت یافت نشد.");
    }
    routePoints = mission.route.points.map((p) => ({
      sequence: p.sequence,
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      cumulativeDistanceMeters: Number(p.cumulativeDistanceMeters),
    }));
  }

  const snapshot: MissionSnapshot = {
    startAt: mission.startAt,
    estimatedArrivalAt: mission.estimatedArrivalAt,
    speedKmh: Number(mission.speedSnapshotKmh),
    persistedStatus: mission.persistedStatus,
    cancelledAt: mission.cancelledAt,
    origin: { latitude: Number(mission.originLatitude), longitude: Number(mission.originLongitude) },
    destination: { latitude: Number(mission.destinationLatitude), longitude: Number(mission.destinationLongitude) },
    routePoints,
  };

  return simulateMissionPosition(snapshot, viewTime);
}
