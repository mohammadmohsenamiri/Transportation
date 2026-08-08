import { prisma } from "@/lib/db/prisma";
import { simulateMissionPosition, type MissionSnapshot, type SimulationRoutePoint } from "@/lib/domain/mission-simulation";
import type { MissionDisplayStatus } from "@/lib/domain/mission-rules";
import { resolveIcon } from "@/lib/domain/icon-rules";
import { usableIconIds } from "@/server/services/icon-service";

export interface MapSceneMission {
  missionId: string;
  code: string;
  vehicleId: string;
  vehicleIdentifier: string;
  vehicleTypeName: string;
  status: MissionDisplayStatus;
  position: { latitude: number; longitude: number };
  bearingDegrees: number | null;
  progressRatio: number;
  isFallbackDirect: boolean;
  isEstimated: true;
  startAt: string;
  estimatedArrivalAt: string;
  remainingSeconds: number;
  originTitle: string;
  originLatitude: number;
  originLongitude: number;
  destinationTitle: string;
  destinationLatitude: number;
  destinationLongitude: number;
  routeId: string | null;
  cargoTypeNames: string[];
  shipmentCount: number;
  shipmentTrackingCodes: string[];
  /**
   * Phase 14 — نشانی محتوای آیکن خودرو، یا `null` وقتی آیکنی تعیین نشده باشد. نقشه در حالت
   * `null` به نشانگر دایره‌ای پیش‌فرض برمی‌گردد، پس نبود آیکن هرگز صحنه را خالی نمی‌کند (BR-I05).
   */
  iconUrl: string | null;
}

/**
 * Phase 10 — پرس‌وجوی دسته‌ای «صحنه نقشه»: تمام مأموریت‌های SCHEDULED را در یک رفت‌وبرگشت DB
 * می‌خواند و برای هر کدام موتور شبیه‌سازی فاز ۹ (simulateMissionPosition، بدون تغییر) را
 * فراخوانی می‌کند. این فایل تنها منطق «دسته‌ای‌سازی» را اضافه می‌کند که فاز ۹ آگاهانه به فاز ۱۰
 * موکول کرده بود (docs/phase-09-simulation-engine/11-OUT_OF_SCOPE.md, item O9)؛ هیچ محاسبه
 * موقعیت/فاصله/ETA/bearing در این فایل تکرار نمی‌شود.
 */
export async function getMapScene(viewTime: Date): Promise<MapSceneMission[]> {
  // یک بار برای کل صحنه خوانده می‌شود، نه به‌ازای هر مأموریت: تعیین آیکن یک تابع محض روی همین
  // مجموعه است، پس افزودن آیکن به فاز ۱۴ یک پرس‌وجوی ثابت اضافه می‌کند، نه N تا.
  const [missions, usableIcons] = await Promise.all([
    prisma.mission.findMany({
      where: { persistedStatus: "SCHEDULED", deletedAt: null },
      include: {
        vehicle: { include: { vehicleType: true } },
        route: { include: { points: { orderBy: { sequence: "asc" } } } },
        shipments: {
          where: { isActiveAssignment: true },
          include: { shipment: { include: { cargoType: true } } },
        },
      },
      orderBy: { startAt: "asc" },
    }),
    usableIconIds(),
  ]);

  return missions.map((mission) => {
    let routePoints: SimulationRoutePoint[] | undefined;
    if (mission.routeId && mission.route) {
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

    const simulation = simulateMissionPosition(snapshot, viewTime);
    const cargoTypeNames = [...new Set(mission.shipments.map((link) => link.shipment.cargoType.name))];
    const shipmentTrackingCodes = mission.shipments.map((link) => link.shipment.trackingCode);

    // خودرو بر نوع خودرو اولویت دارد؛ آیکن حذف‌شده یا غیرفعال نادیده گرفته می‌شود و null می‌ماند.
    const iconId = resolveIcon(mission.vehicle.iconAssetId, mission.vehicle.vehicleType.iconAssetId, usableIcons);

    return {
      missionId: mission.id,
      code: mission.code,
      vehicleId: mission.vehicleId,
      vehicleIdentifier: mission.vehicle.identifier,
      vehicleTypeName: mission.vehicle.vehicleType.name,
      status: simulation.status,
      position: simulation.position,
      bearingDegrees: simulation.bearingDegrees,
      progressRatio: simulation.progressRatio,
      isFallbackDirect: simulation.isFallbackDirect,
      isEstimated: true,
      startAt: mission.startAt.toISOString(),
      estimatedArrivalAt: simulation.estimatedArrivalAt.toISOString(),
      remainingSeconds: simulation.remainingSeconds,
      originTitle: mission.originTitle,
      originLatitude: Number(mission.originLatitude),
      originLongitude: Number(mission.originLongitude),
      destinationTitle: mission.destinationTitle,
      destinationLatitude: Number(mission.destinationLatitude),
      destinationLongitude: Number(mission.destinationLongitude),
      routeId: mission.routeId,
      cargoTypeNames,
      shipmentCount: mission.shipments.length,
      shipmentTrackingCodes,
      iconUrl: iconId ? `/api/v1/icons/${iconId}/content` : null,
    };
  });
}
