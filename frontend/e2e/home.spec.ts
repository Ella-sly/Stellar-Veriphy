import { expect, test } from "@playwright/test";

test.describe("Home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads the landing page", async ({ page }) => {
    await expect(page).toHaveTitle(/Stellar.?Veriphy|Veriphy/i);
    await expect(page.getByRole("heading", { name: "StellarVeriphy" })).toBeVisible();
    await expect(page.getByText("The Truth Engine for the Stellar Ecosystem")).toBeVisible();
  });

  test("navigates from the home page to the verify page", async ({ page }) => {
    await page.goto("/verify");

    await expect(page).toHaveURL(/\/verify$/);
    await expect(page.getByRole("heading", { name: /Select Verification Mode/i })).toBeVisible();
  });

  test("supports basic home page interactions", async ({ page }) => {
    await page.getByRole("link", { name: "About" }).click();
    await expect(page.locator("#about")).toBeInViewport();

    await page.getByRole("link", { name: "How It Works" }).click();
    await expect(page.locator("#how-it-works")).toBeInViewport();

    await page.getByRole("link", { name: "Tools" }).click();
    await expect(page).toHaveURL(/\/tools$/);
  });
});
