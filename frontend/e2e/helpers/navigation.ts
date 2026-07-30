/**
 * E2E navigation helpers — reusable page-navigation utilities.
 */

import { Page, expect } from "@playwright/test";

/** Navigate to the home / landing page and wait for it to be ready. */
export async function gotoHome(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page).toHaveTitle(/Stellar.?Veriphy|Veriphy/i);
}

/** Navigate to the certificate verification / search page. */
export async function gotoCertificates(page: Page): Promise<void> {
  await page.goto("/certificates");
  await page.waitForLoadState("networkidle");
}

/** Navigate to the manifest builder / upload page. */
export async function gotoUpload(page: Page): Promise<void> {
  await page.goto("/upload");
  await page.waitForLoadState("networkidle");
}

/** Navigate to the verify page. */
export async function gotoVerify(page: Page): Promise<void> {
  await page.goto("/verify");
  await page.waitForLoadState("networkidle");
}

/** Wait for any loading spinner / skeleton to disappear. */
export async function waitForContentReady(page: Page): Promise<void> {
  await page
    .locator('[data-testid="loading"], [aria-label="Loading"], .animate-pulse')
    .first()
    .waitFor({ state: "hidden", timeout: 15_000 })
    .catch(() => {
      /* Spinner may never appear — that's fine */
    });
}
