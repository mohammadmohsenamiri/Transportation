import { expect, test, type Locator, type Page } from "@playwright/test";
import { E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD } from "./global-setup";

// جدول مأموریت‌ها (دسکتاپ + Sheet موبایل) و MissionDetailPanel هر دو می‌توانند شناسه خودرو را در DOM
// رندر کنند؛ روی موبایل محتوای Sheet بسته هم mounted می‌ماند (فقط مخفی)، پس بدون این helper
// locator().first() ممکن است المان مخفی جدول را به‌جای پنل جزئیات قابل‌مشاهده انتخاب کند —
// همان الگوی مستندشده در map-scene.spec.ts و mission-interaction.spec.ts.
function visible(locator: Locator, page: Page): Locator {
  return locator.and(page.locator(":visible"));
}

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

// همان الگوی جیتر مختصات فایل‌های e2e قبلی — از هم‌پوشانی marker با انباشته دیتابیس مشترک جلوگیری می‌کند.
function coordJitter(prefix: string): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < prefix.length; i++) hash = (hash * 31 + prefix.charCodeAt(i)) >>> 0;
  return { lat: 3 + (hash % 500) / 100, lng: 3 + ((hash >> 8) % 500) / 100 };
}

interface MissionFixture {
  missionId: string;
  code: string;
  vehicleIdentifier: string;
  startAtIso: string;
  estimatedArrivalAtIso: string;
}

/**
 * مبدأ و مقصد عمداً بسیار نزدیک هم هستند (~۱۰۰ متر) تا مدت سفر تخمینی به چند ثانیه برسد — این‌طور
 * پرش نوار زمان به «چند دقیقه پس از شروع» همیشه از ETA فراتر می‌رود و وضعیت «رسیده» را قطعی می‌کند،
 * بدون نیاز به صبر واقعی طولانی یا مسیر بلند.
 */
async function createShortTripFixture(page: Page, prefix: string): Promise<MissionFixture> {
  async function createOrgUnit(data: Record<string, unknown>): Promise<string> {
    const response = await page.request.post("/api/v1/organization-units", { data });
    expect(response.status()).toBe(201);
    return (await response.json()).id as string;
  }

  const jitter = coordJitter(prefix);
  const countryId = await createOrgUnit({ code: `${prefix}-IR`, name: `کشور ${prefix}`, level: "COUNTRY_OFFICE", parentId: null });
  const groupId = await createOrgUnit({ code: `${prefix}-GR`, name: `گروه ${prefix}`, level: "GROUP_OFFICE", parentId: countryId });
  const distributorId = await createOrgUnit({ code: `${prefix}-DI`, name: `توزیع ${prefix}`, level: "DISTRIBUTOR_OFFICE", parentId: groupId });
  const originWarehouseId = await createOrgUnit({
    code: `${prefix}-W1`,
    name: `انبار زمان‌بندی ${prefix}`,
    level: "WAREHOUSE",
    parentId: distributorId,
    latitude: 35.6892 + jitter.lat,
    longitude: 51.389 + jitter.lng,
  });
  const destinationWarehouseId = await createOrgUnit({
    code: `${prefix}-W2`,
    name: `مقصد زمان‌بندی ${prefix}`,
    level: "WAREHOUSE",
    parentId: distributorId,
    latitude: 35.6892 + jitter.lat + 0.001,
    longitude: 51.389 + jitter.lng + 0.001,
  });

  const cargoTypeResponse = await page.request.post("/api/v1/cargo-types", { data: { name: `بار زمان‌بندی ${prefix}` } });
  const cargoTypeId = (await cargoTypeResponse.json()).id as string;

  const shipmentResponse = await page.request.post("/api/v1/shipments", {
    data: {
      title: `محموله زمان‌بندی ${prefix}`,
      cargoTypeId,
      originWarehouseId,
      destinationMode: "ORGANIZATION_UNIT",
      destinationOrganizationUnitId: destinationWarehouseId,
    },
  });
  const shipmentId = (await shipmentResponse.json()).id as string;

  const vehicleTypeResponse = await page.request.post("/api/v1/vehicle-types", { data: { name: `نوع زمان‌بندی ${prefix}` } });
  const vehicleTypeId = (await vehicleTypeResponse.json()).id as string;

  const vehicleIdentifier = `${prefix}-VH`;
  const vehicleResponse = await page.request.post("/api/v1/vehicles", {
    data: { identifier: vehicleIdentifier, vehicleTypeId, fuelTankLiters: 80, avgConsumptionPer100Km: 25, avgSpeedKmh: 80, readiness: "READY" },
  });
  const vehicleId = (await vehicleResponse.json()).id as string;

  const startAtIso = futureIso(120); // ۲ دقیقه بعد — همیشه در «امروز» قرار دارد
  const createResponse = await page.request.post("/api/v1/missions", {
    data: { shipmentIds: [shipmentId], vehicleId, startAt: startAtIso, routeId: null },
  });
  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();
  const publishResponse = await page.request.post(`/api/v1/missions/${created.id}/publish`);
  expect(publishResponse.status()).toBe(200);
  const published = await (await page.request.get(`/api/v1/missions/${created.id}`)).json();

  return { missionId: created.id, code: created.code, vehicleIdentifier, startAtIso, estimatedArrivalAtIso: published.estimatedArrivalAt };
}

