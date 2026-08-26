/**
 * Unit tests for services/wallet.ts
 * Covers: createWalletService (mock adapter)
 */

import { createWalletService, FREIGHTER_INSTALL_URL } from "../wallet";

// We test the mock wallet service directly (useMock=true) since
// the real Freighter adapter requires a browser extension.
const wallet = createWalletService(true);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("FREIGHTER_INSTALL_URL", () => {
  it("is a non-empty string pointing to the Chrome Web Store", () => {
    expect(FREIGHTER_INSTALL_URL).toMatch(/https:\/\/chromewebstore\.google\.com/);
  });
});

// ---------------------------------------------------------------------------
// Mock wallet service
// ---------------------------------------------------------------------------

describe("createWalletService (mock)", () => {
  it("isFreighterInstalled returns true", async () => {
    expect(await wallet.isFreighterInstalled()).toBe(true);
  });

  it("requestFreighterAccess returns a valid Stellar public key", async () => {
    const addr = await wallet.requestFreighterAccess();
    expect(addr).toMatch(/^G[A-Z2-7]{55}$/);
  });

  it("getFreighterAddress returns a valid Stellar public key", async () => {
    const addr = await wallet.getFreighterAddress();
    expect(addr).toMatch(/^G[A-Z2-7]{55}$/);
  });

  it("requestFreighterAccess and getFreighterAddress return the same address", async () => {
    const a = await wallet.requestFreighterAccess();
    const b = await wallet.getFreighterAddress();
    expect(a).toBe(b);
  });

  it("getFreighterNetworkDetails returns testnet details", async () => {
    const d = await wallet.getFreighterNetworkDetails();
    expect(d.network).toBe("testnet");
    expect(d.networkUrl).toMatch(/horizon-testnet\.stellar\.org/);
    expect(d.networkPassphrase).toMatch(/Test SDF/);
  });

  it("getFreighterNetworkDetails returns a sorobanRpcUrl", async () => {
    const d = await wallet.getFreighterNetworkDetails();
    expect(d.sorobanRpcUrl).toBeTruthy();
  });

  it("signTransaction returns the same XDR it receives (mock pass-through)", async () => {
    const xdr = "AAAAAQAAAAAAAAAA";
    const signed = await wallet.signTransaction(xdr, "passphrase", "address");
    expect(signed).toBe(xdr);
  });
});

// ---------------------------------------------------------------------------
// Factory: createWalletService returns different instances
// ---------------------------------------------------------------------------

describe("createWalletService factory", () => {
  it("returns an object with all required methods", () => {
    const svc = createWalletService(true);
    expect(typeof svc.isFreighterInstalled).toBe("function");
    expect(typeof svc.requestFreighterAccess).toBe("function");
    expect(typeof svc.getFreighterAddress).toBe("function");
    expect(typeof svc.getFreighterNetworkDetails).toBe("function");
    expect(typeof svc.signTransaction).toBe("function");
  });
});
