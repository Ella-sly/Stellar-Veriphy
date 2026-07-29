import {
  buildRateLimitHeaders,
  clearRateLimitState,
  evaluateRateLimit,
} from "@/lib/security/rateLimiter";

describe("rateLimiter", () => {
  beforeEach(() => {
    clearRateLimitState();
  });

  it("allows requests within configured limit", () => {
    const first = evaluateRateLimit("GTESTADDRESS", {
      maxRequests: 2,
      windowMs: 60_000,
      backoffBaseMs: 1000,
      backoffMultiplier: 2,
      whitelist: new Set(),
    });
    const second = evaluateRateLimit("GTESTADDRESS", {
      maxRequests: 2,
      windowMs: 60_000,
      backoffBaseMs: 1000,
      backoffMultiplier: 2,
      whitelist: new Set(),
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it("blocks requests after max limit and applies retry headers", () => {
    evaluateRateLimit("GTESTADDRESS", {
      maxRequests: 1,
      windowMs: 60_000,
      backoffBaseMs: 1000,
      backoffMultiplier: 2,
      whitelist: new Set(),
    });
    const blocked = evaluateRateLimit("GTESTADDRESS", {
      maxRequests: 1,
      windowMs: 60_000,
      backoffBaseMs: 1000,
      backoffMultiplier: 2,
      whitelist: new Set(),
    });

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    const headers = buildRateLimitHeaders(blocked);
    expect(headers["Retry-After"]).toBeDefined();
    expect(headers["X-RateLimit-Backoff-Seconds"]).toBeDefined();
  });

  it("bypasses limits for whitelisted addresses", () => {
    const allowed = evaluateRateLimit("GWHITELISTED", {
      maxRequests: 1,
      windowMs: 60_000,
      backoffBaseMs: 1000,
      backoffMultiplier: 2,
      whitelist: new Set(["GWHITELISTED"]),
    });

    expect(allowed.allowed).toBe(true);
    expect(allowed.limit).toBe(Number.MAX_SAFE_INTEGER);
  });
});
