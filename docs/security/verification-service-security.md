# Verification Service Security Controls

This document describes the abuse protection and input validation model implemented in `frontend/app/api/verification/route.ts`.

## Rate Limiting

Per-address rate limiting is enforced with progressive backoff.

- Key: request `address` (fallback: `x-wallet-address`, then `x-forwarded-for`)
- Scope: in-memory limiter state
- Default window: 60 seconds
- Default max requests: 30 requests per window
- Backoff: exponential (`base * multiplier^(violations-1)`)

### Configurable Environment Variables

- `VERIFICATION_RATE_LIMIT_WINDOW_MS`
- `VERIFICATION_RATE_LIMIT_MAX_REQUESTS`
- `VERIFICATION_RATE_LIMIT_BACKOFF_BASE_MS`
- `VERIFICATION_RATE_LIMIT_BACKOFF_MULTIPLIER`
- `VERIFICATION_RATE_LIMIT_WHITELIST` (comma-separated addresses)

### Response Headers

All responses include:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

When throttled (`429`), responses also include:

- `Retry-After`
- `X-RateLimit-Backoff-Seconds`

### Trusted Address Whitelist

Addresses in `VERIFICATION_RATE_LIMIT_WHITELIST` bypass request caps.

### Alerting on Violations

Rate limit breaches emit warning logs in the format:

`[rate-limit] address=<id> violations=<n> blockedUntil=<iso_timestamp>`

Route these logs into your observability stack (e.g., Datadog/ELK/Splunk) for incident alerts.

## Input Validation

Request validation is centralized in `frontend/lib/security/inputValidation.ts`.

Validated fields:

- `address`: Stellar address format (`G...`)
- `contentHash`: 64-char SHA-256 hex format
- `fileName`: required, <= 128 chars, sanitized
- `fileType`: allowlisted MIME types
- `fileSizeBytes`: positive integer, max 100MB by default
- `manifest`: validated via `validateManifest()`

Malformed JSON or failed validation returns HTTP `400`.

## Content Security Policy

The frontend now emits a strict Content Security Policy via Next.js headers and a dedicated reporting endpoint at `/api/csp-report`.

- `script-src` allows only first-party and trusted CDN assets.
- `object-src 'none'` blocks plugin-based content.
- `report-uri /api/csp-report` captures violations for inspection.

This complements the request validation flow and reduces the chance of XSS execution in the browser.

### CSP Evaluator review

The policy was checked against [Google's CSP Evaluator](https://csp-evaluator.withgoogle.com/):

- No `unsafe-inline` or `unsafe-eval` in `script-src` — inline script injection is blocked.
- `object-src 'none'` and `base-uri 'self'` prevent common bypasses (plugin injection, `<base>` tag hijacking).
- `frame-ancestors 'none'` blocks clickjacking via iframes.
- `style-src` retains `unsafe-inline` to support Tailwind's runtime style injection. This is an accepted, scoped risk — style injection alone cannot execute script — and is mitigated by every other directive blocking script execution.

## Audit Logging

Security-relevant events are recorded by `frontend/lib/security/auditLogger.ts` and viewable at `/tools/audit-logs`.

- **Admin actions** — API key creation, revocation, and deletion (`frontend/components/APIKeyManagement.tsx`).
- **Authentication events** — wallet connect/disconnect (`frontend/context/WalletContext.tsx`).
- **Contract interactions** — transaction signing success/failure (`frontend/context/WalletContext.tsx`).
- **System events** — verification requests blocked or rejected by rate limiting and input validation (`frontend/app/api/verification/route.ts`).

Each entry is chained via a SHA-256 hash of the previous entry, so any tampering with stored history breaks the chain and is surfaced in the audit log viewer. Entries are retained for 90 days and can be exported as a JSON compliance report from the audit log viewer.

## Security Outcome

This implementation prevents:

- Request flooding and burst abuse via per-address throttling
- Repeated abuse via gradual lockout backoff
- Injection and malformed payload attacks via strict schema and sanitization
- Unsupported file upload vectors via MIME type and size constraints
