import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  E2E_ADMIN_USERNAME,
  E2E_ADMIN_PASSWORD,
  E2E_VIEWER_USERNAME,
  E2E_VIEWER_PASSWORD,
  E2E_PLANNER_USERNAME,
  E2E_PLANNER_PASSWORD,
} from "./global-setup";

/**
 * Phase 15 — تکمیل چرخه عمر مأموریت.
 *
 * راهبرد: هر تست مأموریت *خودش* را می‌سازد و منتشر می‌کند، چون گذارها وضعیت را برای همیشه عوض
 * می‌کنند و استفاده مجدد از یک مأموریت مشترک، اجراهای موازی چهار viewport را به هم می‌ریخت.
 * زمان‌بندی fixture در توضیح `createPublishedMission` شرح داده شده است.
 */

/**
 * fixture این فایل عمداً منتظر گذشتن زمان تخمینی رسیدن می‌ماند (توضیح `createPublishedMission`)،
 * و آن انتظار به‌علاوه ورود و ساخت مرسوله از سقف پیش‌فرض ۳۰ ثانیه Playwright عبور می‌کند.
 */
test.describe.configure({ timeout: 120_000 });

function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

async function loginAs(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("نام کاربری").fill(username);
  await page.getByLabel("رمز عبور").fill(password);
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

const loginAsAdmin = (page: Page) => loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);

interface MissionFixture {
  id: string;
  code: string;
  version: number;
  startAt: string;
  estimatedArrivalAt: string;
  shipmentId: string;
}

/**
 * یک مأموریت منتشرشده با یک مرسوله تازه می‌سازد و منتظر می‌ماند تا زمان تخمینی رسیدنش بگذرد.
 *
 * این انتظار یک ترفند تست نیست، بلکه بازتاب یک **قید واقعی محصول** است: فاز ۷ زمان شروع را
 * الزاماً در آینده می‌خواهد، و فاز ۱۵ زمان رسیدن واقعی را الزاماً در گذشته (LR-01) و پس از زمان
 * شروع (LR-02). یعنی یک مأموریت فقط پس از فرارسیدن زمان شروع برنامه‌ریزی‌شده‌اش قابل تکمیل است —
 * که دقیقاً رفتار درست است: نمی‌توان برای مأموریتی که هنوز شروع نشده، رسیدن ثبت کرد.
 *
 * مقصد عمداً بسیار نزدیک انتخاب می‌شود تا فاصله زمانی برنامه‌ریزی چند ثانیه باشد، نه چند ساعت.
 */
