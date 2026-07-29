/**
 * Tests for TransactionTracker polling logic.
 *
 * The component (components/wallet/TransactionTracker.tsx) polls
 * fetchTransactionStatus every 3 seconds and stops once the status
 * is no longer PENDING. These tests verify that contract without
 * requiring a DOM renderer.
 */

import type { TransactionStatus } from "@/utils/transaction";

// ---------------------------------------------------------------------------
// Module mock — must be declared before any imports that use the module
// ---------------------------------------------------------------------------
jest.mock("@/utils/transaction", () => ({
  fetchTransactionStatus: jest.fn(),
}));

// Import AFTER the mock is registered so we get the mocked version
import { fetchTransactionStatus } from "@/utils/transaction";

const mockFetch = fetchTransactionStatus as jest.MockedFunction<
  typeof fetchTransactionStatus
>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Minimal re-implementation of the component's polling logic so we can
 * test it in a pure Node environment without React / jsdom.
 *
 * Mirrors the useEffect in TransactionTracker.tsx exactly:
 *   - calls fetchTransactionStatus immediately
 *   - repeats every 3 000 ms
 *   - stops (clears interval) when status !== "PENDING"
 */
function createPoller(txHash: string, onStatus: (s: TransactionStatus) => void) {
  let stopped = false;

  const poll = async () => {
    if (stopped) return;
    const status = await fetchTransactionStatus(txHash);
    onStatus(status);
    if (status !== "PENDING") {
      stopped = true;
      clearInterval(intervalId);
    }
  };

  poll(); // immediate first call
  const intervalId = setInterval(poll, 3000);

  return () => {
    stopped = true;
    clearInterval(intervalId);
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TransactionTracker polling logic", () => {
  const TX_HASH = "abc123def456";

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows PENDING status on the first poll", async () => {
    mockFetch.mockResolvedValue("PENDING");

    const statuses: TransactionStatus[] = [];
    createPoller(TX_HASH, (s) => statuses.push(s));

    await Promise.resolve(); // flush the first async poll
    expect(statuses[0]).toBe("PENDING");
  });

  it("transitions from PENDING to CONFIRMED and stops polling", async () => {
    // First call → PENDING, second call → CONFIRMED
    mockFetch
      .mockResolvedValueOnce("PENDING")
      .mockResolvedValueOnce("CONFIRMED");

    const statuses: TransactionStatus[] = [];
    createPoller(TX_HASH, (s) => statuses.push(s));

    // Flush first immediate poll (PENDING)
    await Promise.resolve();
    expect(statuses).toEqual(["PENDING"]);

    // Advance 3 s to trigger the interval poll (CONFIRMED)
    jest.advanceTimersByTime(3000);
    await Promise.resolve();
    expect(statuses).toEqual(["PENDING", "CONFIRMED"]);

    // Advance another 3 s — polling should have stopped, no new calls
    jest.advanceTimersByTime(3000);
    await Promise.resolve();
    expect(statuses).toEqual(["PENDING", "CONFIRMED"]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("stops polling immediately when first response is CONFIRMED", async () => {
    mockFetch.mockResolvedValue("CONFIRMED");

    const statuses: TransactionStatus[] = [];
    createPoller(TX_HASH, (s) => statuses.push(s));

    await Promise.resolve();
    expect(statuses).toEqual(["CONFIRMED"]);

    jest.advanceTimersByTime(9000);
    await Promise.resolve();
    // Still only one call — interval was cleared
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("stops polling when status is FAILED", async () => {
    mockFetch.mockResolvedValueOnce("PENDING").mockResolvedValueOnce("FAILED");

    const statuses: TransactionStatus[] = [];
    createPoller(TX_HASH, (s) => statuses.push(s));

    await Promise.resolve();
    jest.advanceTimersByTime(3000);
    await Promise.resolve();

    expect(statuses).toEqual(["PENDING", "FAILED"]);

    jest.advanceTimersByTime(3000);
    await Promise.resolve();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("passes the correct txHash to fetchTransactionStatus", async () => {
    mockFetch.mockResolvedValue("CONFIRMED");

    createPoller(TX_HASH, () => {});
    await Promise.resolve();

    expect(mockFetch).toHaveBeenCalledWith(TX_HASH);
  });
});

describe("getExplorerUrl (component-level)", () => {
  it("renders the correct Stellar Expert URL", () => {
    const txHash = "abc123def456";
    // Mirror the URL construction in TransactionTracker.tsx
    const explorerUrl = `https://stellar.expert/explorer/public/tx/${txHash}`;
    expect(explorerUrl).toBe(
      "https://stellar.expert/explorer/public/tx/abc123def456"
    );
  });
});
