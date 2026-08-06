import { expect, test } from "@playwright/test";

test.describe("پیش‌نمایش قابل کلیک — Phase 0", () => {
  test("فرانمای وضعیت با RTL و theme قابل مشاهده است", async ({ page }) => {
    await page.goto("/prototype/overview");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "fa");
    await expect(page.getByRole("heading", { name: "فرانمای وضعیت" })).toBeVisible();

    const themeToggle = page.getByRole("button", { name: "تغییر بین حالت روشن و تیره" });
    await themeToggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("نقشه، انتخاب خودرو و کنترل نمایشی timeline کار می‌کند", async ({ page }) => {
    await page.goto("/prototype/map");
    await expect(page.getByRole("heading", { name: "نقشه عملیات" })).toBeVisible();

    await page.getByRole("button", { name: /پخش نمایشی/ }).click();
    await expect(page.getByRole("button", { name: /توقف پخش/ })).toBeVisible();
  });

  test("مسیر پیش‌فرض بدون ورود به صفحه ورود سامانه اصلی هدایت می‌شود", async ({ page }) => {
    // تا پیش از Phase 1 (ورود واقعی)، "/" به پیش‌نمایش ایستا هدایت می‌شد؛ از Phase 1 به بعد
    // باید کاربر را به برنامه واقعی ببرد، نه پیش‌نمایش prototype که فقط از مسیر مستقیمش در دسترس است.
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });
});
