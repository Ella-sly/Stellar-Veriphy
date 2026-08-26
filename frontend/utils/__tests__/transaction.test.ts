/**
 * Unit tests for utils/transaction.ts
 * Covers: fetchTransactionStatus
 */

import { fetchTransactionStatus } from "../transaction";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(response: Partial<Response> | null, throws = false) {
  const impl = throws
    ? jest.fn().mockRejectedValue(new Error("Network failure"))
    : jest.fn().mockResolvedValue(response as Response);
  jest.spyOn(globalThis, "fetch").mockImplementation(impl);
}

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// fetchTransactionStatus
// ---------------------------------------------------------------------------

describe("fetchTransactionStatus", () => {
  it("returns CONFIRMED when Horizon responds 200 with successful: true", async () => {
    mockFetch({ ok: true, status: 200, json: async () => ({ successful: true }) });
    expect(await fetchTransactionStatus("abc123")).toBe("CONFIRMED");
  });

  it("returns CONFIRMED when successful field is absent (treated as truthy)", async () => {
    mockFetch({ ok: true, status: 200, json: async () => ({ id: "abc123" }) });
    expect(await fetchTransactionStatus("abc123")).toBe("CONFIRMED");
  });

  it("returns FAILED when Horizon responds 200 with successful: false", async () => {
    mockFetch({ ok: true, status: 200, json: async () => ({ successful: false }) });
    expect(await fetchTransactionStatus("abc123")).toBe("FAILED");
  });

  it("returns PENDING when Horizon responds 404", async () => {
    mockFetch({ ok: false, status: 404, json: async () => ({}) });
    expect(await fetchTransactionStatus("abc123")).toBe("PENDING");
  });

  it("returns PENDING when fetch throws a network error", async () => {
    mockFetch(null, true);
    expect(await fetchTransactionStatus("abc123")).toBe("PENDING");
  });

  it("returns PENDING for other non-OK status codes (500)", async () => {
    mockFetch({ ok: false, status: 500, json: async () => ({}) });
    expect(await fetchTransactionStatus("abc123")).toBe("PENDING");
  });

  it("uses the correct Horizon URL", async () => {
    const spy = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ successful: true }),
    });
    jest.spyOn(globalThis, "fetch").mockImplementation(spy);

    await fetchTransactionStatus("txhash999");

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("txhash999"));
  });
});
