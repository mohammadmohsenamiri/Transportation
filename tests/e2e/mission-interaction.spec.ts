import { expect, test, type Locator, type Page } from "@playwright/test";
import { E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD } from "./global-setup";

// جدول/فرم فیلتر همزمان در panel دسکتاپ (همیشه mount، فقط با hidden md:flex پنهان) و در Sheet موبایل
// رندر می‌شوند؛ getByText خام بین دو نسخه مبهم است. این کمکی نتیجه را به عنصر واقعاً قابل‌مشاهده محدود می‌کند.
function visible(locator: Locator, page: Page): Locator {
  return locator.and(page.locator(":visible"));
}

// در موبایل (<768) جدول به کارت (ul>li) تبدیل می‌شود، نه <table>؛ این helper مستقل از viewport
// تعداد/محتوای ردیف‌های واقعاً نمایش‌داده‌شده را برمی‌گرداند.
function missionRows(page: Page, hasText?: string) {
  return visible(page.locator("table tbody tr, ul > li", hasText ? { hasText } : undefined), page);
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

// دو دکمه «فیلترها» جدا (دسکتاپ toggle inline و موبایل/تبلت trigger برای Sheet) همیشه در DOM هستند،
// فقط یکی بسته به عرض صفحه با CSS نمایش دارد؛ visible() آن‌که واقعاً قابل‌کلیک است را انتخاب می‌کند.
// روی دسکتاپ toggle است (نه فقط open) — اگر پنل از قبل باز باشد، کلیک دوباره آن را می‌بندد؛ این تابع
// idempotent است تا فراخوانی چندباره در یک تست ایمن باشد.
async function openFilterPanel(page: Page) {
  const alreadyOpen = await page.getByText("پاک‌کردن همه فیلترها").isVisible().catch(() => false);
  if (!alreadyOpen) {
    await visible(page.getByRole("button", { name: "فیلترها" }), page).click();
  }
}

// بستن Sheet باز (فیلتر یا جدول موبایل) از طریق دکمه ضربدر آن، نه کلید Escape — چون فیلد جست‌وجو
// از نوع input[type=search] است و Escape رفتار بومی مرورگر برای پاک‌کردن مقدار آن را هم فعال می‌کند.
async function closeSheetIfOpen(page: Page) {
  // Sheet دو دکمه با aria-label="بستن" دارد: backdrop تمام‌صفحه (اول در DOM، اما زیر پنل قرار دارد و
  // کلیک روی مرکزش توسط محتوای پنل intercept می‌شود) و آیکن ضربدر داخل هدر پنل (دوم، همیشه روی‌کار).
  const closeButton = page.getByLabel("بستن", { exact: true }).last();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
  }
}

// جدول در دسکتاپ/تبلت (md+) به‌صورت panel کنار نقشه همیشه رندر است؛ در موبایل فقط با کلیک دکمه
// شناور «نمایش فهرست مأموریت‌ها» داخل Sheet باز می‌شود. آن دکمه به بارگذاری داده Scene وابسته است
// (فقط وقتی allMissions.length>0 رندر می‌شود)، پس به‌جای isVisible() آنی از یک انتظار کوتاه با
// timeout استفاده می‌شود تا race با رندر اولیه صفحه رخ ندهد؛ در دسکتاپ/تبلت که این دکمه اصلاً وجود
// ندارد، timeout به‌سرعت رد شده و بی‌اثر می‌ماند.
async function ensureTableVisible(page: Page) {
  const mobileTrigger = page.getByRole("button", { name: /نمایش فهرست مأموریت‌ها/ });
  try {
    await mobileTrigger.waitFor({ state: "visible", timeout: 3000 });
    await mobileTrigger.click();
  } catch {
    // نه موبایل (دکمه اصلاً وجود ندارد) یا هنوز داده‌ای برای نمایش نیست — هر دو حالت طبیعی‌اند.
  }
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

// همان الگوی جیتر مختصات tests/e2e/map-scene.spec.ts — از هم‌پوشانی marker با انباشته دیتابیس مشترک جلوگیری می‌کند.
function coordJitter(prefix: string): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < prefix.length; i++) hash = (hash * 31 + prefix.charCodeAt(i)) >>> 0;
  return { lat: 3 + (hash % 500) / 100, lng: 3 + ((hash >> 8) % 500) / 100 };
}

