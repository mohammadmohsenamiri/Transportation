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

interface OrgTree {
  countryId: string;
  groupId: string;
  distributorId: string;
  warehouseId: string;
  warehouseName: string;
  secondWarehouseId: string;
  secondWarehouseName: string;
}

async function buildOrgTree(page: Page, prefix: string): Promise<OrgTree> {
  async function create(data: Record<string, unknown>): Promise<string> {
    const response = await page.request.post("/api/v1/organization-units", { data });
    expect(response.status()).toBe(201);
    return (await response.json()).id as string;
  }

  const countryId = await create({ code: `${prefix}-IR`, name: `کشور ${prefix}`, level: "COUNTRY_OFFICE", parentId: null });
  const groupId = await create({ code: `${prefix}-GR`, name: `گروه ${prefix}`, level: "GROUP_OFFICE", parentId: countryId });
  const distributorId = await create({
    code: `${prefix}-DI`,
    name: `توزیع ${prefix}`,
    level: "DISTRIBUTOR_OFFICE",
    parentId: groupId,
  });
  const warehouseName = `انبار ${prefix}`;
  const warehouseId = await create({
    code: `${prefix}-W1`,
    name: warehouseName,
    level: "WAREHOUSE",
    parentId: distributorId,
    latitude: 35.6892,
    longitude: 51.389,
  });
  const secondWarehouseName = `انبار مقصد ${prefix}`;
  const secondWarehouseId = await create({
    code: `${prefix}-W2`,
    name: secondWarehouseName,
    level: "WAREHOUSE",
    parentId: distributorId,
    latitude: 35.84,
    longitude: 50.9391,
  });

  return { countryId, groupId, distributorId, warehouseId, warehouseName, secondWarehouseId, secondWarehouseName };
}

async function createCargoType(page: Page, name: string): Promise<string> {
  const response = await page.request.post("/api/v1/cargo-types", { data: { name } });
  expect(response.status()).toBe(201);
  return (await response.json()).id as string;
}

