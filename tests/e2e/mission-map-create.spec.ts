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

interface MapMissionFixtures {
  originWarehouseId: string;
  originWarehouseName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  destinationLatitude: number;
  destinationLongitude: number;
  cargoTypeId: string;
  shipmentIds: string[];
  vehicleIdentifier: string;
}

async function buildFixtures(page: Page, prefix: string, shipmentCount = 2): Promise<MapMissionFixtures> {
  async function createOrgUnit(data: Record<string, unknown>): Promise<string> {
    const response = await page.request.post("/api/v1/organization-units", { data });
    expect(response.status()).toBe(201);
    return (await response.json()).id as string;
  }

  const countryId = await createOrgUnit({ code: `${prefix}-IR`, name: `کشور ${prefix}`, level: "COUNTRY_OFFICE", parentId: null });
  const groupId = await createOrgUnit({ code: `${prefix}-GR`, name: `گروه ${prefix}`, level: "GROUP_OFFICE", parentId: countryId });
  const distributorId = await createOrgUnit({ code: `${prefix}-DI`, name: `توزیع ${prefix}`, level: "DISTRIBUTOR_OFFICE", parentId: groupId });

  const originWarehouseName = `انبار مبدأ نقشه ${prefix}`;
  const originWarehouseId = await createOrgUnit({
    code: `${prefix}-W1`,
    name: originWarehouseName,
    level: "WAREHOUSE",
    parentId: distributorId,
    latitude: 35.6892,
    longitude: 51.389,
  });
  const destinationLatitude = 35.84;
  const destinationLongitude = 50.9391;
  const destinationWarehouseName = `انبار مقصد نقشه ${prefix}`;
  const destinationWarehouseId = await createOrgUnit({
    code: `${prefix}-W2`,
    name: destinationWarehouseName,
    level: "WAREHOUSE",
    parentId: distributorId,
    latitude: destinationLatitude,
    longitude: destinationLongitude,
  });

  const cargoTypeResponse = await page.request.post("/api/v1/cargo-types", { data: { name: `بار نقشه ${prefix}` } });
  expect(cargoTypeResponse.status()).toBe(201);
  const cargoTypeId = (await cargoTypeResponse.json()).id as string;

  const shipmentIds: string[] = [];
  for (let i = 0; i < shipmentCount; i += 1) {
    const response = await page.request.post("/api/v1/shipments", {
      data: {
        title: `محموله نقشه ${prefix}-${i}`,
        cargoTypeId,
        originWarehouseId,
        destinationMode: "ORGANIZATION_UNIT",
        destinationOrganizationUnitId: destinationWarehouseId,
      },
    });
    expect(response.status()).toBe(201);
    shipmentIds.push((await response.json()).id as string);
  }

  const vehicleTypeResponse = await page.request.post("/api/v1/vehicle-types", { data: { name: `نوع خودرو نقشه ${prefix}` } });
  expect(vehicleTypeResponse.status()).toBe(201);
  const vehicleTypeId = (await vehicleTypeResponse.json()).id as string;

  const vehicleIdentifier = `${prefix}-VH`;
  const vehicleResponse = await page.request.post("/api/v1/vehicles", {
    data: { identifier: vehicleIdentifier, vehicleTypeId, fuelTankLiters: 80, avgConsumptionPer100Km: 25, avgSpeedKmh: 80, readiness: "READY" },
  });
  expect(vehicleResponse.status()).toBe(201);

  return {
    originWarehouseId,
    originWarehouseName,
    destinationWarehouseId,
    destinationWarehouseName,
    destinationLatitude,
    destinationLongitude,
    cargoTypeId,
    shipmentIds,
    vehicleIdentifier,
  };
}