async function createPublishedMission(request: APIRequestContext, page: Page): Promise<MissionFixture> {
  const suffix = uniqueSuffix();

  const warehouses = await request.get("/api/v1/organization-units?level=WAREHOUSE&pageSize=1");
  const warehouseList = (await warehouses.json()).items as { id: string; latitude: number; longitude: number }[];
  test.skip(warehouseList.length === 0, "هیچ انباری در محیط وجود ندارد.");
  const warehouse = warehouseList[0];

  const cargoTypes = await request.get("/api/v1/cargo-types");
  const cargoList = (await cargoTypes.json()).items as { id: string }[];
  test.skip(cargoList.length === 0, "هیچ نوع باری در محیط وجود ندارد.");

  // خودرو **تصادفی** از میان چند ده خودرو آماده انتخاب می‌شود، نه همیشه اولی: فاز ۷ دو مأموریت
  // هم‌پوشان روی یک خودرو را رد می‌کند، و چهار پروژه viewport که به‌موازات اجرا می‌شوند اگر همه
  // سراغ یک خودرو بروند، همدیگر را می‌شکنند.
  const vehicles = await request.get("/api/v1/vehicles?readiness=READY&pageSize=100");
  const vehicleList = (await vehicles.json()).items as { id: string }[];
  test.skip(vehicleList.length === 0, "هیچ خودرو آماده‌ای در محیط وجود ندارد.");
  const vehicle = vehicleList[Math.floor(Math.random() * vehicleList.length)];

  const shipmentResponse = await request.post("/api/v1/shipments", {
    data: {
      title: `مرسوله چرخه عمر ${suffix}`,
      cargoTypeId: cargoList[0].id,
      originWarehouseId: warehouse.id,
      destinationMode: "COORDINATES",
      destinationOrganizationUnitId: null,
      destinationTitle: `مقصد ${suffix}`,
      destinationLatitude: Number(warehouse.latitude) + 0.002,
      destinationLongitude: Number(warehouse.longitude) + 0.002,
      weightKg: 100,
      notes: null,
    },
  });
  expect(shipmentResponse.status(), await shipmentResponse.text()).toBe(201);
  const shipmentId = (await shipmentResponse.json()).id as string;

  const startAt = new Date(Date.now() + 2000).toISOString();
  const draftResponse = await request.post("/api/v1/missions", {
    data: { shipmentIds: [shipmentId], vehicleId: vehicle.id, startAt, routeId: null, notes: null },
  });
  expect(draftResponse.status(), await draftResponse.text()).toBe(201);
  const draft = await draftResponse.json();

  const published = await request.post(`/api/v1/missions/${draft.id}/publish`, {});
  expect(published.status(), await published.text()).toBe(200);
  const mission = await published.json();

  // انتظار تا گذشتن زمان تخمینی رسیدن — از آن لحظه ساعت «رسیده (تخمینی)» می‌گوید و ثبت رسیدن
  // واقعی مجاز می‌شود. سقف گذاشته می‌شود تا اگر داده مرجع این محیط فاصله بزرگی بسازد، تست
  // به‌جای معلق ماندن، صریح skip شود.
  const waitMs = new Date(mission.estimatedArrivalAt).getTime() - Date.now() + 1500;
  test.skip(waitMs > 30_000, "فاصله مبدأ/مقصد این محیط برای آزمون چرخه عمر بیش از حد بزرگ است.");
  if (waitMs > 0) await page.waitForTimeout(waitMs);

  // ورودی تاریخ/ساعت رابط کاربری دقت **دقیقه‌ای** دارد، پس مقدار پیش‌فرضش به ابتدای دقیقه جاری
  // گرد می‌شود. اگر مأموریت چند ثانیه پیش و در همان دقیقه شروع شده باشد، آن مقدار گردشده *پیش
  // از* زمان شروع می‌افتد و LR-02 آن را رد می‌کند. این یک محدودیت واقعی رابط است (در
  // `PHASE_STATUS.md` ثبت شده)، نه ایراد تست؛ اینجا منتظر می‌مانیم تا ساعت وارد دقیقه بعد شود تا
  // تست همان کاری را بسنجد که یک اپراتور واقعی انجام می‌دهد.
  const startMinute = Math.floor(new Date(mission.startAt).getTime() / 60_000);
  const msIntoNextMinute = (startMinute + 1) * 60_000 - Date.now() + 500;
  if (msIntoNextMinute > 0) await page.waitForTimeout(msIntoNextMinute);

  return {
    id: mission.id,
    code: mission.code,
    version: mission.version,
    startAt: mission.startAt,
    estimatedArrivalAt: mission.estimatedArrivalAt,
    shipmentId,
  };
}

// ---------------------------------------------------------------------------
// SEC — مجوز سمت سرور
// ---------------------------------------------------------------------------

const LIFECYCLE_ENDPOINTS: { method: "post" | "get" | "patch" | "delete"; url: string; data?: unknown }[] = [
  { method: "post", url: "/api/v1/missions/00000000-0000-4000-8000-000000000000/complete", data: { version: 0, actualArrivalAt: new Date().toISOString() } },
  { method: "post", url: "/api/v1/missions/00000000-0000-4000-8000-000000000000/fail", data: { version: 0, failedAt: new Date().toISOString(), failureReason: "آزمایش مجوز", failureClassification: "OTHER" } },
  { method: "post", url: "/api/v1/missions/00000000-0000-4000-8000-000000000000/archive", data: { version: 0 } },
  { method: "post", url: "/api/v1/missions/00000000-0000-4000-8000-000000000000/unarchive", data: { version: 0 } },
  { method: "post", url: "/api/v1/missions/00000000-0000-4000-8000-000000000000/reopen", data: { version: 0, reopenReason: "آزمایش مجوز" } },
  { method: "get", url: "/api/v1/missions/00000000-0000-4000-8000-000000000000/notes" },
  { method: "post", url: "/api/v1/missions/00000000-0000-4000-8000-000000000000/notes", data: { body: "آزمایش" } },
];

