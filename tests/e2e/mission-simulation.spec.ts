import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD } from "./global-setup";

async function loginAs(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("نام کاربری").fill(username);
  await page.getByLabel("رمز عبور").fill(password);
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

function futureIso(secondsFromNow: number): string {
  return new Date(Date.now() + secondsFromNow * 1000).toISOString();
}

interface SimulationFixtures {
  warehouseId: string;
  destinationWarehouseId: string;
  shipmentId: string;
  vehicleId: string;
}

async function buildSimulationFixtures(page: Page, prefix: string): Promise<SimulationFixtures> {
  async function createOrgUnit(data: Record<string, unknown>): Promise<string> {
    const response = await page.request.post("/api/v1/organization-units", { data });
    expect(response.status()).toBe(201);
    return (await response.json()).id as string;
  }

  const countryId = await createOrgUnit({ code: `${prefix}-IR`, name: `کشور ${prefix}`, level: "COUNTRY_OFFICE", parentId: null });
  const groupId = await createOrgUnit({ code: `${prefix}-GR`, name: `گروه ${prefix}`, level: "GROUP_OFFICE", parentId: countryId });
  const distributorId = await createOrgUnit({ code: `${prefix}-DI`, name: `توزیع ${prefix}`, level: "DISTRIBUTOR_OFFICE", parentId: groupId });
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

  const cargoTypeResponse = await page.request.post("/api/v1/cargo-types", { data: { name: `بار شبیه‌سازی ${prefix}` } });
  expect(cargoTypeResponse.status()).toBe(201);
  const cargoTypeId = (await cargoTypeResponse.json()).id as string;

  const shipmentResponse = await page.request.post("/api/v1/shipments", {
    data: {
      title: `محموله شبیه‌سازی ${prefix}`,
      cargoTypeId,
      originWarehouseId: warehouseId,
      destinationMode: "ORGANIZATION_UNIT",
      destinationOrganizationUnitId: destinationWarehouseId,
    },
  });
  expect(shipmentResponse.status()).toBe(201);
  const shipmentId = (await shipmentResponse.json()).id as string;

  const vehicleTypeResponse = await page.request.post("/api/v1/vehicle-types", { data: { name: `نوع خودرو شبیه‌سازی ${prefix}` } });
  expect(vehicleTypeResponse.status()).toBe(201);
  const vehicleTypeId = (await vehicleTypeResponse.json()).id as string;

  const vehicleResponse = await page.request.post("/api/v1/vehicles", {
    data: {
      identifier: `${prefix}-VH`,
      vehicleTypeId,
      fuelTankLiters: 80,
      avgConsumptionPer100Km: 25,
      avgSpeedKmh: 80,
      readiness: "READY",
    },
  });
  expect(vehicleResponse.status()).toBe(201);
  const vehicleId = (await vehicleResponse.json()).id as string;

  return { warehouseId, destinationWarehouseId, shipmentId, vehicleId };
}

async function publishMission(page: Page, fixtures: SimulationFixtures, routeId: string | null = null): Promise<string> {
  const createResponse = await page.request.post("/api/v1/missions", {
    data: { shipmentIds: [fixtures.shipmentId], vehicleId: fixtures.vehicleId, startAt: futureIso(3600), routeId },
  });
  expect(createResponse.status()).toBe(201);
  const missionId = (await createResponse.json()).id as string;
  const publishResponse = await page.request.post(`/api/v1/missions/${missionId}/publish`);
  expect(publishResponse.status()).toBe(200);
  return missionId;
}

test.describe("شبیه‌سازی موقعیت مأموریت — Phase 9", () => {
  test("I1: مسیر مستقیم (بدون route) موقعیت و پیشرفت معقول برمی‌گرداند", async ({ page }, testInfo) => {
    const prefix = `S${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const fixtures = await buildSimulationFixtures(page, prefix);
    const missionId = await publishMission(page, fixtures);

    const mission = await (await page.request.get(`/api/v1/missions/${missionId}`)).json();
    const midTime = new Date((new Date(mission.startAt).getTime() + new Date(mission.estimatedArrivalAt).getTime()) / 2).toISOString();

    const response = await page.request.get(`/api/v1/missions/${missionId}/simulate?viewTime=${encodeURIComponent(midTime)}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("IN_PROGRESS");
    expect(body.isFallbackDirect).toBe(true);
    expect(body.isEstimated).toBe(true);
    expect(body.progressRatio).toBeGreaterThan(0);
    expect(body.progressRatio).toBeLessThan(1);
  });

  test("I2: مأموریت با مسیر واقعی روی چندضلعی مسیر حرکت می‌کند (isFallbackDirect=false)", async ({ page }, testInfo) => {
    const prefix = `R${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const fixtures = await buildSimulationFixtures(page, prefix);

    const routeResponse = await page.request.post("/api/v1/routes", {
      data: {
        code: `${prefix}-RT`,
        name: `مسیر شبیه‌سازی ${prefix}`,
        description: null,
        source: "MAP_DRAWING",
        points: [
          { sequence: 1, latitude: 35.6892, longitude: 51.389, label: "مبدأ" },
          { sequence: 2, latitude: 35.75, longitude: 51.2, label: "میانی" },
          { sequence: 3, latitude: 35.84, longitude: 50.9391, label: "مقصد" },
        ],
      },
    });
    expect(routeResponse.status()).toBe(201);
    const routeId = (await routeResponse.json()).id as string;

    const missionId = await publishMission(page, fixtures, routeId);
    const mission = await (await page.request.get(`/api/v1/missions/${missionId}`)).json();
    const midTime = new Date((new Date(mission.startAt).getTime() + new Date(mission.estimatedArrivalAt).getTime()) / 2).toISOString();

    const response = await page.request.get(`/api/v1/missions/${missionId}/simulate?viewTime=${encodeURIComponent(midTime)}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.isFallbackDirect).toBe(false);
    expect(body.status).toBe("IN_PROGRESS");
  });

  test("I3: مأموریت ناموجود ۴۰۴ برمی‌گرداند", async ({ page }) => {
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const response = await page.request.get("/api/v1/missions/00000000-0000-4000-8000-000000000000/simulate");
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("MISSION_NOT_FOUND");
  });

  test("I4: مأموریت پیش‌نویس حذف‌شده پس از حذف یافت نمی‌شود", async ({ page }, testInfo) => {
    const prefix = `D${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const fixtures = await buildSimulationFixtures(page, prefix);

    const createResponse = await page.request.post("/api/v1/missions", {
      data: { shipmentIds: [fixtures.shipmentId], vehicleId: fixtures.vehicleId, startAt: futureIso(3600) },
    });
    const missionId = (await createResponse.json()).id as string;
    const deleteResponse = await page.request.delete(`/api/v1/missions/${missionId}`);
    expect(deleteResponse.status()).toBe(204);

    const response = await page.request.get(`/api/v1/missions/${missionId}/simulate`);
    expect(response.status()).toBe(404);
  });

  test("I5: زمان مشاهده نامعتبر ۴۲۲ برمی‌گرداند", async ({ page }, testInfo) => {
    const prefix = `V${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const fixtures = await buildSimulationFixtures(page, prefix);
    const missionId = await publishMission(page, fixtures);

    const response = await page.request.get(`/api/v1/missions/${missionId}/simulate?viewTime=not-a-date`);
    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("SIMULATION_INVALID_VIEW_TIME");
  });

  test("I6: نبود پارامتر viewTime به زمان اکنون سرور پیش‌فرض می‌شود", async ({ page }, testInfo) => {
    const prefix = `N${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const fixtures = await buildSimulationFixtures(page, prefix);
    const missionId = await publishMission(page, fixtures);

    const before = Date.now();
    const response = await page.request.get(`/api/v1/missions/${missionId}/simulate`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    const echoedViewTime = new Date(body.viewTime).getTime();
    expect(Math.abs(echoedViewTime - before)).toBeLessThan(15_000);
  });

  test("I7: نقش بیننده وضعیت می‌تواند شبیه‌سازی را بخواند", async ({ page }, testInfo) => {
    const prefix = `W${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const fixtures = await buildSimulationFixtures(page, prefix);
    const missionId = await publishMission(page, fixtures);
    await page.context().clearCookies();

    await loginAs(page, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD);
    const response = await page.request.get(`/api/v1/missions/${missionId}/simulate`);
    expect(response.status()).toBe(200);
  });

  test("I8: بدون ورود، درخواست ۴۰۱ رد می‌شود", async ({ page }) => {
    const response = await page.request.get("/api/v1/missions/00000000-0000-4000-8000-000000000000/simulate");
    expect(response.status()).toBe(401);
  });

  test("I9: مأموریت لغوشده در لحظه لغو منجمد می‌ماند", async ({ page }, testInfo) => {
    const prefix = `C${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const fixtures = await buildSimulationFixtures(page, prefix);
    const missionId = await publishMission(page, fixtures);

    const beforeCancel = await (await page.request.get(`/api/v1/missions/${missionId}/simulate`)).json();

    const cancelResponse = await page.request.post(`/api/v1/missions/${missionId}/cancel`, {
      data: { cancellationReason: `لغو آزمایشی شبیه‌سازی ${prefix}` },
    });
    expect(cancelResponse.status()).toBe(200);

    const afterCancel = await (await page.request.get(`/api/v1/missions/${missionId}/simulate`)).json();
    expect(afterCancel.status).toBe("CANCELLED");
    // پس از لغو، پیشرفت هرگز نباید از لحظه لغو فراتر برود — چون هنوز مأموریت شروع نشده (startAt در آینده است)
    // مقدار پیشرفت باید صفر بماند، دقیقاً مثل لحظه پیش از لغو.
    expect(afterCancel.progressRatio).toBeCloseTo(beforeCancel.progressRatio, 6);
  });
});