test.describe("مأموریت از داخل نقشه — Phase 8", () => {
  test("Planner مأموریت را بدون ترک نقشه با انتخاب مبدأ از جست‌وجو و مقصد با مختصات می‌سازد و منتشر می‌کند", async ({ page }, testInfo) => {
    const prefix = `M${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    const fixtures = await buildFixtures(page, prefix, 2);
    await page.context().clearCookies();

    await loginAs(page, E2E_PLANNER_USERNAME, E2E_PLANNER_PASSWORD);
    await page.goto("/map");

    await page.getByRole("button", { name: "ساخت مأموریت از نقشه" }).click();
    await expect(page.getByText("مرحله ۱ از ۳")).toBeVisible();

    // مرحله مبدأ: جست‌وجو و انتخاب انبار از فهرست (بدون نیاز به Tap دقیق روی marker)
    await page.getByPlaceholder("جست‌وجوی انبار...").fill(fixtures.originWarehouseName);
    await page.getByRole("button", { name: fixtures.originWarehouseName, exact: true }).click();

    // مرحله مقصد: ورود مختصات مستقیم
    await expect(page.getByText("مرحله ۲ از ۳")).toBeVisible();
    await page.getByLabel("عرض جغرافیایی").fill(String(fixtures.destinationLatitude));
    await page.getByLabel("طول جغرافیایی").fill(String(fixtures.destinationLongitude));
    await page.getByRole("button", { name: "تأیید مختصات" }).click();

    // مرحله جزئیات: انتخاب هر دو مرسوله + خودرو، سپس انتشار
    await expect(page.getByText("مأموریت جدید از نقشه")).toBeVisible();
    for (let i = 0; i < fixtures.shipmentIds.length; i += 1) {
      await page.getByText(`محموله نقشه ${prefix}-${i}`, { exact: true }).click();
    }
    await page.getByText(fixtures.vehicleIdentifier, { exact: true }).click();
    await page.getByRole("button", { name: "محاسبه دوباره" }).click();
    await expect(page.getByText("فاصله", { exact: false }).first()).toBeVisible();

    await page.getByRole("button", { name: "انتشار مأموریت" }).click();
    await expect.poll(() => page.url(), { timeout: 15_000 }).toContain("/missions/");

    const missionId = page.url().split("/").pop() as string;
    const mission = await (await page.request.get(`/api/v1/missions/${missionId}`)).json();
    expect(mission.persistedStatus).toBe("SCHEDULED");
    expect(mission.shipments).toHaveLength(2);
    expect(mission.originWarehouseId).toBe(fixtures.originWarehouseId);

    for (const shipmentId of fixtures.shipmentIds) {
      const shipment = await (await page.request.get(`/api/v1/shipments/${shipmentId}`)).json();
      expect(shipment.status).toBe("WAITING_FOR_DISPATCH");
    }
  });

  test("Tap روی نقطه خالی نقشه در مرحله مقصد پنل ساخت مأموریت را باز می‌کند", async ({ page }, testInfo) => {
    // برای قطعیت کامل (بدون وابستگی به تراکم marker‌های واقعی انباشته‌شده از تست‌های دیگر در همان DB
    // مشترک)، پاسخ فهرست marker‌های نقشه mock می‌شود تا دقیقاً یک انبار در یک نقطه شناخته‌شده وجود
    // داشته باشد و کلیک روی گوشه دور از آن قطعاً به نقطه خالی نقشه بخورد.
    const prefix = `T${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    await page.context().clearCookies();

    await loginAs(page, E2E_PLANNER_USERNAME, E2E_PLANNER_PASSWORD);

    const mockWarehouseName = `انبار تکی ${prefix}`;
    await page.route("**/api/v1/map/organization-units", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ id: `mock-${prefix}`, code: `${prefix}-M`, name: mockWarehouseName, level: "WAREHOUSE", latitude: 10, longitude: 10 }],
        }),
      }),
    );

    await page.goto("/map");
    await page.getByRole("button", { name: "ساخت مأموریت از نقشه" }).click();
    await page.getByPlaceholder("جست‌وجوی انبار...").fill(mockWarehouseName);
    await page.getByRole("button", { name: mockWarehouseName, exact: true }).click();

    const canvas = page.locator(".maplibregl-canvas");
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("map canvas has no bounding box");
    // marker تنها دقیقاً وسط نقشه (پس از fitBounds تک‌نقطه‌ای) قرار می‌گیرد؛ گوشه پایین-چپ قطعاً خالی است
    await canvas.click({ position: { x: box.width * 0.15, y: box.height * 0.85 } });

    await expect(page.getByText("مأموریت جدید از نقشه")).toBeVisible();
    await expect(page.getByText("نقطه انتخابی روی نقشه")).toBeVisible();
  });

  test("نقش بیننده وضعیت دکمه ساخت مأموریت از نقشه را نمی‌بیند", async ({ page }, testInfo) => {
    const prefix = `R${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    await page.context().clearCookies();

    await loginAs(page, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD);
    await page.goto("/map");
    await expect(page.getByRole("heading", { name: "نقشه عملیات" })).toBeVisible();
    await expect(page.getByRole("button", { name: "ساخت مأموریت از نقشه" })).toHaveCount(0);
  });
});
