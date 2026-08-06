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

async function ensureActiveMapProvider(page: Page, prefix: string) {
  const response = await page.request.post("/api/v1/map-providers", {
    data: {
      name: `${prefix}-provider`,
      kind: "EXTERNAL_XYZ",
      urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "© OpenStreetMap contributors",
      minZoom: 0,
      maxZoom: 19,
      tileSize: 256,
      requiresApiKey: false,
      isDefault: true,
      isEnabled: true,
    },
  });
  expect(response.status()).toBe(201);
}

interface SceneFixtures {
  originWarehouseId: string;
  originWarehouseName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  shipmentId: string;
  vehicleId: string;
  vehicleIdentifier: string;
}

// Deterministic, essentially-unique offset so this test's coordinates don't stack pixel-for-pixel
// on the many other missions the shared dev DB accumulates at the literal default Tehran coords.
function coordJitter(prefix: string): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < prefix.length; i++) hash = (hash * 31 + prefix.charCodeAt(i)) >>> 0;
  return { lat: 3 + (hash % 500) / 100, lng: 3 + ((hash >> 8) % 500) / 100 };
}

async function buildSceneFixtures(page: Page, prefix: string, applyJitter = false): Promise<SceneFixtures> {
  async function createOrgUnit(data: Record<string, unknown>): Promise<string> {
    const response = await page.request.post("/api/v1/organization-units", { data });
    expect(response.status()).toBe(201);
    return (await response.json()).id as string;
  }

  const jitter = applyJitter ? coordJitter(prefix) : { lat: 0, lng: 0 };
  const countryId = await createOrgUnit({ code: `${prefix}-IR`, name: `کشور ${prefix}`, level: "COUNTRY_OFFICE", parentId: null });
  const groupId = await createOrgUnit({ code: `${prefix}-GR`, name: `گروه ${prefix}`, level: "GROUP_OFFICE", parentId: countryId });
  const distributorId = await createOrgUnit({ code: `${prefix}-DI`, name: `توزیع ${prefix}`, level: "DISTRIBUTOR_OFFICE", parentId: groupId });
  const originWarehouseName = `انبار مبدأ صحنه ${prefix}`;
  const originWarehouseId = await createOrgUnit({
    code: `${prefix}-W1`,
    name: originWarehouseName,
    level: "WAREHOUSE",
    parentId: distributorId,
    latitude: 35.6892 + jitter.lat,
    longitude: 51.389 + jitter.lng,
  });
  const destinationWarehouseName = `انبار مقصد صحنه ${prefix}`;
  const destinationWarehouseId = await createOrgUnit({
    code: `${prefix}-W2`,
    name: destinationWarehouseName,
    level: "WAREHOUSE",
    parentId: distributorId,
    latitude: 35.84 + jitter.lat,
    longitude: 50.9391 + jitter.lng,
  });

  const cargoTypeResponse = await page.request.post("/api/v1/cargo-types", { data: { name: `بار صحنه ${prefix}` } });
  expect(cargoTypeResponse.status()).toBe(201);
  const cargoTypeId = (await cargoTypeResponse.json()).id as string;

  const shipmentResponse = await page.request.post("/api/v1/shipments", {
    data: {
      title: `محموله صحنه ${prefix}`,
      cargoTypeId,
      originWarehouseId,
      destinationMode: "ORGANIZATION_UNIT",
      destinationOrganizationUnitId: destinationWarehouseId,
    },
  });
  expect(shipmentResponse.status()).toBe(201);
  const shipmentId = (await shipmentResponse.json()).id as string;

  const vehicleTypeResponse = await page.request.post("/api/v1/vehicle-types", { data: { name: `نوع خودرو صحنه ${prefix}` } });
  expect(vehicleTypeResponse.status()).toBe(201);
  const vehicleTypeId = (await vehicleTypeResponse.json()).id as string;

  const vehicleIdentifier = `${prefix}-VH`;
  const vehicleResponse = await page.request.post("/api/v1/vehicles", {
    data: { identifier: vehicleIdentifier, vehicleTypeId, fuelTankLiters: 80, avgConsumptionPer100Km: 25, avgSpeedKmh: 80, readiness: "READY" },
  });
  expect(vehicleResponse.status()).toBe(201);
  const vehicleId = (await vehicleResponse.json()).id as string;

  return { originWarehouseId, originWarehouseName, destinationWarehouseId, destinationWarehouseName, shipmentId, vehicleId, vehicleIdentifier };
}

async function publishMission(page: Page, fixtures: SceneFixtures, routeId: string | null = null): Promise<string> {
  const createResponse = await page.request.post("/api/v1/missions", {
    data: { shipmentIds: [fixtures.shipmentId], vehicleId: fixtures.vehicleId, startAt: futureIso(3600), routeId },
  });
  expect(createResponse.status()).toBe(201);
  const missionId = (await createResponse.json()).id as string;
  const publishResponse = await page.request.post(`/api/v1/missions/${missionId}/publish`);
  expect(publishResponse.status()).toBe(200);
  return missionId;
}

