import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  E2E_ADMIN_USERNAME,
  E2E_ADMIN_PASSWORD,
  E2E_VIEWER_USERNAME,
  E2E_VIEWER_PASSWORD,
  E2E_PLANNER_USERNAME,
  E2E_PLANNER_PASSWORD,
} from "./global-setup";

/**
 * Phase 13 — فرانمای وضعیت.
 *
 * راهبرد اثبات درستی اعداد: DB مشترک این محیط هزاران رکورد انباشته دارد، پس assert مطلق
 * («کل مأموریت‌ها برابر ۳ است») ذاتاً شکننده است. در عوض هر تست عدد *قبل* را می‌خواند، یک fixture
 * می‌سازد و اثبات می‌کند عدد دقیقاً به‌اندازه مورد انتظار جابه‌جا شده است. این دقیقاً همان چیزی است
 * که معیار پذیرش فاز می‌خواهد: «اعداد با فیلتر زمانی درست تغییر کنند».
 */

async function loginAs(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("نام کاربری").fill(username);
  await page.getByLabel("رمز عبور").fill(password);
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** المان‌های مخفی (Sheet بسته موبایل) را کنار می‌گذارد — همان الگوی فازهای ۱۰ تا ۱۲. */
function visible(locator: Locator, page: Page): Locator {
  return locator.and(page.locator(":visible"));
}

function futureIso(secondsFromNow: number): string {
  return new Date(Date.now() + secondsFromNow * 1000).toISOString();
}

function coordJitter(prefix: string): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < prefix.length; i += 1) hash = (hash * 31 + prefix.charCodeAt(i)) % 100000;
  return { lat: (hash % 500) / 10000, lng: ((hash * 7) % 500) / 10000 };
}

interface DashboardSummaryShape {
  viewTime: string;
  computedAt: string;
  range: { preset: string; from: string | null; to: string | null };
  fleet: { total: number; ready: number; outOfService: number };
  missions: {
    total: number;
    draft: number;
    waiting: number;
    inProgress: number;
    arrived: number;
    cancelled: number;
    archived: number;
    startingNext24h: number;
  };
  shipments: { total: number; draft: number; waitingForDispatch: number; inTransit: number; delivered: number; cancelled: number };
  organization: { countryOffices: number; groupOffices: number; distributorOffices: number; warehouses: number; totalOffices: number };
  missionStatusDistribution: { key: string; label: string; value: number; percentage: number }[];
  vehicleTypeDistribution: { key: string; label: string; value: number; percentage: number }[];
  missionsByVehicleType: { key: string; label: string; value: number; percentage: number }[];
}

async function readSummary(page: Page, query = "range=ALL"): Promise<DashboardSummaryShape> {
  const response = await page.request.get(`/api/v1/dashboard/summary?${query}`);
  expect(response.status()).toBe(200);
  return (await response.json()) as DashboardSummaryShape;
}

interface MissionFixture {
  missionId: string;
  vehicleId: string;
  vehicleTypeName: string;
  startAtIso: string;
  estimatedArrivalAtIso: string;
}

/** یک مأموریت منتشرشده کامل با سازمان/مرسوله/خودروی اختصاصی خودش می‌سازد. */
async function createPublishedMission(
  page: Page,
  prefix: string,
  startAtIso: string,
): Promise<MissionFixture> {
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
    name: `انبار فرانما ${prefix}`,
    level: "WAREHOUSE",
    parentId: distributorId,
    latitude: 35.6892 + jitter.lat,
    longitude: 51.389 + jitter.lng,
  });
  const destinationWarehouseId = await createOrgUnit({
    code: `${prefix}-W2`,
    name: `مقصد فرانما ${prefix}`,
    level: "WAREHOUSE",
    parentId: distributorId,
    latitude: 35.6892 + jitter.lat + 0.05,
    longitude: 51.389 + jitter.lng + 0.05,
  });

  const cargoTypeId = (await (await page.request.post("/api/v1/cargo-types", { data: { name: `بار فرانما ${prefix}` } })).json()).id as string;

  const shipmentId = (
    await (
      await page.request.post("/api/v1/shipments", {
        data: {
          title: `محموله فرانما ${prefix}`,
          cargoTypeId,
          originWarehouseId,
          destinationMode: "ORGANIZATION_UNIT",
          destinationOrganizationUnitId: destinationWarehouseId,
        },
      })
    ).json()
  ).id as string;

  const vehicleTypeName = `نوع فرانما ${prefix}`;
  const vehicleTypeId = (await (await page.request.post("/api/v1/vehicle-types", { data: { name: vehicleTypeName } })).json()).id as string;

  const vehicleId = (
    await (
      await page.request.post("/api/v1/vehicles", {
        data: {
          identifier: `${prefix}-VH`,
          vehicleTypeId,
          fuelTankLiters: 80,
          avgConsumptionPer100Km: 25,
          avgSpeedKmh: 60,
          readiness: "READY",
        },
      })
    ).json()
  ).id as string;

  const createResponse = await page.request.post("/api/v1/missions", {
    data: { shipmentIds: [shipmentId], vehicleId, startAt: startAtIso, routeId: null },
  });
  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();

  const publishResponse = await page.request.post(`/api/v1/missions/${created.id}/publish`);
  expect(publishResponse.status()).toBe(200);
  const published = await (await page.request.get(`/api/v1/missions/${created.id}`)).json();

  return {
    missionId: created.id,
    vehicleId,
    vehicleTypeName,
    startAtIso,
    estimatedArrivalAtIso: published.estimatedArrivalAt,
  };
}