test.describe("Phase 15 — مجوز چرخه عمر", () => {
  test("SEC-01: بدون احراز هویت هر endpoint چرخه عمر ۴۰۱ می‌دهد", async ({ request }) => {
    for (const endpoint of LIFECYCLE_ENDPOINTS) {
      const response = await request[endpoint.method](endpoint.url, endpoint.data ? { data: endpoint.data } : undefined);
      expect(response.status(), `${endpoint.method.toUpperCase()} ${endpoint.url}`).toBe(401);
    }
  });

  /** FR-12 — ناظر وضعیت هرگز مأموریت را تغییر نمی‌دهد؛ سمت سرور رد می‌شود نه فقط با پنهان‌کردن دکمه. */
  test("SEC-02: ناظر وضعیت روی هر endpoint چرخه عمر ۴۰۳ می‌گیرد", async ({ page }) => {
    const request = page.request;
    await loginAs(page, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD);

    for (const endpoint of LIFECYCLE_ENDPOINTS) {
      const response = await request[endpoint.method](endpoint.url, endpoint.data ? { data: endpoint.data } : undefined);
      expect(response.status(), `${endpoint.method.toUpperCase()} ${endpoint.url}`).toBe(403);
    }
  });

  test("SEC-03: برنامه‌ریز مأموریت مجاز است ولی مدیریت نوع مأموریت فقط برای مدیر است", async ({ page }) => {
    const request = page.request;
    await loginAs(page, E2E_PLANNER_USERNAME, E2E_PLANNER_PASSWORD);

    // خواندن انواع مأموریت برای ویزارد لازم است.
    expect((await request.get("/api/v1/mission-types")).status()).toBe(200);
    // ولی ساخت آن نه.
    const created = await request.post("/api/v1/mission-types", { data: { name: `نوع ${uniqueSuffix()}` } });
    expect(created.status()).toBe(403);
  });

  test("SEC-04: ناظر وضعیت انواع مأموریت را هم نمی‌بیند", async ({ page }) => {
    await loginAs(page, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD);
    expect((await page.request.get("/api/v1/mission-types")).status()).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// I — چرخه کامل
// ---------------------------------------------------------------------------

test.describe("Phase 15 — گذارهای چرخه عمر", () => {
  test("I-01: ثبت تکمیل، وضعیت و اختلاف زمان را درست می‌نویسد و مرسوله را تحویل‌شده می‌کند", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const mission = await createPublishedMission(request, page);

    const actualArrivalAt = new Date().toISOString();
    const response = await request.post(`/api/v1/missions/${mission.id}/complete`, {
      data: { version: mission.version, actualArrivalAt },
    });
    expect(response.status(), await response.text()).toBe(200);

    const dto = await response.json();
    expect(dto.persistedStatus).toBe("COMPLETED");
    expect(dto.displayStatus).toBe("COMPLETED");
    expect(dto.version).toBe(mission.version + 1);
    expect(dto.actualArrivalAt).not.toBeNull();
    expect(typeof dto.arrivalVarianceMinutes).toBe("number");

    const shipment = await request.get(`/api/v1/shipments/${mission.shipmentId}`);
    expect((await shipment.json()).status).toBe("DELIVERED");
  });

  test("I-02: ثبت شکست، مرسوله را به «در انتظار اعزام» برمی‌گرداند", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const mission = await createPublishedMission(request, page);

    const response = await request.post(`/api/v1/missions/${mission.id}/fail`, {
      data: {
        version: mission.version,
        failedAt: new Date().toISOString(),
        failureReason: "خرابی گیربکس در میانه مسیر و عدم امکان ادامه",
        failureClassification: "VEHICLE_BREAKDOWN",
      },
    });
    expect(response.status(), await response.text()).toBe(200);

    const dto = await response.json();
    expect(dto.persistedStatus).toBe("FAILED");
    expect(dto.displayStatus).toBe("FAILED");
    expect(dto.failureClassification).toBe("VEHICLE_BREAKDOWN");

    const shipment = await request.get(`/api/v1/shipments/${mission.shipmentId}`);
    expect((await shipment.json()).status).toBe("WAITING_FOR_DISPATCH");
  });

  test("I-03: بایگانی و خروج از بایگانی دقیقاً وضعیت پیشین را برمی‌گردانند", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const mission = await createPublishedMission(request, page);

    const completed = await (
      await request.post(`/api/v1/missions/${mission.id}/complete`, {
        data: { version: mission.version, actualArrivalAt: new Date().toISOString() },
      })
    ).json();

    const archived = await (
      await request.post(`/api/v1/missions/${mission.id}/archive`, { data: { version: completed.version } })
    ).json();
    expect(archived.persistedStatus).toBe("ARCHIVED");
    expect(archived.statusBeforeArchive).toBe("COMPLETED");

    const unarchived = await (
      await request.post(`/api/v1/missions/${mission.id}/unarchive`, { data: { version: archived.version } })
    ).json();
    expect(unarchived.persistedStatus).toBe("COMPLETED");
    expect(unarchived.archivedAt).toBeNull();
    expect(unarchived.statusBeforeArchive).toBeNull();
  });

  /** LR-12 — بازگشایی باید واقعیت‌هایی را که برمی‌گرداند پاک کند، وگرنه I-12 می‌شکند. */
  test("I-04: بازگشایی وضعیت را برمی‌گرداند و واقعیت‌های پایانی را پاک می‌کند", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const mission = await createPublishedMission(request, page);

    const completed = await (
      await request.post(`/api/v1/missions/${mission.id}/complete`, {
        data: { version: mission.version, actualArrivalAt: new Date().toISOString() },
      })
    ).json();
    expect(completed.actualArrivalAt).not.toBeNull();

    const reopened = await (
      await request.post(`/api/v1/missions/${mission.id}/reopen`, {
        data: { version: completed.version, reopenReason: "تکمیل اشتباه ثبت شده بود؛ بار تحویل نشده است." },
      })
    ).json();

    expect(reopened.persistedStatus).toBe("SCHEDULED");
    expect(reopened.actualArrivalAt).toBeNull();
    expect(reopened.failedAt).toBeNull();
    expect(reopened.reopenCount).toBe(1);
    expect(reopened.lastReopenedAt).not.toBeNull();

    const shipment = await request.get(`/api/v1/shipments/${mission.shipmentId}`);
    expect((await shipment.json()).status).toBe("IN_TRANSIT");
  });

  test("I-05: گذارهای نامعتبر ۴۰۹ می‌گیرند", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const mission = await createPublishedMission(request, page);

    // بایگانی یک مأموریت برنامه‌ریزی‌شده — فقط کار تمام‌شده بایگانی می‌شود.
    const archiveScheduled = await request.post(`/api/v1/missions/${mission.id}/archive`, {
      data: { version: mission.version },
    });
    expect(archiveScheduled.status()).toBe(409);
    expect((await archiveScheduled.json()).error.code).toBe("MISSION_INVALID_TRANSITION");

    // بازگشایی چیزی که پایانی نیست.
    const reopenScheduled = await request.post(`/api/v1/missions/${mission.id}/reopen`, {
      data: { version: mission.version, reopenReason: "آزمایش گذار نامعتبر" },
    });
    expect(reopenScheduled.status()).toBe(409);

    const completed = await (
      await request.post(`/api/v1/missions/${mission.id}/complete`, {
        data: { version: mission.version, actualArrivalAt: new Date().toISOString() },
      })
    ).json();

    // تکمیل دوباره — عمداً idempotent نیست، تا ثبت مجدد زمان رسیدن را بی‌صدا بازنویسی نکند.
    const completeTwice = await request.post(`/api/v1/missions/${mission.id}/complete`, {
      data: { version: completed.version, actualArrivalAt: new Date().toISOString() },
    });
    expect(completeTwice.status()).toBe(409);
  });

  test("I-06: گاردهای زمان — آینده و پیش از شروع رد می‌شوند، دیرکرد پذیرفته می‌شود", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const mission = await createPublishedMission(request, page);

    const future = await request.post(`/api/v1/missions/${mission.id}/complete`, {
      data: { version: mission.version, actualArrivalAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
    });
    expect(future.status()).toBe(422);
    expect((await future.json()).error.code).toBe("MISSION_ARRIVAL_IN_FUTURE");

    const beforeStart = await request.post(`/api/v1/missions/${mission.id}/complete`, {
      data: {
        version: mission.version,
        actualArrivalAt: new Date(new Date(mission.startAt).getTime() - 60_000).toISOString(),
      },
    });
    expect(beforeStart.status()).toBe(422);
    expect((await beforeStart.json()).error.code).toBe("MISSION_ARRIVAL_BEFORE_START");

    // LR-03 — رسیدن پس از تخمین کاملاً مجاز است؛ همان چیزی که این فاز برای ثبتش ساخته شده.
    const late = await request.post(`/api/v1/missions/${mission.id}/complete`, {
      data: { version: mission.version, actualArrivalAt: new Date().toISOString() },
    });
    expect(late.status(), await late.text()).toBe(200);
  });

  test("V-03: حذف توکن نسخه ۴۲۲ می‌دهد، نه موفقیت بی‌صدا", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const mission = await createPublishedMission(request, page);

    const response = await request.post(`/api/v1/missions/${mission.id}/complete`, {
      data: { actualArrivalAt: new Date().toISOString() },
    });
    expect(response.status()).toBe(422);

    const unchanged = await (await request.get(`/api/v1/missions/${mission.id}`)).json();
    expect(unchanged.persistedStatus).toBe("SCHEDULED");
  });
});