test.describe("نقشه عملیاتی — Phase 10", () => {
  test("صحنه نقشه در سه لحظه (پیش از شروع، میانه مسیر، پس از ETA) وضعیت و موقعیت درست برمی‌گرداند", async ({ page }, testInfo) => {
    const prefix = `A${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const fixtures = await buildSceneFixtures(page, prefix);

    const routeResponse = await page.request.post("/api/v1/routes", {
      data: {
        code: `${prefix}-RT`,
        name: `مسیر صحنه ${prefix}`,
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

    const routedMissionId = await publishMission(page, fixtures, routeId);
    const routedMission = await (await page.request.get(`/api/v1/missions/${routedMissionId}`)).json();

    const beforeStart = new Date(new Date(routedMission.startAt).getTime() - 1000).toISOString();
    const midTrip = new Date((new Date(routedMission.startAt).getTime() + new Date(routedMission.estimatedArrivalAt).getTime()) / 2).toISOString();
    const afterArrival = new Date(new Date(routedMission.estimatedArrivalAt).getTime() + 1000).toISOString();

    async function sceneEntryAt(viewTime: string) {
      const response = await page.request.get(`/api/v1/map/scene?viewTime=${encodeURIComponent(viewTime)}`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      const entry = body.missions.find((m: { missionId: string }) => m.missionId === routedMissionId);
      expect(entry).toBeTruthy();
      return entry;
    }

    const waitingEntry = await sceneEntryAt(beforeStart);
    expect(waitingEntry.status).toBe("WAITING");
    expect(waitingEntry.position.latitude).toBeCloseTo(waitingEntry.originLatitude, 4);
    expect(waitingEntry.isFallbackDirect).toBe(false);

    const inProgressEntry = await sceneEntryAt(midTrip);
    expect(inProgressEntry.status).toBe("IN_PROGRESS");
    expect(inProgressEntry.progressRatio).toBeGreaterThan(0);
    expect(inProgressEntry.progressRatio).toBeLessThan(1);

    const arrivedEntry = await sceneEntryAt(afterArrival);
    expect(arrivedEntry.status).toBe("ARRIVED");
    expect(arrivedEntry.position.latitude).toBeCloseTo(arrivedEntry.destinationLatitude, 4);
  });

  test("مأموریت بدون مسیر با isFallbackDirect=true در صحنه ظاهر می‌شود", async ({ page }, testInfo) => {
    const prefix = `B${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const fixtures = await buildSceneFixtures(page, prefix);
    const missionId = await publishMission(page, fixtures);

    const response = await page.request.get("/api/v1/map/scene");
    expect(response.status()).toBe(200);
    const body = await response.json();
    const entry = body.missions.find((m: { missionId: string }) => m.missionId === missionId);
    expect(entry.isFallbackDirect).toBe(true);
    expect(entry.routeId).toBeNull();
  });

  test("نقش بیننده وضعیت صحنه نقشه را می‌تواند بخواند", async ({ page }, testInfo) => {
    const prefix = `V${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const fixtures = await buildSceneFixtures(page, prefix);
    await publishMission(page, fixtures);
    await page.context().clearCookies();

    await loginAs(page, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD);
    const response = await page.request.get("/api/v1/map/scene");
    expect(response.status()).toBe(200);
  });

  test("بدون ورود، صحنه نقشه ۴۰۱ برمی‌گرداند", async ({ page }) => {
    const response = await page.request.get("/api/v1/map/scene");
    expect(response.status()).toBe(401);
  });

  test("مشاهده و انتخاب marker خودرو روی نقشه: پنل جزئیات و برچسب «نمای زنده محاسباتی» نمایش داده می‌شود", async ({ page }, testInfo) => {
    const prefix = `U${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    const fixtures = await buildSceneFixtures(page, prefix, true);
    const missionId = await publishMission(page, fixtures);
    await page.context().clearCookies();

    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await page.goto("/map");

    await expect(page.getByText("نمای زنده محاسباتی", { exact: false }).first()).toBeVisible({ timeout: 15_000 });

    // The shared dev DB accumulates scheduled missions from prior test runs, each with its own
    // vehicle marker on the map, so `.maplibregl-marker` can match many elements — target this
    // test's own mission by the `data-mission-id` attribute rather than relying on DOM order.
    const vehicleMarker = page.locator(`.maplibregl-marker[data-mission-id="${missionId}"]`);
    await expect(vehicleMarker).toBeVisible({ timeout: 15_000 });
    // Overlapping markers at nearby coordinates can make Playwright's actionability hit-test
    // resolve a sibling marker's SVG at the same pixel; force bypasses that check since we've
    // already independently confirmed the target element is visible.
    await vehicleMarker.click({ force: true });

    await expect(page.getByText(fixtures.vehicleIdentifier, { exact: true })).toBeVisible();
    await expect(page.getByText("در انتظار حرکت", { exact: true })).toBeVisible();
    await expect(page.getByText(`${fixtures.originWarehouseName} ← ${fixtures.destinationWarehouseName}`)).toBeVisible();
    await expect(page.getByText("بدون مسیر تعریف‌شده", { exact: false })).toBeVisible();

    const missionResponse = await page.request.get(`/api/v1/missions/${missionId}`);
    expect(missionResponse.status()).toBe(200);
  });
});
