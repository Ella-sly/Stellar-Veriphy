/**
 * E2E wallet helpers
 *
 * Because Freighter is a browser extension we cannot install it in a
 * headless Playwright session.  Instead the app must be running with
 * NEXT_PUBLIC_MOCK_WALLET=true so the mock wallet service is active.
 * These helpers interact with the mock-wallet UI that the app renders
 * when the env-var is set.
 */

import { expect,Page } from "@playwright/test";

/** Click the primary "Connect Wallet" CTA wherever it appears on the page. */
export async function openWalletModal(page: Page): Promise<void> {
  // The button text may vary; try the most common labels in order.
  const selectors = [
    'button:has-text("Connect Wallet")',
    'button:has-text("Connect")',
    '[data-testid="connect-wallet-btn"]',
  ];
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await el.click();
      return;
    }
  }
  throw new Error("Could not find a Connect Wallet button on the page");
}

/**
 * Complete the mock wallet connection flow.
 * Works when NEXT_PUBLIC_MOCK_WALLET=true is set in the dev server.
 */
export async function connectMockWallet(page: Page): Promise<string> {
  await openWalletModal(page);

  // The wallet modal should appear
  await expect(page.locator('[role="dialog"], [data-testid="wallet-modal"]').first()).toBeVisible({
    timeout: 10_000,
  });

  // Click the first available wallet option (Freighter or Mock)
  const walletOptions = page.locator(
    '[data-testid="wallet-option"], button:has-text("Freighter"), button:has-text("Mock Wallet")'
  );
  await walletOptions.first().click();

  // Wait for the connected state to appear (address shown in header)
  const addressDisplay = page.locator(
    '[data-testid="wallet-address"], [aria-label*="wallet"], header >> text=/G[A-Z2-7]{55}/'
  );
  await addressDisplay.first().waitFor({ state: "visible", timeout: 15_000 });

  const text = await addressDisplay.first().textContent();
  return text?.trim() ?? "";
}

/** Disconnect the currently connected wallet. */
export async function disconnectWallet(page: Page): Promise<void> {
  const disconnectBtn = page.locator(
    '[data-testid="disconnect-wallet"], button:has-text("Disconnect")'
  );
  if (await disconnectBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await disconnectBtn.click();
  }
}