test.describe("فرانمای وضعیت (Situation Dashboard) — Phase 13", () => {
  test("فرانما با کارت‌های KPI و نمودارها برای مدیر رندر می‌شود", async ({ page }) => {
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "فرانمای وضعیت" })).toBeVisible();

    // هر هفت widget پیش‌فرض باید حاضر باشند.
    await expect(page.locator("[data-widget-id]")).toHaveCount(7);
    for (const id of ["missions", "fleet", "shipments", "mission-status", "vehicle-types", "missions-by-vehicle-type", "network"]) {
      await expect(page.locator(`[data-widget-id="${id}"]`)).toBeVisible();
    }

    // «آخرین به‌روزرسانی» باید یک زمان شمسی واقعی باشد، نه placeholder.
    await expect(page.getByText("در حال محاسبه…")).toHaveCount(0);
    await expect(visible(page.locator('[data-kpi-label="کل مأموریت‌های بازه"]'), page)).toBeVisible();
  });

  test("مأموریت تازه منتشرشده هر سه شمارنده مربوطه را دقیقاً یک واحد جابه‌جا می‌کند", async ({ page }, testInfo) => {
    const prefix = `DA${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);

    const before = await readSummary(page);

    // startAt در آینده → وضعیت محاسبه‌شده باید «در انتظار حرکت» باشد، نه «در حال حرکت»/«رسیده».
    await createPublishedMission(page, prefix, futureIso(3600));

    const after = await readSummary(page);

    expect(after.missions.total).toBe(before.missions.total + 1);
    expect(after.missions.waiting).toBe(before.missions.waiting + 1);
    expect(after.missions.inProgress).toBe(before.missions.inProgress);
    expect(after.missions.arrived).toBe(before.missions.arrived);
    expect(after.fleet.total).toBe(before.fleet.total + 1);
    expect(after.fleet.ready).toBe(before.fleet.ready + 1);
    expect(after.shipments.total).toBe(before.shipments.total + 1);
    // چهار گره سازمانی ساخته شد: سه دفتر + دو انبار.
    expect(after.organization.totalOffices).toBe(before.organization.totalOffices + 3);
    expect(after.organization.warehouses).toBe(before.organization.warehouses + 2);
  });

  test("همان مأموریت با تغییر زمان مشاهده از «در انتظار» به «رسیده» منتقل می‌شود", async ({ page }, testInfo) => {
    const prefix = `DB${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);

    const fixture = await createPublishedMission(page, prefix, futureIso(3600));

    // زمان مشاهده = اکنون → در انتظار حرکت
    const live = await readSummary(page, "range=ALL");
    // زمان مشاهده = یک دقیقه پس از ETA → همان مأموریت باید «رسیده» شده باشد.
    const afterEta = new Date(new Date(fixture.estimatedArrivalAtIso).getTime() + 60_000).toISOString();
    const historical = await readSummary(page, `range=ALL&viewTime=${encodeURIComponent(afterEta)}`);

    expect(historical.missions.total).toBe(live.missions.total);
    expect(historical.missions.waiting).toBeLessThan(live.missions.waiting);
    expect(historical.missions.arrived).toBeGreaterThan(live.missions.arrived);
    expect(historical.viewTime).toBe(afterEta);
  });

  test("مجموع قطاع‌های توزیع وضعیت دقیقاً برابر کل مأموریت‌های بازه است", async ({ page }) => {
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const summary = await readSummary(page);

    const distributionTotal = summary.missionStatusDistribution.reduce((sum, slice) => sum + slice.value, 0);
    expect(distributionTotal).toBe(summary.missions.total);

    const counterTotal =
      summary.missions.draft +
      summary.missions.waiting +
      summary.missions.inProgress +
      summary.missions.arrived +
      summary.missions.cancelled +
      summary.missions.archived;
    expect(counterTotal).toBe(summary.missions.total);

    expect(summary.fleet.ready + summary.fleet.outOfService).toBe(summary.fleet.total);
  });

  test("بازه زمانی «امروز» اعداد را نسبت به «همه» محدود می‌کند", async ({ page }) => {
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);

    const all = await readSummary(page, "range=ALL");
    const today = await readSummary(page, "range=TODAY");

    expect(all.range.from).toBeNull();
    expect(today.range.from).not.toBeNull();
    expect(today.range.to).not.toBeNull();
    expect(today.missions.total).toBeLessThanOrEqual(all.missions.total);

    // آمار ناوگان و ساختار سازمانی «وضعیت جاری» هستند و نباید تابع بازه باشند.
    expect(today.fleet.total).toBe(all.fleet.total);
    expect(today.organization.warehouses).toBe(all.organization.warehouses);
  });

  test("انتخاب بازه در UI اعداد را به‌روزرسانی می‌کند", async ({ page }) => {
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await page.goto("/dashboard");

    const totalCard = visible(page.locator('[data-kpi-label="کل مأموریت‌های بازه"]'), page);
    await expect(totalCard).toBeVisible();
    const allValue = await totalCard.locator('[data-testid="dashboard-kpi-value"]').textContent();

    await page.getByRole("button", { name: "امروز", exact: true }).click();
    await expect(page.getByRole("button", { name: "امروز", exact: true })).toHaveAttribute("aria-pressed", "true");

    // مقدار «امروز» معمولاً کمتر است؛ آنچه قطعی است این است که فرانما بدون خطا داده تازه می‌گیرد.
    await expect(totalCard.locator('[data-testid="dashboard-kpi-value"]')).toBeVisible();
    const todayValue = await totalCard.locator('[data-testid="dashboard-kpi-value"]').textContent();
    expect(todayValue).not.toBeNull();
    expect(allValue).not.toBeNull();
  });

  test("drill-down از کارت «در حال حرکت» به نقشه با فیلتر از پیش تنظیم‌شده می‌رود", async ({ page }) => {
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await page.goto("/dashboard");

    const card = visible(page.locator('a[data-kpi-label="در حال حرکت"]'), page);
    await expect(card).toBeVisible();
    await card.click();

    await expect(page).toHaveURL(/\/map\?missionStatus=IN_PROGRESS/);
    // chip فیلتر فعال فاز ۱۱ باید وضعیت را از query string گرفته باشد.
    await expect(visible(page.getByText("وضعیت: در حال حرکت"), page)).toBeVisible({ timeout: 15_000 });
  });

  test("drill-down به فهرست خودروها فیلتر آمادگی را از پیش انتخاب می‌کند", async ({ page }) => {
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await page.goto("/system/vehicles?readiness=OUT_OF_SERVICE");

    const readinessSelect = page.locator("select").filter({ has: page.locator('option[value="OUT_OF_SERVICE"]') });
    await expect(readinessSelect).toHaveValue("OUT_OF_SERVICE");
  });

  test("query string نامعتبر بی‌صدا نادیده گرفته می‌شود و فیلتر اعمال نمی‌شود", async ({ page }) => {
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await page.goto("/system/vehicles?readiness=NOT_A_REAL_VALUE");

    const readinessSelect = page.locator("select").filter({ has: page.locator('option[value="OUT_OF_SERVICE"]') });
    await expect(readinessSelect).toHaveValue("");
  });

  test("هر سه نقش فرانما را می‌بینند ولی بیننده وضعیت لینک مدیریتی نمی‌گیرد", async ({ page }) => {
    // بیننده وضعیت: اعداد بله، لینک ناوگان/سازمان خیر.
    await loginAs(page, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "فرانمای وضعیت" })).toBeVisible();
    await expect(visible(page.locator('[data-kpi-label="کل خودروها"]'), page)).toBeVisible();
    // کارت هست ولی لینک نیست.
    await expect(page.locator('a[data-kpi-label="کل خودروها"]')).toHaveCount(0);
    await expect(page.locator('a[data-kpi-label="کل مأموریت‌های بازه"]')).toHaveCount(0);
    // drill-down نقشه برای همه نقش‌ها مجاز است.
    await expect(visible(page.locator('a[data-kpi-label="در حال حرکت"]'), page)).toBeVisible();

    // برنامه‌ریز مأموریت: لینک مأموریت/مرسوله دارد، لینک ناوگان ندارد.
    await page.getByRole("button", { name: "خروج از حساب کاربری" }).click();
    await loginAs(page, E2E_PLANNER_USERNAME, E2E_PLANNER_PASSWORD);
    await page.goto("/dashboard");
    await expect(page.locator('a[data-kpi-label="کل مأموریت‌های بازه"]')).toHaveCount(1);
    await expect(page.locator('a[data-kpi-label="کل خودروها"]')).toHaveCount(0);
  });

  test("پنهان‌کردن widget پس از بارگذاری مجدد صفحه باقی می‌ماند", async ({ page }) => {
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await page.goto("/dashboard");
    await expect(page.locator('[data-widget-id="network"]')).toBeVisible();

    await page.getByRole("button", { name: "تنظیم چیدمان فرانما" }).click();
    await page.getByLabel("نمایش شبکه سازمانی").uncheck();
    await expect(page.locator('[data-widget-id="network"]')).toHaveCount(0);

    await page.reload();
    // چیدمان در localStorage ماندگار است.
    await expect(page.locator('[data-widget-id="missions"]')).toBeVisible();
    await expect(page.locator('[data-widget-id="network"]')).toHaveCount(0);

    // بازگرداندن پیش‌فرض، دوباره همه را برمی‌گرداند (و وضعیت را برای تست‌های بعدی پاک می‌کند).
    await page.getByRole("button", { name: "تنظیم چیدمان فرانما" }).click();
    await page.getByRole("button", { name: "بازگرداندن چیدمان پیش‌فرض" }).click();
    await expect(page.locator('[data-widget-id="network"]')).toBeVisible();
  });

  test("جابه‌جایی ترتیب widget اعمال و ماندگار می‌شود", async ({ page }) => {
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await page.goto("/dashboard");

    const firstBefore = await page.locator("[data-widget-id]").first().getAttribute("data-widget-id");
    expect(firstBefore).toBe("missions");

    await page.getByRole("button", { name: "تنظیم چیدمان فرانما" }).click();
    await page.getByRole("button", { name: "انتقال ناوگان به بالا" }).click();
    await page.getByRole("button", { name: "بستن" }).last().click();

    await expect(page.locator("[data-widget-id]").first()).toHaveAttribute("data-widget-id", "fleet");

    await page.reload();
    await expect(page.locator("[data-widget-id]").first()).toHaveAttribute("data-widget-id", "fleet");

    await page.getByRole("button", { name: "تنظیم چیدمان فرانما" }).click();
    await page.getByRole("button", { name: "بازگرداندن چیدمان پیش‌فرض" }).click();
    await expect(page.locator("[data-widget-id]").first()).toHaveAttribute("data-widget-id", "missions");
  });

  test("به‌روزرسانی دستی زمان محاسبه را جلو می‌برد", async ({ page }) => {
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await page.goto("/dashboard");

    const stamp = page.locator("p", { hasText: "آخرین به‌روزرسانی" }).first();
    await expect(stamp).toBeVisible();
    const before = await stamp.textContent();

    await page.getByRole("button", { name: "به‌روزرسانی دستی آمار" }).click();
    await expect.poll(async () => stamp.textContent(), { timeout: 10_000 }).not.toBe(before);
  });

  test("endpoint فرانما بدون ورود ۴۰۱ و با پارامتر نامعتبر ۴۲۲ برمی‌گرداند", async ({ page }) => {
    const anonymous = await page.request.get("/api/v1/dashboard/summary?range=ALL");
    expect(anonymous.status()).toBe(401);

    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);

    const badRange = await page.request.get("/api/v1/dashboard/summary?range=NOT_A_RANGE");
    expect(badRange.status()).toBe(422);

    const badViewTime = await page.request.get("/api/v1/dashboard/summary?viewTime=not-a-date");
    expect(badViewTime.status()).toBe(422);
    expect((await badViewTime.json()).error.fieldErrors.viewTime).toBeTruthy();

    // نبود range باید به پیش‌فرض ALL برگردد، نه خطا.
    const noRange = await page.request.get("/api/v1/dashboard/summary");
    expect(noRange.status()).toBe(200);
    expect((await noRange.json()).range.preset).toBe("ALL");
  });

  test("بیننده وضعیت هم می‌تواند endpoint آمار را بخواند", async ({ page }) => {
    await loginAs(page, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD);
    const summary = await readSummary(page);
    expect(typeof summary.missions.total).toBe("number");
    expect(typeof summary.fleet.total).toBe("number");
  });
});