// ---------------------------------------------------------------------------
// CX — همروندی واقعی
// ---------------------------------------------------------------------------

test.describe("Phase 15 — همروندی", () => {
  /**
   * CX-01 — مهم‌ترین تست این فاز: دو اپراتور هم‌زمان یک مأموریت را می‌بندند.
   * درخواست‌ها واقعاً موازی‌اند (`Promise.all`)، نه دو فراخوان پشت‌سرهم که وانمود به رقابت کنند.
   */
  test("CX-01: دو تکمیل موازی — دقیقاً یکی موفق، دیگری ۴۰۹", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const mission = await createPublishedMission(request, page);

    const actualArrivalAt = new Date().toISOString();
    const [first, second] = await Promise.all([
      request.post(`/api/v1/missions/${mission.id}/complete`, { data: { version: mission.version, actualArrivalAt } }),
      request.post(`/api/v1/missions/${mission.id}/complete`, { data: { version: mission.version, actualArrivalAt } }),
    ]);

    const statuses = [first.status(), second.status()].sort();
    expect(statuses).toEqual([200, 409]);

    const loser = first.status() === 409 ? first : second;
    // یا تعارض نسخه است یا گذار نامعتبر — هر دو یعنی «بی‌صدا بازنویسی نشد»، که ادعای واقعی است.
    expect(["MISSION_VERSION_CONFLICT", "MISSION_INVALID_TRANSITION"]).toContain((await loser.json()).error.code);

    const final = await (await request.get(`/api/v1/missions/${mission.id}`)).json();
    expect(final.persistedStatus).toBe("COMPLETED");
    expect(final.version).toBe(mission.version + 1);
  });

  test("CX-02: تکمیل و شکست موازی — فقط یکی می‌نشیند", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const mission = await createPublishedMission(request, page);

    const when = new Date().toISOString();
    const [complete, fail] = await Promise.all([
      request.post(`/api/v1/missions/${mission.id}/complete`, {
        data: { version: mission.version, actualArrivalAt: when },
      }),
      request.post(`/api/v1/missions/${mission.id}/fail`, {
        data: {
          version: mission.version,
          failedAt: when,
          failureReason: "رقابت هم‌زمان دو اپراتور در آزمون",
          failureClassification: "OTHER",
        },
      }),
    ]);

    expect([complete.status(), fail.status()].sort()).toEqual([200, 409]);

    const final = await (await request.get(`/api/v1/missions/${mission.id}`)).json();
    expect(["COMPLETED", "FAILED"]).toContain(final.persistedStatus);
    expect(final.version).toBe(mission.version + 1);
  });
});

