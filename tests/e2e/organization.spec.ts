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

test.describe("ساختار سازمانی — Phase 2", () => {
  test("Admin چهار سطح می‌سازد، مختصات را ویرایش و تاریخچه را می‌بیند", async ({ page }, testInfo) => {
    const prefix = `T${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    const countryName = `کشور ${prefix}`;
    const groupName = `گروه ${prefix}`;
    const distributorName = `توزیع ${prefix}`;
    const warehouseName = `انبار ${prefix}`;

    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    await page.goto("/organization");

    await page.getByRole("button", { name: "افزودن دفتر کشوری" }).click();
    await page.locator('input[name="code"]').fill(`${prefix}-IR`);
    await page.locator('input[name="name"]').fill(countryName);
    await page.getByRole("button", { name: "ایجاد", exact: true }).click();
    await expect(page.getByText(countryName)).toBeVisible();

    await page.getByRole("button", { name: `افزودن زیرمجموعه به ${countryName}` }).click();
    await page.locator('input[name="code"]').fill(`${prefix}-GR`);
    await page.locator('input[name="name"]').fill(groupName);
    await page.getByRole("button", { name: "ایجاد", exact: true }).click();
    await expect(page.getByText(groupName)).toBeVisible();

    await page.getByRole("button", { name: `افزودن زیرمجموعه به ${groupName}` }).click();
    await page.locator('input[name="code"]').fill(`${prefix}-DI`);
    await page.locator('input[name="name"]').fill(distributorName);
    await page.getByRole("button", { name: "ایجاد", exact: true }).click();
    await expect(page.getByText(distributorName)).toBeVisible();

    await page.getByRole("button", { name: `افزودن زیرمجموعه به ${distributorName}` }).click();
    await page.locator('input[name="code"]').fill(`${prefix}-W1`);
    await page.locator('input[name="name"]').fill(warehouseName);
    await page.locator('input[name="latitude"]').fill("35.6892");
    await page.locator('input[name="longitude"]').fill("51.389");
    await expect(page.getByText(/پیش‌نمایش مختصات/)).toBeVisible();
    await page.getByRole("button", { name: "ایجاد", exact: true }).click();
    await expect(page.getByText(warehouseName)).toBeVisible();

    // جست‌وجو — رگرسیون باگ «فیلتر با ورودی خالی، درخت را کاملاً پنهان می‌کرد»
    await page.getByPlaceholder("جست‌وجو بر اساس نام یا کد...").fill(warehouseName);
    await expect(page.getByText(warehouseName)).toBeVisible();
    await expect(page.getByText(countryName)).toBeVisible();
    await page.getByPlaceholder("جست‌وجو بر اساس نام یا کد...").fill("");
    await expect(page.getByText(countryName)).toBeVisible();

    // ویرایش مختصات
    await page.getByRole("button", { name: `ویرایش ${warehouseName}` }).click();
    await page.locator('input[name="latitude"]').fill("36.0000");
    await page.getByRole("button", { name: "ذخیره تغییرات" }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // تاریخچه
    await page.getByRole("button", { name: `ویرایش ${warehouseName}` }).click();
    await expect(page.getByText("ایجاد شد")).toBeVisible();
    await expect(page.getByText("ویرایش شد")).toBeVisible();
  });

  test("سطح/والد نامعتبر، کد تکراری و مختصات نامعتبر رد می‌شوند", async ({ page }, testInfo) => {
    const prefix = `V${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);

    // سطح GROUP_OFFICE بدون والد
    const invalidParent = await page.request.post("/api/v1/organization-units", {
      data: { code: `${prefix}-A`, name: "بدون والد", level: "GROUP_OFFICE", parentId: null },
    });
    expect(invalidParent.status()).toBe(422);
    const invalidParentBody = await invalidParent.json();
    expect(invalidParentBody.error.fieldErrors.parentId).toBeTruthy();

    // ایجاد یک دفتر کشوری معتبر برای تست سطح والد اشتباه
    const country = await page.request.post("/api/v1/organization-units", {
      data: { code: `${prefix}-C`, name: "کشور", level: "COUNTRY_OFFICE", parentId: null },
    });
    expect(country.status()).toBe(201);
    const countryId = (await country.json()).id as string;

    // WAREHOUSE با والد از سطح اشتباه (COUNTRY_OFFICE به‌جای DISTRIBUTOR_OFFICE)
    const wrongLevel = await page.request.post("/api/v1/organization-units", {
      data: { code: `${prefix}-W`, name: "انبار نامعتبر", level: "WAREHOUSE", parentId: countryId },
    });
    expect(wrongLevel.status()).toBe(422);

    // کد تکراری
    const duplicate = await page.request.post("/api/v1/organization-units", {
      data: { code: `${prefix}-C`, name: "کشور تکراری", level: "COUNTRY_OFFICE", parentId: null },
    });
    expect(duplicate.status()).toBe(422);
    const duplicateBody = await duplicate.json();
    expect(duplicateBody.error.code).toBe("ORGANIZATION_CODE_DUPLICATE");

    // مختصات خارج از محدوده
    const invalidCoords = await page.request.post("/api/v1/organization-units", {
      data: {
        code: `${prefix}-D`,
        name: "مختصات نامعتبر",
        level: "COUNTRY_OFFICE",
        parentId: null,
        latitude: 200,
      },
    });
    expect(invalidCoords.status()).toBe(422);
  });

  test("حذف گره دارای زیرمجموعه رد و بعد از حذف فرزند مجاز می‌شود", async ({ page }, testInfo) => {
    const prefix = `D${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);

    const parent = await page.request.post("/api/v1/organization-units", {
      data: { code: `${prefix}-P`, name: "والد", level: "COUNTRY_OFFICE", parentId: null },
    });
    const parentId = (await parent.json()).id as string;

    const child = await page.request.post("/api/v1/organization-units", {
      data: { code: `${prefix}-C`, name: "فرزند", level: "GROUP_OFFICE", parentId },
    });
    const childId = (await child.json()).id as string;

    const blockedDelete = await page.request.delete(`/api/v1/organization-units/${parentId}`);
    expect(blockedDelete.status()).toBe(409);

    const deleteChild = await page.request.delete(`/api/v1/organization-units/${childId}`);
    expect(deleteChild.status()).toBe(204);

    const deleteParent = await page.request.delete(`/api/v1/organization-units/${parentId}`);
    expect(deleteParent.status()).toBe(204);
  });

  test("نقش غیر Admin (STATUS_VIEWER) از صفحه و API مدیریت سازمانی رد می‌شود", async ({ page }) => {
    await loginAs(page, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD);

    await page.goto("/organization");
    await expect(page.getByText("دسترسی مجاز نیست")).toBeVisible();
    await expect(page.getByRole("button", { name: "افزودن دفتر کشوری" })).toHaveCount(0);

    const listResponse = await page.request.get("/api/v1/organization-tree");
    expect(listResponse.status()).toBe(403);

    const createResponse = await page.request.post("/api/v1/organization-units", {
      data: { code: "SHOULD-FAIL", name: "نباید ساخته شود", level: "COUNTRY_OFFICE", parentId: null },
    });
    expect(createResponse.status()).toBe(403);
  });
});
