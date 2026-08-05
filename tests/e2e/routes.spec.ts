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
  await page.request.post("/api/v1/map-providers", {
    data: {
      name: `${prefix}-osm`,
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
}

const VALID_CSV = "sequence,latitude,longitude,label\n1,35.6892,51.389,مبدا\n2,35.7219,51.3347,نقطه میانی\n3,35.84,50.9391,مقصد\n";
const INVALID_HEADER_CSV = "seq,lat,lng,lbl\n1,35.6892,51.389,مبدا\n";
const INVALID_RANGE_CSV = "sequence,latitude,longitude,label\n1,999,51.389,مبدا\n2,35.7219,51.3347,مقصد\n";

test.describe("مدیریت مسیر — Phase 5", () => {
  test("Admin مسیر را از CSV نمونه وارد می‌کند و export دقیقاً همان داده را برمی‌گرداند", async ({ page }, testInfo) => {
    const prefix = `C${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);

    await page.goto("/routes/new");
    await expect(page.getByRole("heading", { name: "مسیر جدید" })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: "route.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(VALID_CSV, "utf-8"),
    });

    await expect(page.getByText(/اعتبارسنجی موفق/)).toBeVisible();
    await expect(page.getByText("۳ نقطه", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "ایجاد مسیر از این داده‌ها" }).click();
    await page.getByLabel("شناسه مسیر").fill(`${prefix}-RT`);
    await page.getByLabel("نام مسیر").fill(`مسیر تست ${prefix}`);
    await page.getByRole("button", { name: "ذخیره مسیر" }).click();

    await expect.poll(() => page.url()).not.toContain("/routes/new");
    await expect(page.getByRole("heading", { name: `مسیر تست ${prefix}` })).toBeVisible();
    await expect(page.getByText(`${prefix}-RT`, { exact: false })).toBeVisible();
    await expect(page.getByText("۳", { exact: false }).first()).toBeVisible();

    const routeId = page.url().split("/").pop() as string;
    const exportResponse = await page.request.get(`/api/v1/routes/${routeId}/export.csv`);
    expect(exportResponse.status()).toBe(200);
    expect(exportResponse.headers()["content-type"]).toContain("text/csv");
    const csvBody = await exportResponse.text();
    expect(csvBody.split("\r\n")[0]).toBe("sequence,latitude,longitude,label");
    expect(csvBody).toContain("مبدا");
    expect(csvBody).toContain("مقصد");
  });

  test("خطاهای فایل CSV (سرستون نامعتبر و مختصات خارج از محدوده) با پیام دقیق رد می‌شوند", async ({ page }) => {
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await page.goto("/routes/new");

    await page.locator('input[type="file"]').setInputFiles({
      name: "bad-header.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(INVALID_HEADER_CSV, "utf-8"),
    });
    await expect(page.getByText(/سرستون فایل باید دقیقاً/)).toBeVisible();
    await expect(page.getByRole("button", { name: "ایجاد مسیر از این داده‌ها" })).toHaveCount(0);

    await page.locator('input[type="file"]').setInputFiles({
      name: "bad-range.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(INVALID_RANGE_CSV, "utf-8"),
    });
    await expect(page.getByText(/عرض جغرافیایی باید عددی بین/)).toBeVisible();
    await expect(page.getByRole("button", { name: "ایجاد مسیر از این داده‌ها" })).toHaveCount(0);
  });

  test("Planner مسیر را با Tap روی نقشه ترسیم می‌کند", async ({ page }, testInfo) => {
    const prefix = `D${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await ensureActiveMapProvider(page, prefix);
    await page.context().clearCookies();

    await loginAs(page, E2E_PLANNER_USERNAME, E2E_PLANNER_PASSWORD);
    await page.goto("/routes/new");
    await page.getByRole("button", { name: "ترسیم روی نقشه" }).click();

    const canvas = page.locator(".maplibregl-canvas");
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("کانواس نقشه یافت نشد.");

    await canvas.click({ position: { x: box.width * 0.25, y: box.height * 0.3 } });
    await canvas.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
    await canvas.click({ position: { x: box.width * 0.75, y: box.height * 0.65 } });

    await expect(page.locator("table tbody tr")).toHaveCount(3);

    await page.getByRole("button", { name: "پایان مسیر" }).click();
    await page.getByLabel("شناسه مسیر").fill(`${prefix}-RT`);
    await page.getByLabel("نام مسیر").fill(`مسیر ترسیمی ${prefix}`);
    await page.getByRole("button", { name: "ذخیره مسیر" }).click();

    await expect.poll(() => page.url()).not.toContain("/routes/new");
    await expect(page.getByRole("heading", { name: `مسیر ترسیمی ${prefix}` })).toBeVisible();
    await expect(page.getByText("ترسیم روی نقشه")).toBeVisible();
  });

  test("Admin نقاط مسیر را ویرایش می‌کند و نسخه جدید ساخته می‌شود", async ({ page }, testInfo) => {
    const prefix = `V${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);

    const createResponse = await page.request.post("/api/v1/routes", {
      data: {
        code: `${prefix}-RT`,
        name: `مسیر ${prefix}`,
        source: "MAP_DRAWING",
        points: [
          { sequence: 1, latitude: 35.6892, longitude: 51.389, label: "مبدا" },
          { sequence: 2, latitude: 35.84, longitude: 50.9391, label: "مقصد" },
        ],
      },
    });
    expect(createResponse.status()).toBe(201);
    const original = await createResponse.json();
    expect(original.version).toBe(1);

    await page.goto(`/routes/${original.id}`);
    await page.getByRole("button", { name: "ویرایش نقاط (نسخه جدید)" }).click();

    // اصلاح نقطه اول با مقدار جدید عرض جغرافیایی
    await page.getByLabel("عرض جغرافیایی نقطه 1").fill("35.7");
    await page.getByRole("button", { name: "ذخیره نسخه جدید" }).click();

    await expect.poll(() => page.url(), { timeout: 15_000 }).not.toContain(original.id);
    const newRouteId = page.url().split("/").pop() as string;
    expect(newRouteId).not.toBe(original.id);

    const newRoute = await (await page.request.get(`/api/v1/routes/${newRouteId}`)).json();
    expect(newRoute.version).toBe(2);
    expect(newRoute.code).toBe(`${prefix}-RT`);

    const oldRoute = await (await page.request.get(`/api/v1/routes/${original.id}`)).json();
    expect(oldRoute.isActive).toBe(false);

    // در فهرست فقط آخرین نسخه (v2) دیده شود
    const listResponse = await page.request.get(`/api/v1/routes?q=${prefix}`);
    const listBody = await listResponse.json();
    expect(listBody.items).toHaveLength(1);
    expect(listBody.items[0].version).toBe(2);
  });

  test("Admin مسیر را تکثیر و غیرفعال/فعال می‌کند", async ({ page }, testInfo) => {
    const prefix = `X${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);

    const createResponse = await page.request.post("/api/v1/routes", {
      data: {
        code: `${prefix}-RT`,
        name: `مسیر ${prefix}`,
        source: "MAP_DRAWING",
        points: [
          { sequence: 1, latitude: 35.6892, longitude: 51.389, label: null },
          { sequence: 2, latitude: 35.84, longitude: 50.9391, label: null },
        ],
      },
    });
    const original = await createResponse.json();

    await page.goto(`/routes/${original.id}`);
    await page.getByRole("button", { name: "تکثیر" }).click();
    const duplicateDialog = page.getByRole("dialog", { name: "تکثیر مسیر" });
    await duplicateDialog.getByLabel("شناسه مسیر جدید").fill(`${prefix}-RT-COPY`);
    await duplicateDialog.getByLabel("نام مسیر جدید").fill(`مسیر ${prefix} (کپی)`);
    await duplicateDialog.getByRole("button", { name: "تکثیر" }).click();

    await expect.poll(() => page.url(), { timeout: 15_000 }).not.toContain(original.id);
    const copyId = page.url().split("/").pop() as string;
    expect(copyId).not.toBe(original.id);
    await expect(page.getByRole("heading", { name: `مسیر ${prefix} (کپی)` })).toBeVisible();

    await page.getByRole("button", { name: "غیرفعال‌سازی" }).click();
    await page.getByRole("alertdialog", { name: "غیرفعال‌سازی مسیر" }).getByRole("button", { name: "غیرفعال‌سازی" }).click();
    await expect(page.getByText("غیرفعال", { exact: true })).toBeVisible();

    const deactivated = await (await page.request.get(`/api/v1/routes/${copyId}`)).json();
    expect(deactivated.isActive).toBe(false);
  });

  test("نقش بیننده وضعیت مسیرها را می‌بیند اما دسترسی مدیریت ندارد", async ({ page }) => {
    await loginAs(page, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD);

    await page.goto("/routes");
    await expect(page.getByRole("heading", { name: "مدیریت مسیرها" })).toBeVisible();
    await expect(page.getByRole("link", { name: "مسیر جدید" })).toHaveCount(0);

    await page.goto("/routes/new");
    await expect(page.getByText("دسترسی مجاز نیست")).toBeVisible();

    const listResponse = await page.request.get("/api/v1/routes");
    expect(listResponse.status()).toBe(200);

    const createResponse = await page.request.post("/api/v1/routes", {
      data: {
        code: "VIEWER-BLOCKED",
        name: "نباید ساخته شود",
        source: "MAP_DRAWING",
        points: [
          { sequence: 1, latitude: 35.6892, longitude: 51.389, label: null },
          { sequence: 2, latitude: 35.84, longitude: 50.9391, label: null },
        ],
      },
    });
    expect(createResponse.status()).toBe(403);
  });
});
