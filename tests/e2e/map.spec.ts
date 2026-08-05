import { expect, test, type Page } from "@playwright/test";
import {
  E2E_ADMIN_USERNAME,
  E2E_ADMIN_PASSWORD,
  E2E_VIEWER_USERNAME,
  E2E_VIEWER_PASSWORD,
} from "./global-setup";

async function loginAs(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("نام کاربری").fill(username);
  await page.getByLabel("رمز عبور").fill(password);
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe("نقشه داخلی و Provider نقشه — Phase 4", () => {
  test("بدون Provider فعال، نقشه پیام فارسی مناسب نشان می‌دهد", async ({ page }) => {
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);

    // به‌جای دستکاری Providerهای واقعی (که با اجرای موازی سایر تست‌ها روی این فایل تداخل
    // می‌کند)، فقط همین درخواست را mock می‌کنیم تا حالت «بدون Provider» بدون اثر جانبی تست شود
    await page.route("**/api/v1/map-providers/active", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ provider: null }) }),
    );

    await page.goto("/map");
    await expect(page.getByText("Provider نقشه تنظیم نشده است")).toBeVisible();
    // shell باید سالم بماند — منو و ناوبری قابل استفاده است
    await expect(page.getByRole("link", { name: "داشبورد" }).filter({ visible: true })).toBeVisible();
  });

  test("Admin یک Provider می‌سازد، اتصال را تست می‌کند و کاشی‌های واقعی بارگذاری می‌شوند", async ({ page }, testInfo) => {
    const prefix = `P${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);

    const createResponse = await page.request.post("/api/v1/map-providers", {
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
    expect(createResponse.status()).toBe(201);
    const provider = await createResponse.json();

    const testResponse = await page.request.post(`/api/v1/map-providers/${provider.id}/test`);
    expect(testResponse.status()).toBe(200);
    const testResult = await testResponse.json();
    expect(testResult.success).toBe(true);

    const tileRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("tile.openstreetmap.org")) tileRequests.push(request.url());
    });

    await page.goto("/map");
    await expect(page.getByRole("heading", { name: "نقشه عملیات" })).toBeVisible();
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    await expect.poll(() => tileRequests.length, { timeout: 15_000 }).toBeGreaterThan(0);
  });

  test("سطوح سازمانی به‌عنوان فیلتر قابل تغییر نمایش داده می‌شوند", async ({ page }) => {
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await page.goto("/map");

    await expect(page.getByRole("button", { name: /دفتر کشوری/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /دفتر گروه/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /دفتر توزیع‌کننده/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /انبار/ })).toBeVisible();

    const warehouseToggle = page.getByRole("button", { name: /انبار/ });
    await expect(warehouseToggle).toHaveAttribute("aria-pressed", "true");
    await warehouseToggle.click();
    await expect(warehouseToggle).toHaveAttribute("aria-pressed", "false");
  });

  test("قالب آدرس نامعتبر، نام تکراری و بزرگ‌نمایی نامعتبر رد می‌شوند", async ({ page }, testInfo) => {
    const prefix = `V${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);

    const invalidUrl = await page.request.post("/api/v1/map-providers", {
      data: {
        name: `${prefix}-bad-url`,
        kind: "INTERNAL_XYZ",
        urlTemplate: "https://tiles.internal.local/no-placeholders.png",
        minZoom: 0,
        maxZoom: 19,
        tileSize: 256,
        requiresApiKey: false,
      },
    });
    expect(invalidUrl.status()).toBe(422);

    const invalidZoom = await page.request.post("/api/v1/map-providers", {
      data: {
        name: `${prefix}-bad-zoom`,
        kind: "INTERNAL_XYZ",
        urlTemplate: "https://tiles.internal.local/{z}/{x}/{y}.png",
        minZoom: 15,
        maxZoom: 5,
        tileSize: 256,
        requiresApiKey: false,
      },
    });
    expect(invalidZoom.status()).toBe(422);

    const valid = await page.request.post("/api/v1/map-providers", {
      data: {
        name: `${prefix}-ok`,
        kind: "INTERNAL_XYZ",
        urlTemplate: "https://tiles.internal.local/{z}/{x}/{y}.png",
        minZoom: 0,
        maxZoom: 19,
        tileSize: 256,
        requiresApiKey: false,
      },
    });
    expect(valid.status()).toBe(201);

    const duplicate = await page.request.post("/api/v1/map-providers", {
      data: {
        name: `${prefix}-ok`,
        kind: "INTERNAL_XYZ",
        urlTemplate: "https://tiles.internal.local/{z}/{x}/{y}.png",
        minZoom: 0,
        maxZoom: 19,
        tileSize: 256,
        requiresApiKey: false,
      },
    });
    expect(duplicate.status()).toBe(422);
    const duplicateBody = await duplicate.json();
    expect(duplicateBody.error.code).toBe("MAP_PROVIDER_DUPLICATE");
  });

  test("نقش‌های غیرمدیر نقشه را می‌بینند اما به مدیریت Provider دسترسی ندارند", async ({ page }) => {
    await loginAs(page, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD);

    // Viewer باید بتواند صفحه نقشه را ببیند (بدون کرش)
    await page.goto("/map");
    await expect(page.getByRole("heading", { name: "نقشه عملیات" })).toBeVisible();

    const mapUnitsResponse = await page.request.get("/api/v1/map/organization-units");
    expect(mapUnitsResponse.status()).toBe(200);
    const activeProviderResponse = await page.request.get("/api/v1/map-providers/active");
    expect(activeProviderResponse.status()).toBe(200);

    // اما مدیریت Provider همچنان فقط Admin است
    await page.goto("/system/map-providers");
    await expect(page.getByText("دسترسی مجاز نیست")).toBeVisible();

    const adminListResponse = await page.request.get("/api/v1/map-providers");
    expect(adminListResponse.status()).toBe(403);

    const createResponse = await page.request.post("/api/v1/map-providers", {
      data: {
        name: "نباید ساخته شود",
        kind: "INTERNAL_XYZ",
        urlTemplate: "https://tiles.internal.local/{z}/{x}/{y}.png",
        minZoom: 0,
        maxZoom: 19,
        tileSize: 256,
        requiresApiKey: false,
      },
    });
    expect(createResponse.status()).toBe(403);
  });
});
