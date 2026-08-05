import { expect, test, type Page } from "@playwright/test";
import {
  E2E_ADMIN_USERNAME,
  E2E_ADMIN_PASSWORD,
  E2E_VIEWER_USERNAME,
  E2E_VIEWER_PASSWORD,
  E2E_PLANNER_USERNAME,
  E2E_PLANNER_PASSWORD,
} from "./global-setup";

async function loginAs(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("نام کاربری").fill(username);
  await page.getByLabel("رمز عبور").fill(password);
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

interface MissionFixtures {
  warehouseId: string;
  destinationWarehouseId: string;
  cargoTypeId: string;
  shipmentIds: string[];
  vehicleId: string;
  vehicleIdentifier: string;
}

async function buildMissionFixtures(page: Page, prefix: string, shipmentCount = 2): Promise<MissionFixtures> {
  async function createOrgUnit(data: Record<string, unknown>): Promise<string> {
    const response = await page.request.post("/api/v1/organization-units", { data });
    expect(response.status()).toBe(201);
    return (await response.json()).id as string;
  }

  const countryId = await createOrgUnit({ code: `${prefix}-IR`, name: `کشور ${prefix}`, level: "COUNTRY_OFFICE", parentId: null });
  const groupId = await createOrgUnit({ code: `${prefix}-GR`, name: `گروه ${prefix}`, level: "GROUP_OFFICE", parentId: countryId });
  const distributorId = await createOrgUnit({
    code: `${prefix}-DI`,
    name: `توزیع ${prefix}`,
    level: "DISTRIBUTOR_OFFICE",
    parentId: groupId,
  });
  const warehouseId = await createOrgUnit({
    code: `${prefix}-W1`,
    name: `انبار مبدأ ${prefix}`,
    level: "WAREHOUSE",
    parentId: distributorId,
    latitude: 35.6892,
    longitude: 51.389,
  });
  const destinationWarehouseId = await createOrgUnit({
    code: `${prefix}-W2`,
    name: `انبار مقصد ${prefix}`,
    level: "WAREHOUSE",
    parentId: distributorId,
    latitude: 35.84,
    longitude: 50.9391,
  });

  const cargoTypeResponse = await page.request.post("/api/v1/cargo-types", { data: { name: `بار ${prefix}` } });
  expect(cargoTypeResponse.status()).toBe(201);
  const cargoTypeId = (await cargoTypeResponse.json()).id as string;

  const shipmentIds: string[] = [];
  for (let i = 0; i < shipmentCount; i += 1) {
    const response = await page.request.post("/api/v1/shipments", {
      data: {
        title: `محموله ${prefix}-${i}`,
        cargoTypeId,
        originWarehouseId: warehouseId,
        destinationMode: "ORGANIZATION_UNIT",
        destinationOrganizationUnitId: destinationWarehouseId,
      },
    });
    expect(response.status()).toBe(201);
    shipmentIds.push((await response.json()).id as string);
  }

  const vehicleTypeResponse = await page.request.post("/api/v1/vehicle-types", { data: { name: `نوع خودرو ${prefix}` } });
  expect(vehicleTypeResponse.status()).toBe(201);
  const vehicleTypeId = (await vehicleTypeResponse.json()).id as string;

  const vehicleIdentifier = `${prefix}-VH`;
  const vehicleResponse = await page.request.post("/api/v1/vehicles", {
    data: {
      identifier: vehicleIdentifier,
      vehicleTypeId,
      fuelTankLiters: 80,
      avgConsumptionPer100Km: 25,
      avgSpeedKmh: 80,
      readiness: "READY",
    },
  });
  expect(vehicleResponse.status()).toBe(201);
  const vehicleId = (await vehicleResponse.json()).id as string;

  return { warehouseId, destinationWarehouseId, cargoTypeId, shipmentIds, vehicleId, vehicleIdentifier };
}

function futureIso(secondsFromNow: number): string {
  return new Date(Date.now() + secondsFromNow * 1000).toISOString();
}

test.describe("مأموریت‌ها — Phase 7", () => {
  test("Planner دو مرسوله هم‌مقصد را به یک خودرو تخصیص و مأموریت را منتشر می‌کند", async ({ page }, testInfo) => {
    const prefix = `D${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const fixtures = await buildMissionFixtures(page, prefix);
    await page.context().clearCookies();

    await loginAs(page, E2E_PLANNER_USERNAME, E2E_PLANNER_PASSWORD);
    await page.goto("/missions/new");

    // مرحله ۰: انتخاب هر دو مرسوله
    for (let i = 0; i < fixtures.shipmentIds.length; i += 1) {
      await page.getByText(`محموله ${prefix}-${i}`, { exact: true }).click();
    }
    await page.getByRole("button", { name: "بعدی" }).click();

    // مرحله ۱: مبدأ/مقصد (فقط بازبینی)
    await expect(page.getByText(`انبار مبدأ ${prefix}`)).toBeVisible();
    await expect(page.getByText(`انبار مقصد ${prefix}`)).toBeVisible();
    await page.getByRole("button", { name: "بعدی" }).click();

    // مرحله ۲: خودرو
    await page.getByText(fixtures.vehicleIdentifier, { exact: true }).click();
    await page.getByRole("button", { name: "بعدی" }).click();

    // مرحله ۳: زمان حرکت (پیش‌فرض فردا ۰۸:۰۰ — معتبر است)
    await page.getByRole("button", { name: "بعدی" }).click();

    // مرحله ۴: مسیر (بدون مسیر)
    await page.getByRole("button", { name: "بعدی" }).click();

    // مرحله ۵: بازبینی و انتشار
    await page.getByRole("button", { name: "محاسبه دوباره" }).click();
    await expect(page.getByText("فاصله", { exact: false }).first()).toBeVisible();
    await page.getByRole("button", { name: "انتشار مأموریت" }).click();

    await expect.poll(() => page.url(), { timeout: 15_000 }).not.toContain("/missions/new");
    await expect(page.getByText("در انتظار حرکت")).toBeVisible();

    const missionId = page.url().split("/").pop() as string;
    const mission = await (await page.request.get(`/api/v1/missions/${missionId}`)).json();
    expect(mission.persistedStatus).toBe("SCHEDULED");
    expect(mission.shipments).toHaveLength(2);

    for (const shipmentId of fixtures.shipmentIds) {
      const shipment = await (await page.request.get(`/api/v1/shipments/${shipmentId}`)).json();
      expect(shipment.status).toBe("WAITING_FOR_DISPATCH");
    }
  });

  test("مرسوله‌های ناسازگار، زمان گذشته و خودروی خارج‌سرویس رد می‌شوند", async ({ page }, testInfo) => {
    const prefix = `V${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);

    const fixturesA = await buildMissionFixtures(page, `${prefix}A`, 1);
    // مبدأ همان انبار مبدأ fixture است اما مقصد آزاد و متفاوت — برای آزمون ناسازگاری مرسوله‌ها
    const otherShipmentResponse = await page.request.post("/api/v1/shipments", {
      data: {
        title: `محموله مقصد متفاوت ${prefix}`,
        cargoTypeId: fixturesA.cargoTypeId,
        originWarehouseId: fixturesA.warehouseId,
        destinationMode: "COORDINATES",
        destinationTitle: "مقصد آزاد",
        destinationLatitude: 29,
        destinationLongitude: 53,
      },
    });
    expect(otherShipmentResponse.status()).toBe(201);
    const otherShipmentId = (await otherShipmentResponse.json()).id as string;

    const incompatibleResponse = await page.request.post("/api/v1/missions", {
      data: {
        shipmentIds: [fixturesA.shipmentIds[0], otherShipmentId],
        vehicleId: fixturesA.vehicleId,
        startAt: futureIso(3600),
      },
    });
    expect(incompatibleResponse.status()).toBe(422);
    const incompatibleBody = await incompatibleResponse.json();
    expect(incompatibleBody.error.code).toBe("MISSION_SHIPMENTS_INCOMPATIBLE");

    const pastTimeResponse = await page.request.post("/api/v1/missions", {
      data: {
        shipmentIds: [fixturesA.shipmentIds[0]],
        vehicleId: fixturesA.vehicleId,
        startAt: futureIso(-3600),
      },
    });
    expect(pastTimeResponse.status()).toBe(422);
    const pastTimeBody = await pastTimeResponse.json();
    expect(pastTimeBody.error.code).toBe("MISSION_INVALID_START_TIME");

    const draftResponse = await page.request.post("/api/v1/missions", {
      data: {
        shipmentIds: [fixturesA.shipmentIds[0]],
        vehicleId: fixturesA.vehicleId,
        startAt: futureIso(3600),
      },
    });
    expect(draftResponse.status()).toBe(201);
    const draftId = (await draftResponse.json()).id as string;

    await page.request.patch(`/api/v1/vehicles/${fixturesA.vehicleId}`, { data: { readiness: "OUT_OF_SERVICE" } });
    const publishResponse = await page.request.post(`/api/v1/missions/${draftId}/publish`);
    expect(publishResponse.status()).toBe(422);
    const publishBody = await publishResponse.json();
    expect(publishBody.error.code).toBe("MISSION_VEHICLE_NOT_READY");
  });

  test("تداخل زمانی خودرو در انتشار رد می‌شود", async ({ page }, testInfo) => {
    const prefix = `O${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const fixtures = await buildMissionFixtures(page, prefix, 2);

    const missionAResponse = await page.request.post("/api/v1/missions", {
      data: { shipmentIds: [fixtures.shipmentIds[0]], vehicleId: fixtures.vehicleId, startAt: futureIso(3600) },
    });
    expect(missionAResponse.status()).toBe(201);
    const missionAId = (await missionAResponse.json()).id as string;
    const publishA = await page.request.post(`/api/v1/missions/${missionAId}/publish`);
    expect(publishA.status()).toBe(200);

    // مأموریت دوم با همان خودرو و زمان شروع هم‌پوشان (کمی بعد از شروع مأموریت اول، پیش از رسیدن آن)
    const missionBResponse = await page.request.post("/api/v1/missions", {
      data: { shipmentIds: [fixtures.shipmentIds[1]], vehicleId: fixtures.vehicleId, startAt: futureIso(3660) },
    });
    expect(missionBResponse.status()).toBe(201);
    const missionBId = (await missionBResponse.json()).id as string;
    const publishB = await page.request.post(`/api/v1/missions/${missionBId}/publish`);
    expect(publishB.status()).toBe(409);
    const publishBBody = await publishB.json();
    expect(publishBBody.error.code).toBe("MISSION_VEHICLE_TIME_CONFLICT");
  });

  test("لغو مأموریت مرسوله‌ها را آزاد می‌کند و تکثیر مأموریت پیش‌نویس جدید می‌سازد", async ({ page }, testInfo) => {
    const prefix = `C${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const fixtures = await buildMissionFixtures(page, prefix, 1);

    const createResponse = await page.request.post("/api/v1/missions", {
      data: { shipmentIds: fixtures.shipmentIds, vehicleId: fixtures.vehicleId, startAt: futureIso(3600) },
    });
    const missionId = (await createResponse.json()).id as string;
    await page.request.post(`/api/v1/missions/${missionId}/publish`);

    await page.goto(`/missions/${missionId}`);
    await page.getByRole("button", { name: "لغو مأموریت" }).click();
    const cancelDialog = page.getByRole("alertdialog", { name: "لغو مأموریت" });
    await cancelDialog.getByLabel("دلیل لغو").fill(`لغو آزمایشی ${prefix}`);
    await cancelDialog.getByRole("button", { name: "لغو مأموریت" }).click();
    await expect(page.getByText("لغوشده")).toBeVisible();

    const shipment = await (await page.request.get(`/api/v1/shipments/${fixtures.shipmentIds[0]}`)).json();
    expect(shipment.status).toBe("DRAFT");

    await page.getByRole("button", { name: "تکثیر" }).click();
    await page.getByRole("dialog", { name: "تکثیر مأموریت" }).getByRole("button", { name: "تکثیر" }).click();

    await expect.poll(() => page.url(), { timeout: 15_000 }).not.toContain(missionId);
    const newMissionId = page.url().split("/").pop() as string;
    const newMission = await (await page.request.get(`/api/v1/missions/${newMissionId}`)).json();
    expect(newMission.persistedStatus).toBe("DRAFT");
    expect(newMission.duplicatedFromMissionId).toBe(missionId);
    expect(newMission.shipments.map((s: { id: string }) => s.id)).toContain(fixtures.shipmentIds[0]);
  });

  test("مأموریت پیش‌نویس قابل حذف است و پس از حذف یافت نمی‌شود", async ({ page }, testInfo) => {
    const prefix = `X${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const fixtures = await buildMissionFixtures(page, prefix, 1);

    const createResponse = await page.request.post("/api/v1/missions", {
      data: { shipmentIds: fixtures.shipmentIds, vehicleId: fixtures.vehicleId, startAt: futureIso(3600) },
    });
    expect(createResponse.status()).toBe(201);
    const missionId = (await createResponse.json()).id as string;

    const deleteResponse = await page.request.delete(`/api/v1/missions/${missionId}`);
    expect(deleteResponse.status()).toBe(204);

    const afterDelete = await page.request.get(`/api/v1/missions/${missionId}`);
    expect(afterDelete.status()).toBe(404);
  });

  test("نقش بیننده وضعیت از مأموریت‌ها کاملاً محروم است", async ({ page }) => {
    await loginAs(page, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD);

    await page.goto("/missions");
    await expect(page.getByText("دسترسی مجاز نیست")).toBeVisible();

    const listResponse = await page.request.get("/api/v1/missions");
    expect(listResponse.status()).toBe(403);
  });
});
