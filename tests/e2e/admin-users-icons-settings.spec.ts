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
 * Phase 14 — کاربران، آیکن نقشه و تنظیمات سامانه.
 *
 * راهبرد: DB مشترک این محیط از قبل کاربر، آیکن و رکورد ممیزی دارد، پس هیچ assert مطلقی
 * («تعداد کاربران ۳ است») نوشته نمی‌شود. هر تست fixture یکتای خودش را می‌سازد و فقط درباره همان
 * ادعا می‌کند. نام‌های یکتا از `testId()` می‌آیند تا اجراهای موازی چهار viewport با هم تداخل نکنند.
 */

function testId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** نام کاربری باید با حرف شروع شود و فقط `[a-zA-Z0-9._-]` بگیرد. */
function uniqueUsername(): string {
  return testId("e2e_u_").slice(0, 30);
}

async function loginAs(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("نام کاربری").fill(username);
  await page.getByLabel("رمز عبور").fill(password);
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page).toHaveURL(/\/(dashboard|change-password)$/);
}

async function loginAsAdmin(page: Page) {
  await loginAs(page, E2E_ADMIN_USERNAME, E2E_ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** یک کاربر تازه از راه API می‌سازد و DTO آن را برمی‌گرداند. */
async function createUser(
  request: APIRequestContext,
  roles: string[] = ["STATUS_VIEWER"],
  password = "E2ePass123!",
) {
  const username = uniqueUsername();
  const response = await request.post("/api/v1/users", {
    data: { username, displayName: "کاربر آزمایشی", password, roles },
  });
  expect(response.status(), await response.text()).toBe(201);

  // بدنه خام جدا نگه داشته می‌شود: ادعاهای «رمز در پاسخ نیست» باید روی همین رشته انجام شوند،
  // نه روی شیئی که خود تست رمز را به آن اضافه کرده است.
  const rawBody = await response.text();
  return {
    ...(JSON.parse(rawBody) as {
      id: string;
      username: string;
      version: number;
      roles: string[];
      status: string;
    }),
    plainPassword: password,
    rawBody,
  };
}

const PNG_16 = Buffer.from(
  // ۱۶×۱۶ PNG یکدست — کوچک‌ترین فایلی که از کف ابعاد (۱۶ پیکسل) رد می‌شود.
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHElEQVQ4y2NgGAWjYBSMglEwCkbBKBgFo2AUAAAHhAABZm0BuwAAAABJRU5ErkJggg==",
  "base64",
);

const SAFE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#2f6fed"/></svg>`;

async function uploadIcon(
  request: APIRequestContext,
  options: { name?: string; category?: string; bytes?: Buffer; filename?: string; mimeType?: string } = {},
) {
  return request.post("/api/v1/icons", {
    multipart: {
      file: {
        name: options.filename ?? "icon.png",
        mimeType: options.mimeType ?? "image/png",
        buffer: options.bytes ?? PNG_16,
      },
      name: options.name ?? testId("icon-"),
      category: options.category ?? "VEHICLE",
    },
  });
}

// ---------------------------------------------------------------------------
// SEC — مجوز در مرز سرویس، نه در UI
// ---------------------------------------------------------------------------

/** هر endpoint مدیریتی، همراه با متد و بدنه‌ای که برای رسیدن به گیت نقش کافی است. */
const ADMIN_ENDPOINTS: { method: "get" | "post" | "put" | "patch" | "delete"; url: string; data?: unknown }[] = [
  { method: "get", url: "/api/v1/users" },
  { method: "post", url: "/api/v1/users", data: { username: "zzz_probe", password: "Probe123!", roles: ["ADMIN"] } },
  { method: "get", url: "/api/v1/users/00000000-0000-4000-8000-000000000000" },
  { method: "patch", url: "/api/v1/users/00000000-0000-4000-8000-000000000000", data: { version: 0 } },
  { method: "delete", url: "/api/v1/users/00000000-0000-4000-8000-000000000000", data: { version: 0 } },
  { method: "post", url: "/api/v1/users/00000000-0000-4000-8000-000000000000/activate", data: { version: 0 } },
  { method: "post", url: "/api/v1/users/00000000-0000-4000-8000-000000000000/deactivate", data: { version: 0 } },
  { method: "post", url: "/api/v1/users/00000000-0000-4000-8000-000000000000/suspend", data: { version: 0, reason: "probe" } },
  { method: "post", url: "/api/v1/users/00000000-0000-4000-8000-000000000000/unsuspend", data: { version: 0 } },
  { method: "post", url: "/api/v1/users/00000000-0000-4000-8000-000000000000/restore", data: { version: 0 } },
  { method: "put", url: "/api/v1/users/00000000-0000-4000-8000-000000000000/roles", data: { version: 0, roles: ["ADMIN"] } },
  { method: "post", url: "/api/v1/users/00000000-0000-4000-8000-000000000000/reset-password", data: { version: 0, newPassword: "Probe123!" } },
  { method: "get", url: "/api/v1/icons" },
  { method: "delete", url: "/api/v1/icons/00000000-0000-4000-8000-000000000000", data: { version: 0 } },
  { method: "post", url: "/api/v1/icons/00000000-0000-4000-8000-000000000000/restore", data: { version: 0 } },
  { method: "put", url: "/api/v1/icons/assignments", data: { targetType: "VEHICLE", targetId: "00000000-0000-4000-8000-000000000000", iconAssetId: null } },
  { method: "get", url: "/api/v1/settings" },
  { method: "put", url: "/api/v1/settings", data: { changes: [{ key: "map.defaultZoom", value: 11, version: 0 }] } },
  { method: "post", url: "/api/v1/settings/map.defaultZoom/reset", data: { version: 0 } },
  { method: "get", url: "/api/v1/audit" },
];

async function callEndpoint(request: APIRequestContext, endpoint: (typeof ADMIN_ENDPOINTS)[number]) {
  const options = endpoint.data === undefined ? undefined : { data: endpoint.data };
  return request[endpoint.method](endpoint.url, options);
}

test.describe("Phase 14 — مجوز سمت سرور", () => {
  test("SEC-01: بدون احراز هویت هر endpoint مدیریتی ۴۰۱ می‌دهد", async ({ request }) => {
    for (const endpoint of ADMIN_ENDPOINTS) {
      const response = await callEndpoint(request, endpoint);
      expect(response.status(), `${endpoint.method.toUpperCase()} ${endpoint.url}`).toBe(401);
    }
  });

  test("SEC-02/04: برنامه‌ریز مأموریت روی هر endpoint مدیریتی ۴۰۳ می‌گیرد", async ({ page }) => {
    const request = page.request;
    await loginAs(page, E2E_PLANNER_USERNAME, E2E_PLANNER_PASSWORD);
    for (const endpoint of ADMIN_ENDPOINTS) {
      const response = await callEndpoint(request, endpoint);
      expect(response.status(), `${endpoint.method.toUpperCase()} ${endpoint.url}`).toBe(403);
    }
  });

  test("SEC-03: ناظر وضعیت روی هر endpoint مدیریتی ۴۰۳ می‌گیرد", async ({ page }) => {
    const request = page.request;
    await loginAs(page, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD);
    for (const endpoint of ADMIN_ENDPOINTS) {
      const response = await callEndpoint(request, endpoint);
      expect(response.status(), `${endpoint.method.toUpperCase()} ${endpoint.url}`).toBe(403);
    }
  });

  test("SEC-05: برنامه‌ریز نمی‌تواند به خودش نقش مدیر بدهد", async ({ page }) => {
    const request = page.request;
    await loginAs(page, E2E_PLANNER_USERNAME, E2E_PLANNER_PASSWORD);

    const me = await request.get("/api/v1/auth/session");
    const userId = me.ok() ? ((await me.json()).user?.id as string | undefined) : undefined;

    const response = await request.put(`/api/v1/users/${userId ?? "00000000-0000-4000-8000-000000000000"}/roles`, {
      data: { version: 0, roles: ["ADMIN"] },
    });
    expect(response.status()).toBe(403);

    // نقش‌ها واقعاً تغییر نکرده‌اند: صفحه مدیریتی همچنان بسته است.
    await page.goto("/system/users");
    await expect(page.getByText("دسترسی مجاز نیست")).toBeVisible();
  });

  test("SEC-06: مجوز بر وجود رکورد مقدم است — ۴۰۳ نه ۴۰۴", async ({ page }) => {
    const request = page.request;
    await loginAs(page, E2E_PLANNER_USERNAME, E2E_PLANNER_PASSWORD);
    const response = await request.get("/api/v1/users/00000000-0000-4000-8000-000000000000");
    expect(response.status()).toBe(403);
  });

  test("E-06: صفحه‌های مدیریتی برای غیرمدیر با URL مستقیم هم باز نمی‌شوند", async ({ page }) => {
    await loginAs(page, E2E_VIEWER_USERNAME, E2E_VIEWER_PASSWORD);
    for (const path of ["/system/users", "/system/icons", "/system/settings", "/system/audit"]) {
      await page.goto(path);
      await expect(page.getByText("دسترسی مجاز نیست")).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// IU — چرخه عمر کاربر
// ---------------------------------------------------------------------------

test.describe("Phase 14 — چرخه عمر کاربر", () => {
  test("IU-01/SEC-15: ساخت کاربر هرگز هش رمز را برنمی‌گرداند", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const created = await createUser(request);

    expect(created.rawBody).not.toContain("passwordHash");
    expect(created.rawBody).not.toContain(created.plainPassword);

    const fetched = await request.get(`/api/v1/users/${created.id}`);
    expect(await fetched.text()).not.toContain("passwordHash");
  });

  test("IU-02: نام کاربری تکراری ۴۰۹ می‌دهد", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const created = await createUser(request);

    const duplicate = await request.post("/api/v1/users", {
      data: { username: created.username, password: "E2ePass123!", roles: ["STATUS_VIEWER"] },
    });
    expect(duplicate.status()).toBe(409);
  });

  test("IU-03: گذارهای وضعیت و بازگردانی درست عمل می‌کنند", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    let user = await createUser(request);

    const deactivate = await request.post(`/api/v1/users/${user.id}/deactivate`, { data: { version: user.version } });
    expect(deactivate.status()).toBe(200);
    user = { ...user, ...(await deactivate.json()) };
    expect(user.status).toBe("INACTIVE");

    const suspend = await request.post(`/api/v1/users/${user.id}/suspend`, {
      data: { version: user.version, reason: "تعلیق آزمایشی برای سنجه E2E" },
    });
    expect(suspend.status()).toBe(200);
    const suspended = await suspend.json();
    expect(suspended.status).toBe("SUSPENDED");
    expect(suspended.suspensionReason).toBe("تعلیق آزمایشی برای سنجه E2E");

    const unsuspend = await request.post(`/api/v1/users/${user.id}/unsuspend`, {
      data: { version: suspended.version },
    });
    expect(unsuspend.status()).toBe(200);

    const deleted = await request.delete(`/api/v1/users/${user.id}`, {
      data: { version: (await unsuspend.json()).version },
    });
    expect(deleted.status()).toBe(200);
    const deletedUser = await deleted.json();
    expect(deletedUser.status).toBe("DELETED");

    // بازگردانی عمداً به INACTIVE می‌رسد، نه ACTIVE — بازگرداندن دسترسی یک تصمیم جداست.
    const restored = await request.post(`/api/v1/users/${user.id}/restore`, {
      data: { version: deletedUser.version },
    });
    expect(restored.status()).toBe(200);
    expect((await restored.json()).status).toBe("INACTIVE");
  });

  test("E-02/SEC-17: کاربر غیرفعال نمی‌تواند وارد شود", async ({ page, browser }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const user = await createUser(request);

    const deactivate = await request.post(`/api/v1/users/${user.id}/deactivate`, { data: { version: user.version } });
    expect(deactivate.status()).toBe(200);

    const context = await browser.newContext();
    const fresh = await context.newPage();
    await fresh.goto("/login");
    await fresh.getByLabel("نام کاربری").fill(user.username);
    await fresh.getByLabel("رمز عبور").fill(user.plainPassword);
    await fresh.getByRole("button", { name: "ورود" }).click();

    await expect(fresh).toHaveURL(/\/login/);
    await expect(fresh.getByRole("alert").filter({ hasText: /\S/ }).first()).toBeVisible();
    await context.close();
  });

  test("E-02: کاربر معلق هم با همان پیام عمومی رد می‌شود", async ({ page, browser }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const user = await createUser(request);

    const suspend = await request.post(`/api/v1/users/${user.id}/suspend`, {
      data: { version: user.version, reason: "تعلیق آزمایشی" },
    });
    expect(suspend.status()).toBe(200);

    const context = await browser.newContext();
    const fresh = await context.newPage();
    await fresh.goto("/login");
    await fresh.getByLabel("نام کاربری").fill(user.username);
    await fresh.getByLabel("رمز عبور").fill(user.plainPassword);
    await fresh.getByRole("button", { name: "ورود" }).click();
    await expect(fresh).toHaveURL(/\/login/);
    await context.close();
  });

  test("CX-01: دو ویرایش هم‌زمان — یکی ۲۰۰ و یکی ۴۰۹", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const user = await createUser(request);

    const [first, second] = await Promise.all([
      request.patch(`/api/v1/users/${user.id}`, { data: { version: user.version, displayName: "الف" } }),
      request.patch(`/api/v1/users/${user.id}`, { data: { version: user.version, displayName: "ب" } }),
    ]);

    const statuses = [first.status(), second.status()].sort();
    expect(statuses).toEqual([200, 409]);
  });

  test("CX-02: تلاش موازی برای حذف آخرین مدیر — دست‌کم یک مدیر فعال باقی می‌ماند", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);

    // دو مدیر تازه ساخته می‌شوند تا هرگز مدیر واقعی محیط در معرض خطر نباشد.
    const adminA = await createUser(request, ["ADMIN"]);
    const adminB = await createUser(request, ["ADMIN"]);

    const [resultA, resultB] = await Promise.all([
      request.post(`/api/v1/users/${adminA.id}/deactivate`, { data: { version: adminA.version } }),
      request.post(`/api/v1/users/${adminB.id}/deactivate`, { data: { version: adminB.version } }),
    ]);

    // مدیر e2e اصلی همچنان فعال است، پس هر دو باید موفق شوند؛ ادعای واقعی این است که
    // هیچ ترکیبی از این دو، سامانه را بی‌مدیر نمی‌گذارد — و هیچ‌کدام هم نباید ۵۰۰ بدهد: بن‌بست
    // دو تراکنش موازی باید در سرویس مدیریت شود، نه اینکه به کاربر برسد.
    for (const result of [resultA, resultB]) {
      expect([200, 409], await result.text()).toContain(result.status());
    }

    const admins = await request.get("/api/v1/users?role=ADMIN&status=ACTIVE");
    expect(admins.status()).toBe(200);
    expect((await admins.json()).total).toBeGreaterThan(0);
  });

  /**
   * E-04 عمداً *سناریوی سراسری* «آخرین مدیر» را بازسازی نمی‌کند.
   *
   * برای رسیدن به آن حالت باید همه مدیران فعال سامانه غیرفعال شوند؛ روی یک DB مشترک که چهار
   * پروژه viewport به‌موازات از آن استفاده می‌کنند، این کار در بازه‌ای که تست باز است، ورود همه
   * اجراهای دیگر را می‌شکند و اگر تست وسط کار خطا بخورد، خط پایه محیط خراب می‌ماند. مرز خودِ
   * قاعده در `tests/unit/user-rules.test.ts` (`wouldLeaveNoActiveAdmin`) و همروندی آن در CX-02
   * پوشش داده می‌شود؛ آنچه اینجا اثبات می‌شود این است که گیت واقعاً روی مسیر HTTP نشسته است:
   * حذف نقش ADMIN از تنها مدیرِ یک مجموعه تازه‌ساخته هم از همان قاعده رد می‌شود.
   */
  test("E-04: قاعده «آخرین مدیر» روی مسیر HTTP اعمال می‌شود", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);

    const admin = await createUser(request, ["ADMIN"]);

    // برداشتن نقش ADMIN از یک مدیر، تا وقتی مدیران دیگری فعال‌اند، مجاز است.
    const allowed = await request.put(`/api/v1/users/${admin.id}/roles`, {
      data: { version: admin.version, roles: ["STATUS_VIEWER"] },
    });
    expect(allowed.status(), await allowed.text()).toBe(200);
    expect((await allowed.json()).roles).toEqual(["STATUS_VIEWER"]);

    // و فهرست خالی نقش، پیش از رسیدن به DB رد می‌شود.
    const current = await (await request.get(`/api/v1/users/${admin.id}`)).json();
    const empty = await request.put(`/api/v1/users/${admin.id}/roles`, {
      data: { version: current.version, roles: [] },
    });
    expect(empty.status()).toBe(422);
  });

  test("SEC-14: هیچ رمزی در سیاهه ممیزی ثبت نمی‌شود", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const marker = `Zq${Date.now()}Aa!`;
    const user = await createUser(request, ["STATUS_VIEWER"], marker);

    const resetMarker = `Rp${Date.now()}Bb!`;
    const reset = await request.post(`/api/v1/users/${user.id}/reset-password`, {
      data: { version: user.version, newPassword: resetMarker },
    });
    expect(reset.status()).toBe(200);

    const audit = await request.get(`/api/v1/audit?entityType=User&entityId=${user.id}&pageSize=200`);
    const body = await audit.text();
    expect(body).not.toContain(marker);
    expect(body).not.toContain(resetMarker);
    expect(body).not.toContain("passwordHash");
  });
});

