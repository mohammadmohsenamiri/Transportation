import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
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
  },
  projects: [
    { name: "mobile-360", use: { viewport: { width: 360, height: 780 } } },
    { name: "tablet-768", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop-1024", use: { viewport: { width: 1024, height: 800 } } },
    { name: "desktop-1440", use: { viewport: { width: 1440, height: 900 } } },
  ],
});