test.describe("موتور زمان‌بندی (Timeline Engine) — Phase 12", () => {
  test("پیش‌فرض نمای زنده محاسباتی است", async ({ page }, testInfo) => {
    const prefix = `TA${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    await page.goto("/map");

    await expect(page.getByText("نمای زنده محاسباتی", { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("بازسازی زمانی", { exact: true })).toHaveCount(0);
  });

  test("پرش به زمان، حالت را بازسازی زمانی می‌کند و پس از عبور از ETA وضعیت را «رسیده» نشان می‌دهد", async ({ page }, testInfo) => {
    const prefix = `TB${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    const fixture = await createShortTripFixture(page, prefix);

    await page.goto("/map");
    await expect(page.getByText("نمای زنده محاسباتی", { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    const marker = page.locator(`.maplibregl-marker[data-mission-id="${fixture.missionId}"]`);
    await expect(marker).toBeVisible({ timeout: 15_000 });
    await marker.dispatchEvent("click");
    await expect(visible(page.getByText(fixture.vehicleIdentifier, { exact: true }), page).first()).toBeVisible();
    await expect(visible(page.getByText("در انتظار حرکت", { exact: true }), page).first()).toBeVisible();

    const target = new Date(new Date(fixture.estimatedArrivalAtIso).getTime() + 60_000);
    const tehranMs = target.getTime() + (3 * 60 + 30) * 60 * 1000;
    const tehranDate = new Date(tehranMs);

    await page.getByLabel("ساعت مقصد پرش").fill(String(tehranDate.getUTCHours()));
    await page.getByLabel("دقیقه مقصد پرش").fill(String(tehranDate.getUTCMinutes()));
    await page.getByRole("button", { name: "برو", exact: true }).click();

    await expect(page.getByText("بازسازی زمانی", { exact: true }).first()).toBeVisible();
    await expect(visible(page.getByText("رسیده", { exact: true }), page).first()).toBeVisible();
  });

  test("بازگشت به اکنون از حالت بازسازی زمانی خارج می‌کند", async ({ page }, testInfo) => {
    const prefix = `TC${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    await page.goto("/map");
    await expect(page.getByText("نمای زنده محاسباتی", { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("نوار زمان — انتخاب لحظه مشاهده").fill("10");
    await expect(page.getByText("بازسازی زمانی", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "بازگشت به اکنون" }).click();
    await expect(page.getByText("نمای زنده محاسباتی", { exact: true }).first()).toBeVisible();
  });

  test("دکمه پخش زمان را جلو می‌برد و مکث آن را متوقف می‌کند", async ({ page }, testInfo) => {
    const prefix = `TD${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    await page.goto("/map");
    await expect(page.getByText("نمای زنده محاسباتی", { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    // زمان روی نشانگر متنی با دقت ثانیه نمایش داده می‌شود (formatJalaliDateTime)؛ حتی در سرعت ۱× با
    // یک تیک پخش (~۱ ثانیه) قابل تشخیص است — برخلاف مقدار درصدی slider که روی بازه ۲۴ساعته آن‌قدر
    // ریز حرکت می‌کند که در چند ثانیه اول ممکن است تغییرش در دقت رشته دیده نشود.
    const timeIndicator = page.getByLabel("زمان مشاهده جاری");
    const playButton = page.getByRole("button", { name: "پخش" });
    await expect(playButton).toBeVisible();
    const before = await timeIndicator.textContent();

    await playButton.click();
    await expect(page.getByRole("button", { name: "مکث پخش" })).toBeVisible();
    await expect.poll(async () => timeIndicator.textContent(), { timeout: 8_000 }).not.toBe(before);

    await page.getByRole("button", { name: "مکث پخش" }).click();
    await expect(page.getByRole("button", { name: "پخش" })).toBeVisible();
  });

  test("دکمه‌های گام ۵ و ۱۵ دقیقه‌ای نشانگر زمان را جابه‌جا می‌کنند", async ({ page }, testInfo) => {
    const prefix = `TE${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    await page.goto("/map");
    await expect(page.getByText("نمای زنده محاسباتی", { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    const before = await page.locator('input[type="range"][aria-label="نوار زمان — انتخاب لحظه مشاهده"]').inputValue();
    await page.getByLabel("۱۵ دقیقه جلو", { exact: true }).click();
    await expect(page.getByText("بازسازی زمانی", { exact: true }).first()).toBeVisible();
    const afterFirstStep = await page.locator('input[type="range"][aria-label="نوار زمان — انتخاب لحظه مشاهده"]').inputValue();
    expect(Number(afterFirstStep)).toBeGreaterThan(Number(before));

    await page.getByLabel("۵ دقیقه عقب", { exact: true }).click();
    const afterSecondStep = await page.locator('input[type="range"][aria-label="نوار زمان — انتخاب لحظه مشاهده"]').inputValue();
    expect(Number(afterSecondStep)).toBeLessThan(Number(afterFirstStep));
  });

  test("ورود به حالت ساخت مأموریت از نقشه، پس از خروج به نمای زنده بازمی‌گردد", async ({ page }, testInfo) => {
    const prefix = `TF${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    await page.goto("/map");
    await expect(page.getByText("نمای زنده محاسباتی", { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("نوار زمان — انتخاب لحظه مشاهده").fill("10");
    await expect(page.getByText("بازسازی زمانی", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "ساخت مأموریت از نقشه" }).click();
    await expect(page.getByText("بازسازی زمانی", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "خروج از حالت ساخت مأموریت" }).click();
    await expect(page.getByText("نمای زنده محاسباتی", { exact: true }).first()).toBeVisible();
  });

  test("نوار زمان با کیبورد قابل استفاده است", async ({ page }, testInfo) => {
    const prefix = `TG${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    await page.goto("/map");
    const slider = page.getByLabel("نوار زمان — انتخاب لحظه مشاهده");
    await expect(slider).toBeVisible({ timeout: 15_000 });

    // جهت افزایش/کاهش مقدار input[type=range] با فلش‌ها به dir محاسبه‌شده مرورگر (اینجا rtl از
    // html) بستگی دارد و می‌تواند در مرورگرها معکوس باشد؛ آنچه این تست واقعاً باید اثبات کند طبق هدف
    // G8 «قابل‌استفاده بودن با کیبورد» است، نه جهت مشخص یک فلش خاص.
    const before = await slider.inputValue();
    await slider.focus();
    await slider.press("ArrowRight");
    const after = await slider.inputValue();
    expect(Number(after)).not.toBe(Number(before));
    await expect(page.getByText("بازسازی زمانی", { exact: true }).first()).toBeVisible();
  });
});
