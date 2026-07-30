# Security Headers

This document describes the HTTP response headers set in [`frontend/next.config.ts`](../../frontend/next.config.ts) via the Next.js `headers()` API. They apply to every route (`source: "/(.*)"`) and protect against clickjacking, MIME-sniffing, XSS, and protocol-downgrade attacks. Closes #270.

## Header set

| Header | Value | Protects against |
|---|---|---|
| `Content-Security-Policy` | See `cspValue` in `next.config.ts` — restricts script/style/connect/frame sources to `self` plus the specific Stellar RPC, IPFS, and font hosts the app needs. `frame-ancestors 'none'` and `object-src 'none'` are set. | XSS, data injection, unauthorized framing/embedding |
| `X-Frame-Options` | `DENY` | Clickjacking (redundant with `frame-ancestors 'none'` for defense in depth on browsers that don't support CSP framing directives) |
| `X-Content-Type-Options` | `nosniff` | MIME-type sniffing attacks |
| `X-XSS-Protection` | `1; mode=block` | Legacy browsers' built-in reflected-XSS filter. Deprecated and ignored by current Chrome/Firefox/Safari (CSP is the real defense), kept for older/embedded browsers that still honor it |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Protocol downgrade / SSL-stripping attacks; forces HTTPS for one year including subdomains |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Leaking full URLs (which may contain sensitive paths/params) to third-party origins |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Unwanted access to sensitive browser APIs the app never uses |
| `X-DNS-Prefetch-Control` | `on` | N/A — performance header (enables DNS prefetching), not a protective control |
| `Report-To` / CSP `report-uri` | `/api/csp-report` | Not protective on its own; routes CSP violation reports to `frontend/app/api/csp-report` for visibility into blocked content |

## Why `X-XSS-Protection` is included despite being deprecated

Modern browsers removed the legacy XSS auditor this header controls (it caused more security bugs than it fixed) and rely on CSP instead. It's set anyway because it's a zero-cost, zero-risk header for the browsers that still read it, and it was an explicit acceptance-criterion for #270. Do not treat it as the primary XSS defense — that's the `Content-Security-Policy` above.

## Verifying

1. `pnpm build:frontend && pnpm --filter frontend start`, then run:
   ```bash
   curl -sI http://localhost:3000/ | grep -iE "content-security-policy|x-frame-options|x-content-type-options|x-xss-protection|strict-transport-security|referrer-policy|permissions-policy"
   ```
2. Against a deployed instance, run a scan at [securityheaders.com](https://securityheaders.com) — this can't be automated in CI since it requires a publicly reachable URL. Target grade: **A** or better. `Strict-Transport-Security` only has real effect over HTTPS, so this step must be run against the deployed (HTTPS) site, not `localhost`.

## Changing the policy

Any new external host the app needs to talk to (a new RPC provider, a new IPFS gateway, etc.) must be added to the relevant CSP directive in `cspValue` — do not widen `script-src`/`connect-src` to a wildcard to avoid updating this list, since that reopens the exact injection surface CSP exists to close.