interface MissionFixture {
  missionId: string;
  code: string;
  vehicleIdentifier: string;
  vehicleTypeName: string;
  originWarehouseId: string;
  originWarehouseName: string;
  destinationWarehouseName: string;
}

async function createMissionFixture(page: Page, prefix: string): Promise<MissionFixture> {
  async function createOrgUnit(data: Record<string, unknown>): Promise<string> {
    const response = await page.request.post("/api/v1/organization-units", { data });
    expect(response.status()).toBe(201);
    return (await response.json()).id as string;
  }

  const jitter = coordJitter(prefix);
  const countryId = await createOrgUnit({ code: `${prefix}-IR`, name: `کشور ${prefix}`, level: "COUNTRY_OFFICE", parentId: null });
  const groupId = await createOrgUnit({ code: `${prefix}-GR`, name: `گروه ${prefix}`, level: "GROUP_OFFICE", parentId: countryId });
  const distributorId = await createOrgUnit({ code: `${prefix}-DI`, name: `توزیع ${prefix}`, level: "DISTRIBUTOR_OFFICE", parentId: groupId });
  const originWarehouseName = `انبار تعامل ${prefix}`;
  const originWarehouseId = await createOrgUnit({
    code: `${prefix}-W1`,
    name: originWarehouseName,
    level: "WAREHOUSE",
    parentId: distributorId,
    latitude: 35.6892 + jitter.lat,
    longitude: 51.389 + jitter.lng,
  });
  const destinationWarehouseName = `مقصد تعامل ${prefix}`;
  const destinationWarehouseId = await createOrgUnit({
    code: `${prefix}-W2`,
    name: destinationWarehouseName,
    level: "WAREHOUSE",
    parentId: distributorId,
    latitude: 35.84 + jitter.lat,
    longitude: 50.9391 + jitter.lng,
  });

  const cargoTypeResponse = await page.request.post("/api/v1/cargo-types", { data: { name: `بار تعامل ${prefix}` } });
  const cargoTypeId = (await cargoTypeResponse.json()).id as string;

  const shipmentResponse = await page.request.post("/api/v1/shipments", {
    data: {
      title: `محموله تعامل ${prefix}`,
      cargoTypeId,
      originWarehouseId,
      destinationMode: "ORGANIZATION_UNIT",
      destinationOrganizationUnitId: destinationWarehouseId,
    },
  });
  const shipmentId = (await shipmentResponse.json()).id as string;

  const vehicleTypeName = `نوع تعامل ${prefix}`;
  const vehicleTypeResponse = await page.request.post("/api/v1/vehicle-types", { data: { name: vehicleTypeName } });
  const vehicleTypeId = (await vehicleTypeResponse.json()).id as string;

  const vehicleIdentifier = `${prefix}-VH`;
  const vehicleResponse = await page.request.post("/api/v1/vehicles", {
    data: { identifier: vehicleIdentifier, vehicleTypeId, fuelTankLiters: 80, avgConsumptionPer100Km: 25, avgSpeedKmh: 80, readiness: "READY" },
  });
  const vehicleId = (await vehicleResponse.json()).id as string;

  const createResponse = await page.request.post("/api/v1/missions", {
    data: { shipmentIds: [shipmentId], vehicleId, startAt: futureIso(3600), routeId: null },
  });
  const missionId = (await createResponse.json()).id as string;
  const code = (await createResponse.json()).code as string;
  const publishResponse = await page.request.post(`/api/v1/missions/${missionId}/publish`);
  expect(publishResponse.status()).toBe(200);

  return { missionId, code, vehicleIdentifier, vehicleTypeName, originWarehouseId, originWarehouseName, destinationWarehouseName };
}

