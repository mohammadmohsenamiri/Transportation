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

test.describe("انواع خودرو، نوع بار و ناوگان — Phase 3", () => {
  test("Admin دو نوع خودرو و سه خودرو می‌سازد و خارج‌کردن از سرویس آمار را تغییر می‌دهد", async ({
    page,
  }, testInfo) => {
    const prefix = `F${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    const truckTypeName = `کامیونت ${prefix}`;
    const pickupTypeName = `وانت ${prefix}`;

    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);

    // آمار ناوگان سراسری است (نه محدود به این تست)؛ چون تست‌ها ممکن است موازی روی سایر
    // viewportها هم داده بسازند، باید نسبت به یک baseline سنجیده شود، نه مقدار مطلق.
    const baselineResponse = await page.request.get("/api/v1/vehicles/summary");
    const baseline = await baselineResponse.json();

    await page.goto("/system/vehicle-types");
    await page.getByRole("button", { name: "افزودن نوع خودرو" }).click();
    await page.locator('input[name="name"]').fill(truckTypeName);
    await page.getByRole("button", { name: "ایجاد", exact: true }).click();
    await expect(page.getByText(truckTypeName)).toBeVisible();

    await page.getByRole("button", { name: "افزودن نوع خودرو" }).click();
    await page.locator('input[name="name"]').fill(pickupTypeName);
    await page.getByRole("button", { name: "ایجاد", exact: true }).click();
    await expect(page.getByText(pickupTypeName)).toBeVisible();

    await page.goto("/system/vehicles");

    async function addVehicle(identifier: string, typeName: string) {
      await page.getByRole("button", { name: "افزودن خودرو" }).click();
      await page.locator('input[name="identifier"]').fill(identifier);
      await page.locator('select[name="vehicleTypeId"]').selectOption({ label: typeName });
      await page.locator('input[name="fuelTankLiters"]').fill("80");
      await page.locator('input[name="avgConsumptionPer100Km"]').fill("25");
      await page.locator('input[name="avgSpeedKmh"]').fill("70");
      await page.getByRole("button", { name: "ایجاد", exact: true }).click();
      // جدول (دسکتاپ) و کارت‌های موبایل هر دو در DOM هستند؛ فقط نسخه‌ی قابل‌مشاهده در این viewport بررسی شود
      await expect(page.getByText(identifier).filter({ visible: true })).toBeVisible();
    }

    await addVehicle(`${prefix}-V1`, truckTypeName);
    await addVehicle(`${prefix}-V2`, truckTypeName);
    await addVehicle(`${prefix}-V3`, pickupTypeName);

    // آمار سراسری است؛ نسبت به baseline سه واحد رشد کرده باشد کافی است (مقایسه دقیق عدد مطلق
    // به‌خاطر اجرای موازی تست‌ها روی چند viewport و داده‌های قبلی سیستم قابل‌اعتماد نیست)
    async function expectSummaryDelta(totalDelta: number, readyDelta: number, outOfServiceDelta: number) {
      await expect(async () => {
        const response = await page.request.get("/api/v1/vehicles/summary");
        const current = await response.json();
        expect(current.total - baseline.total).toBe(totalDelta);
        expect(current.ready - baseline.ready).toBe(readyDelta);
        expect(current.outOfService - baseline.outOfService).toBe(outOfServiceDelta);
      }).toPass({ timeout: 10_000 });
    }

    await expectSummaryDelta(3, 3, 0);

    await page
      .getByRole("button", { name: `ویرایش خودرو ${prefix}-V2` })
      .filter({ visible: true })
      .click();
    await page.locator('select[name="readiness"]').selectOption("OUT_OF_SERVICE");
    await page.getByRole("button", { name: "ذخیره تغییرات" }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    await expectSummaryDelta(3, 2, 1);
  });

  test("مقادیر منفی، شناسه/نام تکراری و حذف نوع استفاده‌شده مدیریت می‌شوند", async ({ page }, testInfo) => {
    const prefix = `R${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);

    const typeResponse = await page.request.post("/api/v1/vehicle-types", {
      data: { name: `نوع ${prefix}` },
    });
    expect(typeResponse.status()).toBe(201);
    const typeId = (await typeResponse.json()).id as string;

    const duplicateType = await page.request.post("/api/v1/vehicle-types", {
      data: { name: `نوع ${prefix}` },
    });
    expect(duplicateType.status()).toBe(422);

    const negativeFuel = await page.request.post("/api/v1/vehicles", {
      data: {
        identifier: `${prefix}-N`,
        vehicleTypeId: typeId,
        fuelTankLiters: -10,
        avgConsumptionPer100Km: 20,
        avgSpeedKmh: 60,
      },
    });
    expect(negativeFuel.status()).toBe(422);

    const vehicleResponse = await page.request.post("/api/v1/vehicles", {
      data: {
        identifier: `${prefix}-DUP`,
        vehicleTypeId: typeId,
        fuelTankLiters: 60,
        avgConsumptionPer100Km: 18,
        avgSpeedKmh: 65,
      },
    });
    expect(vehicleResponse.status()).toBe(201);

    const duplicateIdentifier = await page.request.post("/api/v1/vehicles", {
      data: {
        identifier: `${prefix}-DUP`,
        vehicleTypeId: typeId,
        fuelTankLiters: 60,
        avgConsumptionPer100Km: 18,
        avgSpeedKmh: 65,
      },
    });
    expect(duplicateIdentifier.status()).toBe(422);
    const duplicateBody = await duplicateIdentifier.json();
    expect(duplicateBody.error.code).toBe("VEHICLE_IDENTIFIER_DUPLICATE");

    const blockedDeleteType = await page.request.delete(`/api/v1/vehicle-types/${typeId}`);
    expect(blockedDeleteType.status()).toBe(409);

    const vehicleId = (await vehicleResponse.json()).id as string;
    const deleteVehicle = await page.request.delete(`/api/v1/vehicles/${vehicleId}`);
    expect(deleteVehicle.status()).toBe(204);

    const deleteTypeNowAllowed = await page.request.delete(`/api/v1/vehicle-types/${typeId}`);
    expect(deleteTypeNowAllowed.status()).toBe(204);
  });

  test("نقش غیر Admin (STATUS_VIEWER) از صفحات و API ناوگان رد می‌شود", async ({ page }) => {
    await loginAs(page, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD);

    await page.goto("/system/vehicles");
    await expect(page.getByText("دسترسی مجاز نیست")).toBeVisible();
    await expect(page.getByRole("button", { name: "افزودن خودرو" })).toHaveCount(0);

    const listResponse = await page.request.get("/api/v1/vehicles");
    expect(listResponse.status()).toBe(403);

    const createResponse = await page.request.post("/api/v1/vehicle-types", {
      data: { name: "نباید ساخته شود" },
    });
    expect(createResponse.status()).toBe(403);
  });
});