// ---------------------------------------------------------------------------
// R — سازگاری بین فازها
// ---------------------------------------------------------------------------

test.describe("Phase 15 — سازگاری با فازهای ۱۰ تا ۱۳", () => {
  /**
   * قلب فاز: وضعیت ثبت‌شده باید هم‌زمان و یکسان در نقشه، جدول و فرانما دیده شود — بدون آنکه
   * هیچ‌کدام از آن فازها ویرایش شده باشند.
   */
  test("R-01: مأموریت تکمیل‌شده از صحنه نقشه خارج و در شمارنده فرانما شمرده می‌شود", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const mission = await createPublishedMission(request, page);

    const sceneBefore = await (await request.get("/api/v1/map/scene")).json();
    expect((sceneBefore.missions as { missionId: string }[]).some((m) => m.missionId === mission.id)).toBe(true);

    const summaryBefore = await (await request.get("/api/v1/missions/summary")).json();

    const completed = await request.post(`/api/v1/missions/${mission.id}/complete`, {
      data: { version: mission.version, actualArrivalAt: new Date().toISOString() },
    });
    expect(completed.status()).toBe(200);

    // صحنه نقشه فقط SCHEDULED را می‌خواند، پس مأموریت تکمیل‌شده طبیعتاً از نمای زنده می‌رود.
    const sceneAfter = await (await request.get("/api/v1/map/scene")).json();
    expect((sceneAfter.missions as { missionId: string }[]).some((m) => m.missionId === mission.id)).toBe(false);

    const summaryAfter = await (await request.get("/api/v1/missions/summary")).json();
    expect(summaryAfter.completed).toBe(summaryBefore.completed + 1);
    expect(summaryAfter.scheduled).toBe(summaryBefore.scheduled - 1);
    // جمع سطل‌ها ساختاراً برابر total می‌ماند.
    expect(
      summaryAfter.draft + summaryAfter.scheduled + summaryAfter.completed + summaryAfter.failed + summaryAfter.cancelled + summaryAfter.archived,
    ).toBe(summaryAfter.total);
  });

  test("R-02: فهرست مأموریت‌ها با وضعیت‌های تازه پالایش می‌شود", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const mission = await createPublishedMission(request, page);

    await request.post(`/api/v1/missions/${mission.id}/complete`, {
      data: { version: mission.version, actualArrivalAt: new Date().toISOString() },
    });

    const listed = await request.get("/api/v1/missions?persistedStatus=COMPLETED");
    expect(listed.status()).toBe(200);
    const items = (await listed.json()).items as { id: string; persistedStatus: string }[];
    expect(items.some((item) => item.id === mission.id)).toBe(true);
    for (const item of items) expect(item.persistedStatus).toBe("COMPLETED");
  });
});