test.describe("مرسوله‌ها — Phase 6", () => {
  test("Admin مرسوله با مقصد گره سازمانی می‌سازد", async ({ page }, testInfo) => {
    const prefix = `O${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const tree = await buildOrgTree(page, prefix);
    const cargoTypeId = await createCargoType(page, `بار ${prefix}`);

    await page.goto("/shipments/new");
    await page.getByLabel("عنوان مرسوله").fill(`محموله ${prefix}`);
    await page.locator("select").first().selectOption(cargoTypeId);
    await page.locator("select").nth(1).selectOption(tree.warehouseId);

    await page.getByPlaceholder("جست‌وجوی گره سازمانی...").fill(tree.secondWarehouseName);
    await expect(page.getByRole("option", { name: tree.secondWarehouseName })).toHaveCount(1);
    await page.locator("select").nth(2).selectOption(tree.secondWarehouseId);

    await page.getByRole("button", { name: "ایجاد مرسوله" }).click();

    await expect.poll(() => page.url(), { timeout: 15_000 }).not.toContain("/shipments/new");
    await expect(page.getByRole("heading", { name: `محموله ${prefix}` })).toBeVisible();
    await expect(page.getByText(tree.warehouseName)).toBeVisible();
    await expect(page.getByText(tree.secondWarehouseName).first()).toBeVisible();

    const shipmentId = page.url().split("/").pop() as string;
    const detail = await (await page.request.get(`/api/v1/shipments/${shipmentId}`)).json();
    expect(detail.destinationOrganizationUnitId).toBe(tree.secondWarehouseId);
    expect(detail.destinationLatitude).toBeCloseTo(35.84, 3);
    expect(detail.trackingCode).toMatch(/^SH-/);
  });

  test("Planner مرسوله با مقصد مختصات آزاد می‌سازد", async ({ page }, testInfo) => {
    const prefix = `C${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const tree = await buildOrgTree(page, prefix);
    const cargoTypeId = await createCargoType(page, `بار ${prefix}`);
    await page.context().clearCookies();

    await loginAs(page, E2E_PLANNER_USERNAME, E2E_PLANNER_PASSWORD);
    await page.goto("/shipments/new");
    await page.getByLabel("عنوان مرسوله").fill(`محموله آزاد ${prefix}`);
    await page.locator("select").first().selectOption(cargoTypeId);
    await page.locator("select").nth(1).selectOption(tree.warehouseId);

    await page.getByRole("button", { name: "مختصات آزاد" }).click();
    await page.getByLabel("عنوان مقصد").fill(`انبار موقت ${prefix}`);
    await page.locator('input[type="number"]').nth(0).fill("35.7000");
    await page.locator('input[type="number"]').nth(1).fill("51.4000");

    await page.getByRole("button", { name: "ایجاد مرسوله" }).click();

    await expect.poll(() => page.url(), { timeout: 15_000 }).not.toContain("/shipments/new");
    await expect(page.getByRole("heading", { name: `محموله آزاد ${prefix}` })).toBeVisible();

    const shipmentId = page.url().split("/").pop() as string;
    const detail = await (await page.request.get(`/api/v1/shipments/${shipmentId}`)).json();
    expect(detail.destinationOrganizationUnitId).toBeNull();
    expect(detail.destinationTitle).toBe(`انبار موقت ${prefix}`);
    expect(detail.destinationLatitude).toBeCloseTo(35.7, 3);
    expect(detail.destinationLongitude).toBeCloseTo(51.4, 3);
  });

  test("مبدأ غیرانبار، مقصد ناقص و کد رهگیری تکراری رد می‌شوند", async ({ page }, testInfo) => {
    const prefix = `V${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const tree = await buildOrgTree(page, prefix);
    const cargoTypeId = await createCargoType(page, `بار ${prefix}`);

    const nonWarehouseOrigin = await page.request.post("/api/v1/shipments", {
      data: {
        title: "مبدأ نامعتبر",
        cargoTypeId,
        originWarehouseId: tree.distributorId,
        destinationMode: "ORGANIZATION_UNIT",
        destinationOrganizationUnitId: tree.secondWarehouseId,
      },
    });
    expect(nonWarehouseOrigin.status()).toBe(422);
    const nonWarehouseBody = await nonWarehouseOrigin.json();
    expect(nonWarehouseBody.error.code).toBe("SHIPMENT_ORIGIN_NOT_WAREHOUSE");

    const missingDestination = await page.request.post("/api/v1/shipments", {
      data: {
        title: "مقصد ناقص",
        cargoTypeId,
        originWarehouseId: tree.warehouseId,
        destinationMode: "COORDINATES",
      },
    });
    expect(missingDestination.status()).toBe(422);

    const validResponse = await page.request.post("/api/v1/shipments", {
      data: {
        title: "مرسوله اول",
        trackingCode: `${prefix}-DUP`,
        cargoTypeId,
        originWarehouseId: tree.warehouseId,
        destinationMode: "ORGANIZATION_UNIT",
        destinationOrganizationUnitId: tree.secondWarehouseId,
      },
    });
    expect(validResponse.status()).toBe(201);

    const duplicateResponse = await page.request.post("/api/v1/shipments", {
      data: {
        title: "مرسوله دوم",
        trackingCode: `${prefix}-DUP`,
        cargoTypeId,
        originWarehouseId: tree.warehouseId,
        destinationMode: "ORGANIZATION_UNIT",
        destinationOrganizationUnitId: tree.secondWarehouseId,
      },
    });
    expect(duplicateResponse.status()).toBe(422);
    const duplicateBody = await duplicateResponse.json();
    expect(duplicateBody.error.code).toBe("SHIPMENT_TRACKING_CODE_DUPLICATE");
  });

  test("ویرایش وضعیت مرسوله در تاریخچه ثبت می‌شود و حذف نرم آن را از فهرست حذف می‌کند", async ({ page }, testInfo) => {
    const prefix = `H${testInfo.project.name.replace(/[^a-zA-Z0-9]/g, "")}${Date.now()}`;
    await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
    const tree = await buildOrgTree(page, prefix);
    const cargoTypeId = await createCargoType(page, `بار ${prefix}`);

    const created = await (
      await page.request.post("/api/v1/shipments", {
        data: {
          title: `مرسوله تاریخچه ${prefix}`,
          cargoTypeId,
          originWarehouseId: tree.warehouseId,
          destinationMode: "ORGANIZATION_UNIT",
          destinationOrganizationUnitId: tree.secondWarehouseId,
        },
      })
    ).json();

    await page.goto(`/shipments/${created.id}`);
    await page.getByRole("button", { name: "ویرایش" }).click();
    await page.getByLabel("وضعیت مرسوله").selectOption("WAITING_FOR_DISPATCH");
    await page.getByRole("button", { name: "ذخیره تغییرات" }).click();
    await expect(page.getByText("در انتظار ارسال")).toBeVisible();

    const history = await (await page.request.get(`/api/v1/shipments/${created.id}/history`)).json();
    expect(history.items.length).toBeGreaterThanOrEqual(2);

    await page.goto("/shipments");
    await page.getByPlaceholder("جست‌وجو بر اساس کد رهگیری، عنوان یا مقصد...").fill(`مرسوله تاریخچه ${prefix}`);
    await page.getByRole("button", { name: `حذف مرسوله مرسوله تاریخچه ${prefix}` }).click();
    await page.getByRole("button", { name: "حذف", exact: true }).click();
    await expect(page.getByText(`مرسوله تاریخچه ${prefix}`)).toHaveCount(0);

    const afterDelete = await page.request.get(`/api/v1/shipments/${created.id}`);
    expect(afterDelete.status()).toBe(404);
  });

  test("نقش بیننده وضعیت از مرسوله‌ها کاملاً محروم است", async ({ page }) => {
    await loginAs(page, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD);

    await page.goto("/shipments");
    await expect(page.getByText("دسترسی مجاز نیست")).toBeVisible();

    const listResponse = await page.request.get("/api/v1/shipments");
    expect(listResponse.status()).toBe(403);
  });
});
