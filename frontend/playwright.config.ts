import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]],

  use: {
    baseURL,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
    },
  ],

  snapshotDir: "./e2e/snapshots",
  expect: { timeout: 10_000 },

  webServer: {
    command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? "pnpm dev",
    cwd: __dirname,
    env: {
      NEXT_PUBLIC_MOCK_WALLET: process.env.NEXT_PUBLIC_MOCK_WALLET ?? "true",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseURL,
  },
});