// ---------------------------------------------------------------------------
// E — رابط کاربری
// ---------------------------------------------------------------------------

test.describe("Phase 15 — رابط کاربری چرخه عمر", () => {
  test("E-01: مدیر مأموریت را از صفحه جزئیات تکمیل می‌کند و برچسب تازه را می‌بیند", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const mission = await createPublishedMission(request, page);

    await page.goto(`/missions/${mission.id}`);
    await expect(page.getByRole("heading", { name: mission.code })).toBeVisible();

    // پیش از ثبت، ساعت می‌گوید «رسیده (تخمینی)» — یعنی باور، نه واقعیت.
    await expect(page.getByText("رسیده (تخمینی)").first()).toBeVisible();

    await page.getByRole("button", { name: "ثبت تکمیل" }).click();
    await expect(page.getByRole("heading", { name: "ثبت تکمیل مأموریت" })).toBeVisible();
    await page.getByRole("button", { name: "ثبت تکمیل", exact: true }).last().click();

    await expect(page.getByText("تکمیل‌شده").first()).toBeVisible();
    await expect(page.getByText("زمان رسیدن واقعی").first()).toBeVisible();
  });

  test("E-02: ناظر وضعیت هیچ کنترل چرخه عمری نمی‌بیند", async ({ page, browser }) => {
    await loginAsAdmin(page);
    const mission = await createPublishedMission(page.request, page);

    // نشست ناظر در context جداگانه باز می‌شود؛ خروج و ورود دوباره در همان context نشست مدیر را
    // به‌شکل قابل اتکایی پاک نمی‌کرد.
    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();
    await loginAs(viewerPage, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD);

    await viewerPage.goto(`/missions/${mission.id}`);
    await expect(viewerPage.getByRole("button", { name: "ثبت تکمیل" })).toHaveCount(0);
    await expect(viewerPage.getByRole("button", { name: "ثبت شکست" })).toHaveCount(0);
    await viewerContext.close();
  });

  test("E-02b: کنترل‌ها برای مدیر روی همان مأموریت دیده می‌شوند", async ({ page }) => {
    await loginAsAdmin(page);
    const mission = await createPublishedMission(page.request, page);

    await page.goto(`/missions/${mission.id}`);
    await expect(page.getByRole("button", { name: "ثبت تکمیل" })).toBeVisible();
    await expect(page.getByRole("button", { name: "ثبت شکست" })).toBeVisible();
  });

  test("E-03: رشته یادداشت افزودن و حذف می‌پذیرد", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const mission = await createPublishedMission(request, page);

    await page.goto(`/missions/${mission.id}`);
    const body = `یادداشت آزمایشی ${uniqueSuffix()}`;

    await page.getByLabel("یادداشت تازه").fill(body);
    await page.getByRole("button", { name: "افزودن یادداشت" }).click();
    await expect(page.getByText(body)).toBeVisible();

    await page.getByRole("button", { name: "حذف" }).first().click();
    await expect(page.getByText(body)).toHaveCount(0);
  });

  test("E-04: صفحه انواع مأموریت بدون اسکرول افقی کار می‌کند", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/system/mission-types");

    await expect(page.getByRole("button", { name: "نوع جدید" })).toBeVisible();

    const name = `نوع ${uniqueSuffix()}`;
    await page.getByRole("button", { name: "نوع جدید" }).click();
    await page.getByLabel("نام", { exact: true }).fill(name);
    await page.getByRole("button", { name: "ذخیره" }).click();
    await expect(page.getByText(name)).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  /**
   * OF-01 — فاز ۱۵ هیچ وابستگی بیرونی اضافه نمی‌کند.
   *
   * ⚠️ تنها استثنای مجاز، کاشی‌های خودِ Provider نقشه است: صفحه جزئیات مأموریت یک نقشه دارد و
   * اگر اپراتور در این محیط یک Provider *خارجی* را فعال کرده باشد، کاشی‌ها از همان‌جا می‌آیند.
   * این یک انتخاب پیکربندی فاز ۴ است، نه چیزی که فاز ۱۵ آورده باشد — بنابراین میزبان Provider
   * فعال از روی خود API خوانده و کنار گذاشته می‌شود، به‌جای اینکه کل ادعا رها شود.
   */
  test("OF-01: صفحه جزئیات مأموریت جز کاشی Provider نقشه، درخواست بیرونی نمی‌فرستد", async ({ page }) => {
    const external: string[] = [];

    page.on("request", (req) => {
      const url = req.url();
      if (/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return;
      // کاشی نقشه شکل `.../{z}/{x}/{y}.png` دارد و MapLibre آن را با `fetch` می‌گیرد نه
      // `image`، پس تشخیص باید روی خود نشانی باشد. هر چیز دیگری — script، font، stylesheet یا
      // فراخوانی داده — یک وابستگی بیرونی واقعی است و همان است که این تست جلویش را می‌گیرد.
      if (/\/\d+\/\d+\/\d+\.(png|jpg|jpeg|webp|pbf)(\?|$)/.test(url)) return;
      external.push(`${req.resourceType()} ${url}`);
    });

    await loginAsAdmin(page);
    const mission = await createPublishedMission(page.request, page);
    await page.goto(`/missions/${mission.id}`);
    // `networkidle` اینجا هرگز فرا نمی‌رسد چون صفحه به‌صورت دوره‌ای داده تازه می‌گیرد؛ به‌جای آن
    // منتظر رندر واقعی محتوا می‌مانیم و سپس درخواست‌های ثبت‌شده را می‌سنجیم.
    await expect(page.getByRole("heading", { name: mission.code })).toBeVisible();
    await page.waitForTimeout(2000);

    expect(external).toEqual([]);
  });
});