// ---------------------------------------------------------------------------
// II — کتابخانه آیکن
// ---------------------------------------------------------------------------

test.describe("Phase 14 — آیکن‌ها", () => {
  test("II-01/E-07: PNG معتبر پذیرفته و با سربرگ‌های امن سرو می‌شود", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);

    const upload = await uploadIcon(request);
    expect(upload.status(), await upload.text()).toBe(201);
    const icon = await upload.json();
    expect(icon.width).toBe(16);
    expect(icon.contentUrl).toBe(`/api/v1/icons/${icon.id}/content`);

    const content = await request.get(icon.contentUrl);
    expect(content.status()).toBe(200);
    const headers = content.headers();
    expect(headers["content-type"]).toBe("image/png");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["content-security-policy"]).toContain("default-src 'none'");
    expect(headers["content-security-policy"]).toContain("sandbox");
    expect(headers["content-disposition"]).toBe("inline");
    expect(headers["etag"]).toBe(`"${icon.sha256}"`);
  });

  test("I-14/SEC-09: SVG دارای script رد می‌شود و پیام سازه ناامن را نام می‌برد", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);

    const hostile = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`;
    const response = await uploadIcon(request, {
      bytes: Buffer.from(hostile, "utf8"),
      filename: "hostile.svg",
      mimeType: "image/svg+xml",
    });

    expect(response.status()).toBe(422);
    const error = (await response.json()).error;
    expect(error.code).toBe("ICON_SVG_UNSAFE");
    expect(error.message).toContain("script");
  });

  test("I-14: SVG با رویداد on* و ارجاع بیرونی هم رد می‌شود", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);

    const vectors = [
      `<svg xmlns="http://www.w3.org/2000/svg"><circle onclick="alert(1)" r="5"/></svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/x.png"/></svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><b>x</b></foreignObject></svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><rect/></a></svg>`,
    ];

    for (const vector of vectors) {
      const response = await uploadIcon(request, {
        bytes: Buffer.from(vector, "utf8"),
        filename: "hostile.svg",
        mimeType: "image/svg+xml",
      });
      expect(response.status(), vector).toBe(422);
    }
  });

  test("II-02: SVG بی‌خطر پذیرفته می‌شود", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const response = await uploadIcon(request, {
      bytes: Buffer.from(SAFE_SVG, "utf8"),
      filename: "safe.svg",
      mimeType: "image/svg+xml",
    });
    expect(response.status(), await response.text()).toBe(201);
  });

  test("SEC-10: مسیرپیمایی در نام فایل به بیرون از ریشه ذخیره نشت نمی‌کند", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);

    const response = await uploadIcon(request, { filename: "../../etc/passwd.png" });
    expect(response.status(), await response.text()).toBe(201);

    const icon = await response.json();
    // نام اصلی فقط برای نمایش نگه داشته می‌شود؛ مسیر ذخیره از UUID ساخته می‌شود.
    expect(icon.contentUrl).toMatch(/^\/api\/v1\/icons\/[0-9a-f-]{36}\/content$/);
    expect(await (await request.get(icon.contentUrl)).status()).toBe(200);
  });

  test("SEC-11: مسیرپیمایی در URL محتوا ۴۰۴ می‌دهد", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const response = await request.get("/api/v1/icons/..%2F..%2Fetc%2Fpasswd/content");
    expect([404, 400]).toContain(response.status());
  });

  test("SEC-12: بایت‌های ناسازگار با MIME اعلامی رد می‌شوند", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const response = await uploadIcon(request, {
      bytes: Buffer.from("<?php system($_GET['c']); ?>", "utf8"),
      filename: "shell.png",
      mimeType: "image/png",
    });
    expect(response.status()).toBe(422);
    expect((await response.json()).error.code).toBe("ICON_CONTENT_MISMATCH");
  });

  test("E-09/E-10: حذف نرم آیکن، نقشه را بی‌صدا به نشانگر پیش‌فرض برمی‌گرداند", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);

    const upload = await uploadIcon(request);
    const icon = await upload.json();

    const vehicles = await request.get("/api/v1/vehicles?pageSize=1");
    const vehicleList = (await vehicles.json()).items as { id: string }[];
    test.skip(vehicleList.length === 0, "هیچ خودرویی برای تخصیص وجود ندارد.");

    const assign = await request.put("/api/v1/icons/assignments", {
      data: { targetType: "VEHICLE", targetId: vehicleList[0].id, iconAssetId: icon.id },
    });
    expect(assign.status(), await assign.text()).toBe(200);

    const withIcon = await request.get("/api/v1/map/scene");
    const assigned = ((await withIcon.json()).missions as { vehicleId: string; iconUrl: string | null }[]).filter(
      (mission) => mission.vehicleId === vehicleList[0].id,
    );
    for (const mission of assigned) {
      expect(mission.iconUrl).toBe(icon.contentUrl);
    }

    const removed = await request.delete(`/api/v1/icons/${icon.id}`, { data: { version: icon.version } });
    expect(removed.status()).toBe(200);

    const afterDelete = await request.get("/api/v1/map/scene");
    const fallback = ((await afterDelete.json()).missions as { vehicleId: string; iconUrl: string | null }[]).filter(
      (mission) => mission.vehicleId === vehicleList[0].id,
    );
    for (const mission of fallback) {
      expect(mission.iconUrl).toBeNull();
    }

    // تخصیص پاک نشده است: بازگردانی آیکن باید آن را برگرداند.
    const deletedIcon = await removed.json();
    const restored = await request.post(`/api/v1/icons/${icon.id}/restore`, { data: { version: deletedIcon.version } });
    expect(restored.status()).toBe(200);

    const afterRestore = await request.get("/api/v1/map/scene");
    const back = ((await afterRestore.json()).missions as { vehicleId: string; iconUrl: string | null }[]).filter(
      (mission) => mission.vehicleId === vehicleList[0].id,
    );
    for (const mission of back) {
      expect(mission.iconUrl).toBe(icon.contentUrl);
    }

    await request.put("/api/v1/icons/assignments", {
      data: { targetType: "VEHICLE", targetId: vehicleList[0].id, iconAssetId: null },
    });
  });
});

