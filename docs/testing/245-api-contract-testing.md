# #245 — Implement API Contract Testing

**Labels:** testing, backend, api · **Priority:** Medium

## Current API surface

Three Next.js route handlers, all under `frontend/app/api/`:

| Route | Method | Behavior |
|---|---|---|
| `/api/health` | `GET` | Static `{ status: "ok", service: "stellarveriphy" }` |
| `/api/verification` | `POST` | Rate-limited (`lib/security/rateLimiter`), validates body via `lib/security/inputValidation`, audit-logs via `lib/security/auditLogger`; returns `202` with `{ success, data }` or `400`/`429` with `{ success: false, error, ... }` |
| `/api/csp-report` | `POST` | CSP violation report sink; always `200`/`400` |

There's no OpenAPI spec, no request/response schema validation, no
versioning, and no mock server today — this issue is greenfield, not a
retrofit.

## Proposed approach

### 1. Schema-first with zod

Add `zod` (not currently a dependency — `react-hook-form` is used without a
resolver today). Define request/response schemas once in
`packages/shared/` (already the cross-package shared-types location used by
both frontend and, in principle, any future service) so the contract has a
single source of truth:

```
packages/shared/contracts/
  health.ts          // HealthResponseSchema
  verification.ts     // VerificationRequestSchema, VerificationResponseSchema
  csp-report.ts        // CspReportSchema
```

Each route handler validates against its schema (replacing/wrapping the
existing hand-rolled `validateVerificationRequest`) so the implementation
can never silently drift from the published contract.

### 2. OpenAPI spec generation

Generate `docs/api/openapi.yaml` from the zod schemas via
`@asteasolutions/zod-to-openapi`, wired to a small script
(`frontend/scripts/generate-openapi.ts`) run in CI to fail if the checked-in
spec is stale relative to the schemas (`git diff --exit-code` after
regenerating).

### 3. Contract validation tests

Next.js route handlers are plain functions — no server needed to test them.
`frontend/app/api/**/__tests__/*.contract.test.ts` imports the handler
directly, constructs a `NextRequest`, and asserts the response body against
the same zod schema used to generate the OpenAPI spec (so the test can never
diverge from the documented contract — it's checking the same schema
object, not a hand-copied expectation).

### 4. Version compatibility checks

Routes are currently unversioned. Introduce an `X-API-Version` response
header (default `1`) and a compatibility test suite that snapshots the
response shape per version — if a field is removed or a type narrows for
`v1` consumers, the test fails. This is deliberately lighter than a
path-based `/api/v1/...` rewrite, which would be a breaking change to the
one existing consumer (the frontend itself) for no current benefit.

### 5. Mock server for development

`msw` (Mock Service Worker, Node mode) at `frontend/mocks/server.ts`,
handlers built directly from the same zod schemas (via
`zod-to-json-schema` + a fixture generator, or hand-written fixtures per
schema). Lets frontend feature work proceed against realistic
`/api/verification` responses without a live backend, and doubles as the
provider-side fixture source for #4 below.

### 6. Consumer-driven contracts

Full Pact (with a broker service) is heavier than this project needs today.
Lighter equivalent: shared fixtures in `packages/shared/contracts/fixtures/`
that both sides consume —

- **Consumer test** (`frontend/services/__tests__/*.contract.test.ts`):
  the service layer (e.g. `certificateVerificationService.ts`) is tested
  against the fixture responses, proving it can parse what the fixture
  claims the provider returns.
- **Provider test** (the route handler contract tests from #3): proves the
  real handler's output matches the same fixture shape.

If either side changes independently, whichever test reads the stale
fixture fails — same guarantee Pact gives, without standing up a broker.

## Acceptance criteria mapping

| Criterion | Delivered by |
|---|---|
| OpenAPI/Swagger spec generation | zod → `zod-to-openapi` → `docs/api/openapi.yaml`, CI-checked for staleness |
| Contract validation tests | `app/api/**/__tests__/*.contract.test.ts` against the same zod schemas |
| Version compatibility checks | `X-API-Version` header + per-version response-shape snapshot tests |
| Mock server for development | `msw` node server in `frontend/mocks/`, schema-driven |
| Consumer-driven contracts | Shared fixtures in `packages/shared/contracts/fixtures/`, consumed by both service-layer and route-handler tests |

## Rollout

1. Add `zod`, define schemas in `packages/shared/contracts/` for the 3
   existing routes.
2. Wire route handlers to validate against them.
3. Contract validation tests per route.
4. OpenAPI generation script + CI staleness check.
5. `msw` mock server + shared fixtures; consumer tests on the service layer.
6. `X-API-Version` header + compatibility snapshots.
