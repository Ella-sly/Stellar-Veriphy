import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Stellar-Veriphy E2E tests.
 *
 * Browsers: Chromium (primary), Firefox, WebKit (Safari engine).
 * Visual regression snapshots are stored in e2e/snapshots/.
 *
 * Run:  npm run test:e2e
 * UI:   npm run test:e2e:ui
 */
export default defineConfig({
  // Directory containing all E2E test files
  testDir: "./e2e",

  // Allow up to 3 minutes per test (wallet prompts can be slow)
  timeout: 180_000,

  // Each test gets 2 retries on CI to handle flakiness
  retries: process.env.CI ? 2 : 0,

  // Run up to 4 parallel workers locally, 1 on CI for stability
  workers: process.env.CI ? 1 : 4,

  // Rich HTML report
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]],

  use: {
    // The Next.js dev server (started separately before running E2E tests)
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",

    // Capture screenshots / videos only on failure
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    // Slow down actions on CI to avoid timing issues
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },

  projects: [
    // ── Desktop browsers ───────────────────────────────────────────────────
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

    // ── Mobile viewports ───────────────────────────────────────────────────
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
    },
  ],

  // Visual regression snapshot directory
  snapshotDir: "./e2e/snapshots",

  // Expect-level timeout (e.g. toHaveText) — 10 s
  expect: { timeout: 10_000 },
});