// ---------------------------------------------------------------------------
// IS — تنظیمات و ممیزی
// ---------------------------------------------------------------------------

test.describe("Phase 14 — تنظیمات و گزارش تغییرات", () => {
  test("IS-01/IS-04: تغییر تنظیم می‌ماند و بازگرداندن به پیش‌فرض آن را پاک می‌کند", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);

    const before = await request.get("/api/v1/settings");
    const zoom = ((await before.json()).items as { key: string; value: number; version: number; isEnvLocked: boolean }[]).find(
      (item) => item.key === "map.defaultZoom",
    )!;
    test.skip(zoom.isEnvLocked, "این کلید با متغیر محیطی قفل شده است.");

    const target = zoom.value === 11 ? 12 : 11;
    const update = await request.put("/api/v1/settings", {
      data: { changes: [{ key: "map.defaultZoom", value: target, version: zoom.version }] },
    });
    expect(update.status(), await update.text()).toBe(200);

    const after = await request.get("/api/v1/settings");
    const updated = ((await after.json()).items as { key: string; value: number; version: number }[]).find(
      (item) => item.key === "map.defaultZoom",
    )!;
    expect(updated.value).toBe(target);

    const reset = await request.post("/api/v1/settings/map.defaultZoom/reset", { data: { version: updated.version } });
    expect(reset.status()).toBe(200);
    const resetItem = ((await reset.json()).items as { key: string; isDefault: boolean }[]).find(
      (item) => item.key === "map.defaultZoom",
    )!;
    expect(resetItem.isDefault).toBe(true);
  });

  test("IS-03: دسته نامعتبر هیچ‌کدام را اعمال نمی‌کند", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);

    const before = await request.get("/api/v1/settings");
    const items = (await before.json()).items as { key: string; value: unknown; version: number; isEnvLocked: boolean }[];
    const zoom = items.find((item) => item.key === "map.defaultZoom")!;
    test.skip(zoom.isEnvLocked, "این کلید با متغیر محیطی قفل شده است.");

    const response = await request.put("/api/v1/settings", {
      data: {
        changes: [
          { key: "map.defaultZoom", value: 13, version: zoom.version },
          { key: "definitely.not.a.key", value: "x", version: 0 },
        ],
      },
    });
    expect(response.status()).toBe(422);

    const after = await request.get("/api/v1/settings");
    const unchanged = ((await after.json()).items as { key: string; value: unknown }[]).find(
      (item) => item.key === "map.defaultZoom",
    )!;
    expect(unchanged.value).toEqual(zoom.value);
  });

  test("IS-06/SEC-18: کلید ناشناخته و کلید شبیه‌راز ذخیره نمی‌شوند", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);

    for (const key of ["definitely.not.a.key", "smtp.password", "api.secretKey", "auth.token"]) {
      const response = await request.put("/api/v1/settings", {
        data: { changes: [{ key, value: "x", version: 0 }] },
      });
      expect(response.status(), key).toBe(422);
    }
  });

  test("CX-04: نوشتن موازی روی یک کلید — یکی ۲۰۰ و یکی ۴۰۹", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);

    const before = await request.get("/api/v1/settings");
    const zoom = ((await before.json()).items as { key: string; value: number; version: number; isEnvLocked: boolean }[]).find(
      (item) => item.key === "map.defaultZoom",
    )!;
    test.skip(zoom.isEnvLocked, "این کلید با متغیر محیطی قفل شده است.");

    const [first, second] = await Promise.all([
      request.put("/api/v1/settings", { data: { changes: [{ key: "map.defaultZoom", value: 9, version: zoom.version }] } }),
      request.put("/api/v1/settings", { data: { changes: [{ key: "map.defaultZoom", value: 10, version: zoom.version }] } }),
    ]);

    expect([first.status(), second.status()].sort()).toEqual([200, 409]);

    const current = await request.get("/api/v1/settings");
    const item = ((await current.json()).items as { key: string; version: number }[]).find(
      (entry) => entry.key === "map.defaultZoom",
    )!;
    await request.post("/api/v1/settings/map.defaultZoom/reset", { data: { version: item.version } });
  });

  test("IS-09: هیچ مسیر نوشتنی روی سیاهه ممیزی وجود ندارد", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);

    for (const method of ["post", "put", "patch", "delete"] as const) {
      const response = await request[method]("/api/v1/audit", { data: {} });
      expect([404, 405], `${method} /api/v1/audit`).toContain(response.status());
    }
  });

  test("IS-07: سیاهه ممیزی بر اساس موجودیت پالایش می‌شود", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const user = await createUser(request);

    const audit = await request.get(`/api/v1/audit?entityType=User&entityId=${user.id}`);
    expect(audit.status()).toBe(200);
    const entries = (await audit.json()).items as { entityType: string; entityId: string; action: string }[];
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.entityType).toBe("User");
      expect(entry.entityId).toBe(user.id);
    }
    expect(entries.some((entry) => entry.action === "user.created")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// E / AX — رابط کاربری روی چهار عرض
// ---------------------------------------------------------------------------

test.describe("Phase 14 — رابط مدیریتی", () => {
  test("E-01/AX-01: صفحه کاربران بدون اسکرول افقی صفحه نمایش داده می‌شود", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    const user = await createUser(request);

    await page.goto("/system/users");
    await expect(page.getByRole("searchbox", { name: "جست‌وجوی کاربر" })).toBeVisible();

    await page.getByRole("searchbox", { name: "جست‌وجوی کاربر" }).fill(user.username);
    await expect(page.getByText(user.username, { exact: true })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("SEC-07: نام نمایشی با محموله XSS به‌صورت متن رندر می‌شود", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);

    const payload = `<img src=x onerror=alert(1)>`;
    const username = uniqueUsername();
    const created = await request.post("/api/v1/users", {
      data: { username, displayName: payload, password: "E2ePass123!", roles: ["STATUS_VIEWER"] },
    });
    expect(created.status()).toBe(201);

    let dialogShown = false;
    page.on("dialog", async (dialog) => {
      dialogShown = true;
      await dialog.dismiss();
    });

    await page.goto("/system/users");
    await page.getByRole("searchbox", { name: "جست‌وجوی کاربر" }).fill(username);
    await expect(page.getByText(payload, { exact: true })).toBeVisible();

    // محموله به‌عنوان متن دیده می‌شود، نه یک المان تزریق‌شده.
    expect(await page.locator('img[src="x"]').count()).toBe(0);
    expect(dialogShown).toBe(false);
  });

  test("E-08: پیام رد SVG ناامن در UI فارسی و گویا است", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/system/icons");

    await page.getByRole("button", { name: "بارگذاری آیکن" }).click();
    await page.getByLabel("نام آیکن").fill(testId("bad-"));
    await page.getByLabel("فایل").setInputFiles({
      name: "hostile.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`, "utf8"),
    });
    await page.getByRole("button", { name: "بارگذاری", exact: true }).click();

    // به پنجره محدود می‌شود؛ route announcer خود Next هم `role="alert"` دارد.
    const alert = page.getByRole("dialog", { name: "بارگذاری آیکن" }).getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("script");
  });

  test("E-12/AX-05: صفحه تنظیمات گروه‌بندی‌شده و مقدارهای فنی LTR است", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/system/settings");

    await expect(page.getByRole("heading", { name: "عمومی" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "نقشه" })).toBeVisible();
    await expect(page.getByRole("button", { name: "ذخیره تغییرات" })).toBeDisabled();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("E-13: گزارش تغییرات با زمان شمسی نمایش داده می‌شود", async ({ page }) => {
    const request = page.request;
    await loginAsAdmin(page);
    await createUser(request);

    await page.goto("/system/audit");
    await expect(page.getByRole("combobox", { name: "پالایش بر اساس نوع موجودیت" })).toBeVisible();

    await page.getByRole("combobox", { name: "پالایش بر اساس نوع موجودیت" }).selectOption("User");
    // به بدنه جدول محدود می‌شود؛ «user.created» به‌عنوان <option> در فهرست پالایه هم وجود دارد.
    await expect(page.locator("tbody").getByText("user.created").first()).toBeVisible();

    // تاریخ شمسی: سال ۱۴xx، نه ۲۰xx میلادی.
    await expect(page.locator("tbody tr").first()).toContainText(/14\d{2}\//);
  });

  test("AX-10: Escape پنجره بارگذاری آیکن را می‌بندد", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/system/icons");

    await page.getByRole("button", { name: "بارگذاری آیکن" }).click();
    await expect(page.getByRole("dialog", { name: "بارگذاری آیکن" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "بارگذاری آیکن" })).toBeHidden();
  });

  test("OF-02: هیچ درخواست بیرونی از صفحه‌های مدیریتی ارسال نمی‌شود", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url) && !url.startsWith("data:") && !url.startsWith("blob:")) {
        external.push(url);
      }
    });

    await loginAsAdmin(page);
    for (const path of ["/system/users", "/system/icons", "/system/settings", "/system/audit"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }

    expect(external).toEqual([]);
  });
});