test.describe("لایه تعامل نقشه عملیاتی — Phase 11", () => {
  test("انتخاب marker روی نقشه ردیف جدول را انتخاب می‌کند و بالعکس", async ({ page }, testInfo) => {
    const prefix = `IA${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    const fixture = await createMissionFixture(page, prefix);

    await page.goto("/map");
    await expect(page.getByText("نمای زنده محاسباتی", { exact: false }).first()).toBeVisible({ timeout: 15_000 });

    const marker = page.locator(`.maplibregl-marker[data-mission-id="${fixture.missionId}"]`);
    await expect(marker).toBeVisible({ timeout: 15_000 });
    // dispatchEvent به‌جای click({force:true}): با دیتابیس مشترک انباشته (صدها مأموریت قدیمی از
    // اجراهای قبلی)، marker‌های نزدیک هم روی نقشه در زوم پایین به‌شدت هم‌پوشانی دارند و click مبتنی
    // بر مختصات پیکسل ممکن است روی marker دیگری فرود بیاید؛ dispatchEvent مستقیماً روی همان DOM node
    // هدف رویداد کلیک را شبیه‌سازی می‌کند، مستقل از موقعیت/هم‌پوشانی بصری — همان الگوی رفع مشابه در
    // tests/e2e/map-scene.spec.ts (force+data-mission-id) را یک قدم قابل‌اتکاتر می‌کند.
    await marker.dispatchEvent("click");

    await ensureTableVisible(page);
    // اثبات همگام‌سازی marker→ردیف: پنل جزئیات (که فقط با انتخاب معتبر باز می‌شود) کد و شناسه خودرو
    // همین مأموریت را نشان می‌دهد. بررسی aria-selected عمداً انجام نمی‌شود چون در موبایل ردیف به
    // کارت (li بدون این attribute) تبدیل می‌شود، نه <tr>.
    await expect(visible(page.getByText(fixture.vehicleIdentifier, { exact: true }), page).first()).toBeVisible();
    const row = missionRows(page, fixture.code);
    await expect(row).toBeVisible();

    // Sheet فهرست مأموریت (در صورت باز بودن روی موبایل) کل صفحه از جمله دکمه بستن پنل جزئیات را
    // می‌پوشاند؛ باید پیش از تعامل با پنل جزئیات بسته شود.
    await closeSheetIfOpen(page);
    // بستن پنل جزئیات و انتخاب دوباره از طریق ردیف جدول (جهت دیگر همگام‌سازی)
    await page.getByLabel("بستن جزئیات مأموریت").click();
    await ensureTableVisible(page);
    await row.click();
    await expect(visible(page.getByText(fixture.vehicleIdentifier, { exact: true }), page).first()).toBeVisible();
  });

  test("فیلتر نوع خودرو هم جدول و هم marker‌های نقشه را محدود می‌کند", async ({ page }, testInfo) => {
    const prefix = `IB${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    const fixture = await createMissionFixture(page, prefix);

    await page.goto("/map");
    await expect(visible(page.getByRole("button", { name: "فیلترها" }), page)).toBeVisible({ timeout: 15_000 });
    await openFilterPanel(page);

    await page.getByLabel("نوع خودرو").selectOption(fixture.vehicleTypeName);
    await closeSheetIfOpen(page);
    await ensureTableVisible(page);

    await expect(missionRows(page)).toHaveCount(1);
    await expect(visible(page.getByText(fixture.code, { exact: true }), page)).toBeVisible();
    await expect(page.locator(".maplibregl-marker[data-mission-id]")).toHaveCount(1);
  });

  test("جست‌وجوی سریع بر اساس کد مأموریت جدول را فیلتر می‌کند", async ({ page }, testInfo) => {
    const prefix = `IC${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    const fixture = await createMissionFixture(page, prefix);

    await page.goto("/map");
    await openFilterPanel(page);
    await page.getByPlaceholder("جست‌وجوی کد مأموریت، شناسه خودرو یا کد رهگیری مرسوله...").fill(fixture.code);

    // chip فعال باید نمایش داده شود؛ پنل فیلتر روی دسکتاپ inline است پس هنوز قابل مشاهده است
    await expect(page.getByText(`جست‌وجو: ${fixture.code}`)).toBeVisible();

    await closeSheetIfOpen(page);
    await ensureTableVisible(page);
    await expect(missionRows(page)).toHaveCount(1);
    await expect(visible(page.getByText(fixture.code, { exact: true }), page)).toBeVisible();
  });

  test("فیلتر مبدأ از پنل فیلتر (معادل context menu مبدأ روی marker انبار) اعمال می‌شود", async ({ page }, testInfo) => {
    const prefix = `ID${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    const fixture = await createMissionFixture(page, prefix);

    await page.goto("/map");
    await expect(page.getByText("نمای زنده محاسباتی", { exact: false }).first()).toBeVisible({ timeout: 15_000 });

    // این تست مسیر داخلی applyOriginFilter را از طریق فرم فیلتر پوشش می‌دهد (همان state که دکمه
    // context menu روی popup marker انبار هم صدا می‌زند)؛ تعامل فیزیکی خود popup/marker انبار در
    // tests/e2e/map.spec.ts پوشش داده شده و اینجا تکرار نمی‌شود.
    await openFilterPanel(page);
    await page.getByLabel("مبدأ").fill(fixture.originWarehouseName);
    await expect(page.getByText(`مبدأ: ${fixture.originWarehouseName}`)).toBeVisible();

    await closeSheetIfOpen(page);
    await ensureTableVisible(page);
    await expect(missionRows(page)).toHaveCount(1);
    await expect(visible(page.getByText(fixture.code, { exact: true }), page)).toBeVisible();

    // Sheet فهرست مأموریت (در صورت باز بودن روی موبایل) باید پیش از بازکردن دوباره پنل فیلتر بسته شود
    await closeSheetIfOpen(page);
    await openFilterPanel(page);
    await page.getByText("پاک‌کردن همه فیلترها").click();
    await expect(page.getByLabel("مبدأ")).toHaveValue("");
  });

  test("مرتب‌سازی ستون با کلیک جهت را تغییر می‌دهد", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-360", "فهرست موبایل از کارت استفاده می‌کند؛ ستون‌های قابل‌مرتب‌سازی فقط در نمای جدول دسکتاپ/تبلت هستند.");
    const prefix = `IE${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    await createMissionFixture(page, prefix);

    await page.goto("/map");
    await ensureTableVisible(page);
    const statusHeader = page.getByRole("button", { name: "وضعیت" });
    await expect(statusHeader).toBeVisible({ timeout: 15_000 });

    const th = page.locator("th", { has: statusHeader });
    await expect(th).toHaveAttribute("aria-sort", "none");
    await statusHeader.click();
    await expect(th).toHaveAttribute("aria-sort", "ascending");
    await statusHeader.click();
    await expect(th).toHaveAttribute("aria-sort", "descending");
  });

  test("نقش بیننده وضعیت جدول و فیلترها را می‌بیند", async ({ page }, testInfo) => {
    const prefix = `IF${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    await createMissionFixture(page, prefix);
    await page.context().clearCookies();

    await loginAs(page, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD);
    await page.goto("/map");
    await expect(visible(page.getByRole("button", { name: "فیلترها" }), page)).toBeVisible({ timeout: 15_000 });
    // پیش از بررسی دکمه شناور «نمایش فهرست»، مطمئن می‌شویم داده Scene (که آن دکمه به آن وابسته است)
    // بارگذاری شده — ensureTableVisible یک isVisible() آنی است و اگر زودتر از رندر دکمه صدا شود
    // بی‌اثر می‌ماند.
    await expect(page.getByText("نمای زنده محاسباتی", { exact: false }).first()).toBeVisible({ timeout: 15_000 });

    await ensureTableVisible(page);
    await expect(visible(page.getByText(/مأموریت‌های فعال/), page)).toBeVisible();
    await expect(page.getByRole("button", { name: "ساخت مأموریت از نقشه" })).toHaveCount(0);
  });

  test("Enter روی ردیف فوکوس‌شده انتخاب می‌کند و Escape انتخاب را پاک می‌کند", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-360", "در موبایل انتخاب یک ردیف Sheet فهرست را می‌بندد؛ گام Escape روی همان ردیف قابل اجرا نیست.");
    const prefix = `IG${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    const fixture = await createMissionFixture(page, prefix);

    await page.goto("/map");
    // با ۲۰۰+ مأموریت انباشته در دیتابیس مشترک، ردیف مأموریت تازه (با startAt دورترین در آینده) در
    // صفحه پیش‌فرض جدول (۲۰ ردیف اول) دیده نمی‌شود؛ جست‌وجوی سریع آن را به تنها ردیف نمایشی محدود می‌کند.
    await openFilterPanel(page);
    await page.getByPlaceholder("جست‌وجوی کد مأموریت، شناسه خودرو یا کد رهگیری مرسوله...").fill(fixture.code);
    await closeSheetIfOpen(page);
    await ensureTableVisible(page);

    const row = visible(page.locator("table tbody tr", { hasText: fixture.code }), page);
    await expect(row).toBeVisible({ timeout: 15_000 });

    await row.focus();
    await row.press("Enter");
    await expect(page.getByLabel("بستن جزئیات مأموریت")).toBeVisible();
    await expect(row).toHaveAttribute("aria-selected", "true");

    await row.press("Escape");
    await expect(page.getByLabel("بستن جزئیات مأموریت")).toHaveCount(0);
    await expect(row).toHaveAttribute("aria-selected", "false");
  });
});
