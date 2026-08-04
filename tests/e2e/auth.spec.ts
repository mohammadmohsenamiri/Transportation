import { expect, test } from "@playwright/test";
import { runSeedScript } from "./run-seed";
import { E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD } from "./global-setup";

test.describe("ورود، خروج و پوسته محافظت‌شده — Phase 1", () => {
  test("ورود موفق کاربر Admin و مشاهده داشبورد", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("نام کاربری").fill(E2E_ADMIN_USERNAME);
    await page.getByLabel("رمز عبور").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "ورود" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: `خوش آمدید، ${E2E_ADMIN_USERNAME}` })).toBeVisible();
    await expect(page.getByRole("main").getByText("مدیر سامانه")).toBeVisible();
  });

  test("ورود با رمز اشتباه پیام خطا نشان می‌دهد و کاربر وارد نمی‌شود", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("نام کاربری").fill(E2E_ADMIN_USERNAME);
    await page.getByLabel("رمز عبور").fill("wrong-password");
    await page.getByRole("button", { name: "ورود" }).click();

    await expect(page.getByText("نام کاربری یا رمز عبور نادرست است.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("خروج session را باطل می‌کند و دسترسی مجدد به داشبورد ممکن نیست", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("نام کاربری").fill(E2E_ADMIN_USERNAME);
    await page.getByLabel("رمز عبور").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "ورود" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: "خروج از حساب کاربری" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("دسترسی مستقیم به /dashboard بدون ورود به /login هدایت می‌شود (bypass URL)", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("فراخوانی مستقیم API بدون session با 401 رد می‌شود (bypass API)", async ({ request }) => {
    const response = await request.get("/api/v1/auth/me");
    expect(response.status()).toBe(401);
  });

  test("کاربر وارد‌شده با مراجعه به /login به داشبورد هدایت می‌شود", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("نام کاربری").fill(E2E_ADMIN_USERNAME);
    await page.getByLabel("رمز عبور").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "ورود" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("تغییر رمز اجباری در اولین ورود و سپس ورود با رمز جدید", async ({ page }, testInfo) => {
    const username = `e2e_force_${testInfo.project.name}_${Date.now()}`;
    const tempPassword = "TempPass123!";
    const newPassword = "BrandNewPass456!";

    runSeedScript(["force-change", username, tempPassword]);

    await page.goto("/login");
    await page.getByLabel("نام کاربری").fill(username);
    await page.getByLabel("رمز عبور").fill(tempPassword);
    await page.getByRole("button", { name: "ورود" }).click();

    await expect(page).toHaveURL(/\/change-password$/);
    await expect(page.getByText("برای ادامه، ابتدا باید رمز عبور موقت خود را تغییر دهید.")).toBeVisible();

    await page.getByLabel("رمز عبور فعلی").fill(tempPassword);
    await page.getByLabel("رمز عبور جدید", { exact: true }).fill(newPassword);
    await page.getByLabel("تکرار رمز عبور جدید").fill(newPassword);
    await page.getByRole("button", { name: "تغییر رمز عبور" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: "خروج از حساب کاربری" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("نام کاربری").fill(username);
    await page.getByLabel("رمز عبور").fill(newPassword);
    await page.getByRole("button", { name: "ورود" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
