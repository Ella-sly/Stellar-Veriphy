import { fetchTransactionStatus, getExplorerUrl } from "../transactionService";

// Grab the global fetch mock helper
const mockFetch = (response: Partial<Response> | null, throws = false) => {
  const impl = throws
    ? jest.fn().mockRejectedValue(new Error("Network failure"))
    : jest.fn().mockResolvedValue(response as Response);
  jest.spyOn(globalThis, "fetch").mockImplementation(impl);
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("fetchTransactionStatus", () => {
  it("returns CONFIRMED when Horizon responds 200 with successful: true", async () => {
    mockFetch({
      ok: true,
      status: 200,
      json: async () => ({ successful: true }),
    });

    const status = await fetchTransactionStatus("abc123");
    expect(status).toBe("CONFIRMED");
  });

  it("returns CONFIRMED when Horizon responds 200 and successful is not false", async () => {
    mockFetch({
      ok: true,
      status: 200,
      json: async () => ({ id: "abc123" }), // no `successful` field
    });

    const status = await fetchTransactionStatus("abc123");
    expect(status).toBe("CONFIRMED");
  });

  it("returns FAILED when Horizon responds 200 with successful: false", async () => {
    mockFetch({
      ok: true,
      status: 200,
      json: async () => ({ successful: false }),
    });

    const status = await fetchTransactionStatus("abc123");
    expect(status).toBe("FAILED");
  });

  it("returns PENDING when Horizon responds 404 (transaction not yet found)", async () => {
    mockFetch({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    const status = await fetchTransactionStatus("abc123");
    expect(status).toBe("PENDING");
  });

  it("uses mock fallback (PENDING) when fetch throws a network error", async () => {
    mockFetch(null, true);

    const status = await fetchTransactionStatus("abc123");
    expect(status).toBe("PENDING");
  });

  it("uses mock fallback (PENDING) when Horizon returns a non-404 error status", async () => {
    mockFetch({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const status = await fetchTransactionStatus("abc123");
    expect(status).toBe("PENDING");
  });
});

describe("getExplorerUrl", () => {
  it("returns the correct Stellar Expert URL for a given hash", () => {
    const hash = "a1b2c3d4e5f6";
    const url = getExplorerUrl(hash);
    expect(url).toBe(`https://stellar.expert/explorer/public/tx/${hash}`);
  });

  it("includes the full hash in the URL", () => {
    const hash = "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNSOLXAUJVLVWXVVNQNYWGLZ";
    const url = getExplorerUrl(hash);
    expect(url).toContain(hash);
    expect(url).toMatch(/^https:\/\/stellar\.expert\/explorer\/public\/tx\//);
  });
});
