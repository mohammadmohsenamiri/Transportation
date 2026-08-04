import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  retries: 0,
  workers: 2,
  reporter: [["list"]],
  // argon2 password hashing is deliberately CPU-heavy; under parallel workers hitting one
  // shared dev server process, login can take longer than Playwright's 5s default assertion
  // timeout. 15s gives headroom without masking genuine failures.
  expect: { timeout: 15_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run build && npm run start -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: true,
    timeout: 180_000,
    // baseURL این suite ساده HTTP روی 127.0.0.1 است (بدون TLS). Playwright's page.request،
    // برخلاف مرورگر واقعی، استثنای loopback را برای کوکی‌های Secure اعمال نمی‌کند و آن‌ها را
    // silently حذف می‌کند؛ بدون این override تمام page.request بعد از ورود 401 می‌گرفتند.
    env: { COOKIE_INSECURE: "true" },
  },
  projects: [
    { name: "mobile-360", use: { viewport: { width: 360, height: 780 } } },
    { name: "tablet-768", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop-1024", use: { viewport: { width: 1024, height: 800 } } },
    { name: "desktop-1440", use: { viewport: { width: 1440, height: 900 } } },
  ],
});
