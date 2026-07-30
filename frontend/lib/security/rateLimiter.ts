export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  backoffBaseMs: number;
  backoffMultiplier: number;
  whitelist: Set<string>;
}

interface RateLimitState {
  count: number;
  resetAt: number;
  violations: number;
  blockedUntil: number;
}

export interface RateLimitOutcome {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
  blockedUntil: number;
  violations: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: Number(process.env.VERIFICATION_RATE_LIMIT_WINDOW_MS ?? 60_000),
  maxRequests: Number(process.env.VERIFICATION_RATE_LIMIT_MAX_REQUESTS ?? 30),
  backoffBaseMs: Number(process.env.VERIFICATION_RATE_LIMIT_BACKOFF_BASE_MS ?? 5_000),
  backoffMultiplier: Number(process.env.VERIFICATION_RATE_LIMIT_BACKOFF_MULTIPLIER ?? 2),
  whitelist: new Set(
    (process.env.VERIFICATION_RATE_LIMIT_WHITELIST ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  ),
};

const stateByAddress = new Map<string, RateLimitState>();

function nowMs(): number {
  return Date.now();
}

export function getRateLimitConfig(overrides: Partial<RateLimitConfig> = {}): RateLimitConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    whitelist: overrides.whitelist ?? DEFAULT_CONFIG.whitelist,
  };
}

function createState(config: RateLimitConfig): RateLimitState {
  return {
    count: 0,
    resetAt: nowMs() + config.windowMs,
    violations: 0,
    blockedUntil: 0,
  };
}

function alertRateLimitViolation(address: string, state: RateLimitState): void {
  console.warn(
    `[rate-limit] address=${address} violations=${state.violations} blockedUntil=${new Date(state.blockedUntil).toISOString()}`
  );
}

export function evaluateRateLimit(
  address: string,
  overrides: Partial<RateLimitConfig> = {}
): RateLimitOutcome {
  const config = getRateLimitConfig(overrides);
  const identity = address.trim();

  if (config.whitelist.has(identity)) {
    const unlimitedReset = nowMs() + config.windowMs;
    return {
      allowed: true,
      limit: Number.MAX_SAFE_INTEGER,
      remaining: Number.MAX_SAFE_INTEGER,
      resetAt: unlimitedReset,
      retryAfterSeconds: 0,
      blockedUntil: 0,
      violations: 0,
    };
  }

  const currentTime = nowMs();
  let state = stateByAddress.get(identity);
  if (!state) {
    state = createState(config);
    stateByAddress.set(identity, state);
  }

  if (currentTime > state.resetAt) {
    state.count = 0;
    state.resetAt = currentTime + config.windowMs;
  }

  if (state.blockedUntil > currentTime) {
    const retryAfterSeconds = Math.ceil((state.blockedUntil - currentTime) / 1000);
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetAt: state.resetAt,
      retryAfterSeconds,
      blockedUntil: state.blockedUntil,
      violations: state.violations,
    };
  }

  state.count += 1;
  if (state.count > config.maxRequests) {
    state.violations += 1;
    const backoffMs =
      config.backoffBaseMs * Math.pow(config.backoffMultiplier, Math.max(state.violations - 1, 0));
    state.blockedUntil = currentTime + backoffMs;
    alertRateLimitViolation(identity, state);

    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetAt: state.resetAt,
      retryAfterSeconds: Math.ceil(backoffMs / 1000),
      blockedUntil: state.blockedUntil,
      violations: state.violations,
    };
  }

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: Math.max(config.maxRequests - state.count, 0),
    resetAt: state.resetAt,
    retryAfterSeconds: 0,
    blockedUntil: state.blockedUntil,
    violations: state.violations,
  };
}

export function buildRateLimitHeaders(outcome: RateLimitOutcome): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(outcome.limit),
    "X-RateLimit-Remaining": String(outcome.remaining),
    "X-RateLimit-Reset": String(Math.floor(outcome.resetAt / 1000)),
  };

  if (!outcome.allowed && outcome.retryAfterSeconds > 0) {
    headers["Retry-After"] = String(outcome.retryAfterSeconds);
    headers["X-RateLimit-Backoff-Seconds"] = String(outcome.retryAfterSeconds);
  }

  return headers;
}

export function clearRateLimitState(): void {
  stateByAddress.clear();
}
