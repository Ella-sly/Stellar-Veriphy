# Testing Guide

This document is the single reference for how testing works across StellarVeriphy — covering smart contract tests, frontend unit and component tests, end-to-end tests, shared package tests, mutation testing, and coverage expectations. It explains what each layer tests, how to run it, and how to write new tests.

For deeper design docs on specific testing topics, see the [`docs/testing/`](./docs/testing/) directory.

---

## Table of Contents

1. [Testing Overview](#1-testing-overview)
2. [Smart Contract Tests (Rust)](#2-smart-contract-tests-rust)
3. [Frontend Unit Tests (Jest)](#3-frontend-unit-tests-jest)
4. [Frontend E2E Tests (Playwright)](#4-frontend-e2e-tests-playwright)
5. [Shared Package Tests (Vitest)](#5-shared-package-tests-vitest)
6. [Mutation Testing (Stryker)](#6-mutation-testing-stryker)
7. [Running All Tests](#7-running-all-tests)
8. [Coverage Requirements](#8-coverage-requirements)
9. [Writing New Tests](#9-writing-new-tests)
10. [CI Test Pipeline](#10-ci-test-pipeline)
11. [Testing Docs Index](#11-testing-docs-index)

---

## 1. Testing Overview

StellarVeriphy has four distinct test layers that address different concerns:

| Layer | Framework | Scope | Where |
|---|---|---|---|
| Contract unit + integration | Rust `#[test]` + soroban-sdk testutils | On-chain logic, auth, state mutations, cross-contract calls | `contracts/*/src/test.rs` |
| Frontend unit + component | Jest 29 + Testing Library | Service functions, utility logic, React components/hooks | `frontend/{utils,services,src/}**/__tests__/` |
| End-to-end | Playwright 1.49.1 | Full user flows in a real browser against a running app | `frontend/e2e/*.spec.ts` |
| Shared utilities | Vitest 2.1.8 | Pure TypeScript types and hashing logic | `packages/shared/tests/` |
| Mutation | Stryker (vitest runner) | Test quality check — how many bugs the suite can detect | `packages/shared/` |

Each layer is independently runnable. The CI pipeline runs all four in parallel.

---

## 2. Smart Contract Tests (Rust)

### 2.1 Framework and test environment

Contract tests use Rust's built-in `#[test]` attribute combined with `soroban-sdk testutils`. The key testutils APIs are:

- `Env::default()` — creates an isolated in-memory Soroban environment
- `env.mock_all_auths()` — bypasses all `require_auth()` checks so tests focus on logic, not wallet setup
- `env.register_contract(None, ContractType)` — deploys a contract into the test environment and returns its address
- `Address::generate(&env)` — generates a random test address
- `env.ledger().set_sequence_number(n)` / `env.ledger().set_timestamp(t)` — manipulate ledger state for time-based tests
- `client.try_*()` variants — call a function and return `Result<_, _>` instead of panicking, used to assert error cases

Test files live at `contracts/<name>/src/test.rs` and are included via `#[cfg(test)]` so they are not compiled into the production WASM binary.

### 2.2 Running contract tests

```bash
# Test a single contract
cd contracts/oracle     && cargo test
cd contracts/provenance && cargo test
cd contracts/registry   && cargo test

# Run with output captured (shows test names even on pass)
cd contracts/oracle && cargo test -- --nocapture

# Run a specific test by name
cd contracts/oracle && cargo test test_init

# Run all contract tests via Docker (mirrors CI)
make test-contracts
```

### 2.3 Test structure and conventions

Each contract's test file follows a consistent structure:

```rust
#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger as _}, Env};

// ── Helper functions ──────────────────────────────────────────────────────

fn make_env() -> Env {
    Env::default()
}

fn register_oracle(env: &Env) -> Address {
    env.register_contract(None, OracleContract)
}

// Mock contracts for cross-contract call testing
mod mock_registry {
    use soroban_sdk::{contract, contractimpl, BytesN, Env};

    #[contract]
    pub struct MockRegistry;

    #[contractimpl]
    impl MockRegistry {
        pub fn is_tee_hash_approved(env: Env, tee_hash: BytesN<32>) -> bool {
            tee_hash == BytesN::from_array(&env, &[1u8; 32])
        }
        pub fn is_provider(_env: Env, _provider: BytesN<32>) -> bool {
            true
        }
    }
}

// ── Setup helpers ─────────────────────────────────────────────────────────

fn setup_oracle(env: &Env) -> (Address, Address, Address) {
    let registry   = Address::generate(env);
    let provenance = Address::generate(env);
    let admin      = Address::generate(env);
    let cid        = register_oracle(env);
    OracleContractClient::new(env, &cid)
        .init(&registry, &provenance, &admin)
        .unwrap();
    (cid, admin, registry)
}

// ── Tests ─────────────────────────────────────────────────────────────────

#[test]
fn test_init() { /* ... */ }

#[test]
fn test_init_already_initialized() { /* ... */ }
```

**Naming:** test functions use the pattern `test_<function_name>_<scenario>` (e.g., `test_verify_attestation_invalid_signature`, `test_submit_request_with_priority_uses_correct_ttl`).

**Mock contracts:** when testing cross-contract calls (e.g., Oracle calling Registry), define lightweight mock contracts in `mod mock_registry { ... }` and `mod reject_registry { ... }` within the test file. A `mock_registry` always approves; a `reject_registry` always rejects. This isolates each contract's logic from the real dependencies.

**Error assertions:** use `try_*()` client variants to assert error cases:

```rust
#[test]
fn test_verify_attestation_unauthorized_signer() {
    let env = make_env();
    let (oracle_id, _) = setup_with_mock_registry(&env);
    let client = OracleContractClient::new(&env, &oracle_id);

    // Expect UnauthorizedSigner error
    let result = client.try_verify_attestation(&provider, &tee_hash, &payload, &bad_sig);
    assert!(result.is_err());
}
```

**Auth testing:** call `env.mock_all_auths()` at the start of tests that need to exercise logic without testing the auth mechanism itself. For tests specifically verifying that unauthorized callers are rejected, do *not* call `mock_all_auths()` — let the auth check fire naturally.

**Ledger manipulation:** for TTL and expiry tests, advance the ledger:

```rust
env.ledger().with_mut(|l| {
    l.sequence_number = 200;  // advance past TTL
    l.timestamp = env.ledger().timestamp() + 200;
});
```

### 2.4 Test snapshots

Oracle and Provenance contracts have snapshot files in `test_snapshots/`. These record the expected output (storage state, events emitted) of specific test runs. They serve as regression guards — if contract behavior changes, snapshots fail and must be explicitly updated:

```bash
# Update snapshots after an intentional behavior change
cd contracts/oracle && cargo test -- --update-snapshots
```

Do not update snapshots silently. Review the diff to confirm the change is intentional before committing updated snapshot files.

### 2.5 Integration tests

Integration tests (prefixed `integration_`) live alongside unit tests in `contracts/oracle/src/test.rs`. They wire up real (non-mock) Registry and Provenance contracts in the same `Env::default()` to test the full Oracle → Registry → Provenance call chain end-to-end. Key scenarios covered:

- `submit_request` full lifecycle (submit → verify → resolve)
- `cancel_request` happy path and double-cancel error
- `verify_attestation` with unregistered provider, unapproved TEE hash, bad signature, and valid signature
- Batch request submission
- Circuit breaker pausing all verification paths
- Dispute lifecycle (file → resolve → check metrics impact)
- SLA auto-suspend and reinstate
- Cost estimation
- TTL ordering (high-priority vs low-priority TTLs)
- Pagination correctness

---

## 3. Frontend Unit Tests (Jest)

### 3.1 Framework setup

The frontend uses **Jest 29** with **ts-jest** and **two separate test projects** configured in `frontend/jest.config.js`:

| Project | Environment | Matches |
|---|---|---|
| `unit` | `node` | `utils/**/__tests__/**/*.test.ts`, `services/**/__tests__/**/*.test.ts` |
| `components` | `jest-environment-jsdom` | `components/**/__tests__/**/*.test.tsx`, `hooks/**/__tests__/**/*.test.ts` |

This separation ensures pure logic runs in Node (faster, no DOM overhead) while component and hook tests have a full DOM via jsdom.

**Path aliases in tests:**
- `@/` → `frontend/`
- `@stellarveriphy/shared/` → `packages/shared/`

**Mocks:**
- `frontend/__mocks__/styleMock.js` — stubs CSS/SCSS imports
- `frontend/__mocks__/fileMock.js` — stubs image/SVG imports

### 3.2 Running unit tests

```bash
# From the frontend directory
cd frontend

# Run all tests (both projects)
pnpm test

# Run only unit tests
pnpm test:unit

# Run with coverage report
pnpm test:coverage

# Watch mode during development
pnpm test:watch

# From the workspace root
pnpm --filter frontend test
pnpm test:coverage   # runs coverage across all workspace packages
```

### 3.3 Test files and coverage

Current test coverage lives in:

```
frontend/
├── utils/__tests__/
│   ├── cn.test.ts              — Tailwind class merge utility
│   ├── crypto.test.ts          — Cryptographic helpers
│   ├── hashing.test.ts         — Hash computation
│   ├── manifestConverter.test.ts — Manifest JSON/XML conversion
│   ├── manifestTemplates.test.ts — Template loading and validation
│   └── transaction.test.ts     — Transaction formatting helpers
└── services/__tests__/
    ├── certificateVerificationService.test.ts
    ├── manifestUseCases.test.ts
    ├── verificationStatusService.test.ts
    └── wallet.test.ts
```

Coverage threshold (enforced in CI):

```
branches:   80%
functions:  80%
lines:      80%
statements: 80%
```

### 3.4 Writing unit tests

Structure tests using `describe` / `it` blocks. Follow the Arrange–Act–Assert pattern:

```typescript
import { computeHash } from "@/utils/hashing";

describe("computeHash", () => {
  it("returns a 64-character hex string for non-empty input", async () => {
    // Arrange
    const input = "hello world";

    // Act
    const hash = await computeHash(input);

    // Assert
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a consistent hash for the same input", async () => {
    const hash1 = await computeHash("test");
    const hash2 = await computeHash("test");
    expect(hash1).toBe(hash2);
  });

  it("returns different hashes for different inputs", async () => {
    const hash1 = await computeHash("input-a");
    const hash2 = await computeHash("input-b");
    expect(hash1).not.toBe(hash2);
  });
});
```

**For component tests** use `@testing-library/react` with `@testing-library/user-event`:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/components/ThemeToggle";

describe("ThemeToggle", () => {
  it("renders a button with an accessible label", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: /toggle theme/i })).toBeInTheDocument();
  });

  it("calls toggleTheme when clicked", async () => {
    const user = userEvent.setup();
    const toggleTheme = jest.fn();
    // ... render with mock context
    await user.click(screen.getByRole("button", { name: /toggle theme/i }));
    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });
});
```

**Key rules:**
- Query by accessible role or label — not by class name or test ID — to keep tests aligned with accessibility expectations.
- Do not test implementation details (internal state, private methods). Test observable behavior from the user's perspective.
- Mock external service calls (`fetch`, Freighter wallet API) at the module boundary with `jest.mock()`.
- Place test files in an `__tests__/` directory adjacent to the source file they test. Use `.test.ts` for logic, `.test.tsx` for components.

---

## 4. Frontend E2E Tests (Playwright)

### 4.1 Framework setup

End-to-end tests use **Playwright 1.49.1** configured in `frontend/playwright.config.ts`. The test suite runs against a live Next.js instance.

**Browser matrix:**

| Project | Browser | Device |
|---|---|---|
| `chromium` | Desktop Chrome | — |
| `firefox` | Desktop Firefox | — |
| `webkit` | Desktop Safari | — |
| `mobile-chrome` | Chrome | Pixel 5 |
| `mobile-safari` | Safari | iPhone 13 |

**Key configuration:**
- `timeout: 180_000` — 3 minutes per test
- `retries: 2` in CI, `0` locally
- `workers: 1` in CI, `4` locally (parallel)
- `screenshot: "only-on-failure"`, `video: "retain-on-failure"`
- `actionTimeout: 30_000`, `navigationTimeout: 60_000`
- `NEXT_PUBLIC_MOCK_WALLET=true` — in-memory wallet shim, no real browser extension needed
- Snapshots at `frontend/e2e/snapshots/`

The web server is started automatically by Playwright (`pnpm dev` locally, `pnpm start` in CI). In CI, `reuseExistingServer` is `false` so a fresh server is always started. Locally it reuses an existing server if one is running on port 3000.

### 4.2 Running E2E tests

```bash
# From the frontend directory
cd frontend

# Run all e2e tests (all browsers)
pnpm test:e2e

# Run a specific spec file
pnpm test:e2e -- e2e/home.spec.ts

# Run on a specific browser
pnpm test:e2e -- --project=chromium
pnpm test:e2e -- --project=mobile-safari

# Open Playwright UI (interactive test runner)
pnpm test:e2e:ui

# View the last HTML report
pnpm test:e2e:report

# From workspace root (CI-style)
pnpm test:e2e
```

Before running for the first time, install browser binaries:

```bash
cd frontend
pnpm exec playwright install --with-deps chromium
# or for all browsers:
pnpm exec playwright install --with-deps
```

### 4.3 E2E test files

```
frontend/e2e/
├── home.spec.ts                   # Landing page load, navigation links (runs in CI)
├── wallet-connection.spec.ts      # Connect/disconnect, mock wallet, address persistence,
│                                  #   error states, accessibility (11 tests)
├── file-upload-verification.spec.ts # Drop zone, hash computation, manifest export
│                                  #   (JSON/XML), wallet gate, invalid file types (13 tests)
├── certificate-viewing.spec.ts    # Certificate list, detail fields, badge levels,
│                                  #   revoked/expired labels, verify authenticity,
│                                  #   copy to clipboard, explorer link (16 tests)
├── search-and-filtering.spec.ts   # Search by hash/ID/creator/code, filters, sort,
│                                  #   pagination, URL persistence, clear filters (22 tests)
├── helpers/                       # Shared helper utilities (page objects, assertions)
└── fixtures/                      # Test fixture data (certificates, manifests)
```

The `home.spec.ts` file is the only spec that runs in the standard CI E2E workflow (`e2e.yml`). The full matrix (all five specs, all five browsers) runs in the comprehensive `ci.yml` pipeline.

### 4.4 Writing E2E tests

Use the Page Object pattern for anything more than a few interactions. Keep locators role-based:

```typescript
import { expect, test } from "@playwright/test";

test.describe("Certificate viewing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/certificates");
  });

  test("displays the verification badge level", async ({ page }) => {
    // Navigate to a known certificate fixture
    await page.goto("/certificates/1");

    // Query by accessible role — not by CSS class
    const badge = page.getByRole("status", { name: /verification level/i });
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/Standard|Premium/i);
  });

  test("shows revoked state for a revoked certificate", async ({ page }) => {
    await page.goto("/certificates/revoked-fixture");
    await expect(page.getByRole("alert", { name: /revoked/i })).toBeVisible();
  });
});
```

**Rules:**
- Prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors or `data-testid`.
- Use `await expect(locator).toBeVisible()` rather than `expect(await locator.isVisible()).toBe(true)` — Playwright's built-in assertions auto-retry.
- Test fixtures (predictable certificate IDs, manifest hashes) live in `e2e/fixtures/`. Use them instead of relying on live network data.
- Avoid `page.waitForTimeout()` — use proper awaitable assertions instead.
- The mock wallet (`NEXT_PUBLIC_MOCK_WALLET=true`) provides an in-memory Stellar wallet. Tests that need a connected wallet should use helpers from `e2e/helpers/` to set up wallet state.

**Visual regression snapshots:**

```typescript
// Take a screenshot and compare against stored baseline
await expect(page).toHaveScreenshot("certificate-card.png");

// Update baseline screenshots
pnpm test:e2e -- --update-snapshots
```

Snapshot files are stored in `frontend/e2e/snapshots/` and committed to source control. See [`docs/testing/244-visual-regression-testing.md`](./docs/testing/244-visual-regression-testing.md) for the full visual regression strategy.

---

## 5. Shared Package Tests (Vitest)

### 5.1 Framework setup

`packages/shared` uses **Vitest 2.1.8** with `@vitest/coverage-v8` for coverage. Vitest was chosen over Jest for the shared package because it provides native ES module support and is significantly faster for pure TypeScript logic with no DOM dependency.

### 5.2 Running shared package tests

```bash
# From the workspace root
pnpm --filter @stellarveriphy/shared test       # single run
pnpm --filter @stellarveriphy/shared test:watch # watch mode
pnpm --filter @stellarveriphy/shared test:coverage

# Or from the package directory
cd packages/shared
pnpm test
pnpm test:coverage
```

### 5.3 Writing shared package tests

Tests live in `packages/shared/tests/`. They follow the same Arrange–Act–Assert pattern as the Jest tests but use Vitest's `describe` / `it` / `expect` API (compatible with Jest's syntax):

```typescript
import { describe, it, expect } from "vitest";
import { hashContent } from "../utils/hash";

describe("hashContent", () => {
  it("produces a stable SHA-256 hex digest", async () => {
    const result = await hashContent("deterministic input");
    expect(result).toBe("5f2b6d..."); // exact expected hash
  });
});
```

The `@faker-js/faker` package is available as a dev dependency for generating realistic test data in factory functions.

---

## 6. Mutation Testing (Stryker)

Mutation testing evaluates test quality rather than code coverage. Stryker introduces small automated bugs ("mutants") into the source — flipping a comparison operator, changing an arithmetic operation, deleting a return statement — and reruns the test suite against each mutated version. A mutant that still passes all tests is a "survivor" and indicates a gap in the test suite.

### 6.1 Scope

Mutation testing currently runs against `packages/shared` (`utils/**/*.ts`, `factories/**/*.ts`) using `@stryker-mutator/vitest-runner` and `@stryker-mutator/typescript-checker`.

The TypeScript checker discards mutants that do not type-check before running tests, preventing wasted test cycles on semantically invalid mutations.

### 6.2 Running mutation tests

```bash
# From the workspace root
pnpm test:mutation

# Or from the package
cd packages/shared && pnpm test:mutation
```

The HTML report is written to `packages/shared/reports/mutation/mutation.html` (gitignored — regenerate locally or download the `mutation-report` artifact from CI).

### 6.3 Current baseline and target

| Scope | Mutation score |
|---|---|
| `utils/hash.ts` | 100% |
| `factories/index.ts` | ~40% |
| **Overall `packages/shared`** | **~42%** |

The target is **80%+** before mutation testing gates the CI build. Until the target is reached, the CI mutation job runs on every push and uploads the report as an artifact but does not fail the pipeline.

### 6.4 Improving the mutation score

Surviving mutants in `factories/index.ts` are mostly in randomized fields where tests assert shape/format rather than exact output. To increase coverage:

1. Assert field format with regex (e.g., `expect(cert.contentHash).toMatch(/^[0-9a-f]{64}$/)`), not just `expect(typeof cert.contentHash).toBe("string")`.
2. Pin derived arithmetic with fixed inputs and exact expected outputs to kill `ArithmeticOperator` mutants.
3. Test option arrays (`DEVICE_OPTIONS`, `AI_MODEL_OPTIONS`) by asserting their exact contents, not just that a generated value is a member.
4. Once 80%+ is reached, set `thresholds.break: 80` in `packages/shared/stryker.conf.json` to make CI fail on regressions.

---

## 7. Running All Tests

### Full suite from the workspace root

```bash
# Run all workspace tests (contracts excluded — they use cargo)
pnpm test

# Run with coverage across all packages
pnpm test:coverage

# Run e2e tests
pnpm test:e2e

# Run mutation tests (shared package)
pnpm test:mutation
```

### Contracts (Rust)

```bash
# Individual contracts
cd contracts/oracle     && cargo test
cd contracts/provenance && cargo test
cd contracts/registry   && cargo test

# All contracts via Docker
make test-contracts
```

### Full local pre-merge checklist

Run these commands before opening a pull request to mirror what CI will verify:

```bash
# 1. Format everything
pnpm format

# 2. Lint frontend
pnpm check:frontend

# 3. TypeScript type check
pnpm typecheck

# 4. Build contracts
pnpm build:contracts

# 5. Build frontend
pnpm build:frontend

# 6. Run all JS/TS tests with coverage
pnpm test:coverage

# 7. Run Rust tests for each contract
cd contracts/oracle     && cargo test && cargo fmt -- --check && cargo clippy && cd ../..
cd contracts/provenance && cargo test && cargo fmt -- --check && cargo clippy && cd ../..
cd contracts/registry   && cargo test && cargo fmt -- --check && cargo clippy && cd ../..

# 8. Run e2e tests (Chromium only for speed)
pnpm test:e2e -- --project=chromium
```

---

## 8. Coverage Requirements

| Layer | Tool | Threshold | Enforced by |
|---|---|---|---|
| Frontend (unit) | Jest + `--coverage` | 80% branches, functions, lines, statements | `jest.config.js` `coverageThreshold` — CI fails if not met |
| Shared package | Vitest + `@vitest/coverage-v8` | No hard threshold yet | Run with `pnpm test:coverage` to inspect |
| Contracts (Rust) | `cargo-llvm-cov` | No hard threshold yet | CI `contract-coverage` job generates lcov reports |
| Mutation (shared) | Stryker | 80% target (not yet a gate) | `thresholds.break` will be set once baseline reaches target |

Coverage reports are generated:

- **Frontend:** `frontend/coverage/` after `pnpm test:coverage`
- **Shared:** `packages/shared/coverage/` after `pnpm --filter @stellarveriphy/shared test:coverage`
- **Contracts:** lcov files generated by `cargo-llvm-cov` in each contract's build directory (available as CI artifacts)
- **Mutation:** `packages/shared/reports/mutation/mutation.html`

---

## 9. Writing New Tests

### When to write tests

- **Any new function or method** in `packages/shared` or `frontend/utils/` needs at least one unit test covering the happy path and at least one error/edge case.
- **Any new API route** in `frontend/app/api/` needs unit tests for input validation, error responses, and the success path.
- **Any new Soroban contract function** needs `#[test]` coverage for: successful execution, each distinct error variant it can return, auth enforcement, and any state transition it produces.
- **Any bug fix** should be accompanied by a test that would have caught the bug (regression test). Name it `test_<function>_<bug_description>`.
- **Any new user-facing page or flow** should have at least one E2E test covering the primary happy path.

### Contract test checklist

For each new contract function, write tests that cover:

- [ ] Happy path — correct inputs produce the expected output and state change
- [ ] Already initialized / not initialized guard (where applicable)
- [ ] Each `Error` variant the function can return — use `try_*()` and assert the exact error
- [ ] Auth enforcement — call without `mock_all_auths()` and verify that unauthorized callers get rejected
- [ ] Cross-contract call behavior — use a mock contract to control the dependency's response
- [ ] State persistence — read back stored values to confirm they were written correctly
- [ ] Event emission — if the function emits an event, assert the event payload

### Frontend unit test checklist

For each new service or utility function:

- [ ] Happy path with representative input
- [ ] Empty / null / undefined inputs (boundary cases)
- [ ] Error / exception paths
- [ ] Async functions tested with `await`
- [ ] External dependencies (fetch, crypto, storage) mocked at the module boundary

For each new component:

- [ ] Renders without crashing with minimal required props
- [ ] Key interactive elements (buttons, inputs) respond to user events
- [ ] Loading state renders correctly (use skeleton components, not spinners)
- [ ] Error state renders correctly
- [ ] Accessibility: query by role/label to verify ARIA attributes are correct

### E2E test checklist

For each new user flow:

- [ ] Can reach the page/feature from the home page navigation
- [ ] Primary happy-path action completes successfully
- [ ] Obvious error conditions show user-facing feedback
- [ ] Accessibility: roles and labels are correct (Playwright queries will catch missing ones)
- [ ] Mobile viewport is usable (use `mobile-chrome` or `mobile-safari` project)

---

## 10. CI Test Pipeline

The CI pipeline runs the following test jobs on every pull request and push to `main`:

### `e2e.yml` (always runs)

1. `pnpm install --frozen-lockfile`
2. Install Playwright Chromium browser
3. `pnpm --filter frontend build`
4. Run `e2e/home.spec.ts` on Chromium with `NEXT_PUBLIC_MOCK_WALLET=true`
5. Upload Playwright HTML report as artifact (always, including on failure)

### `ci.yml` (full pipeline)

| Job | Steps |
|---|---|
| `frontend-unit-tests` | `pnpm lint` + `pnpm build:frontend` + `jest --coverage` (80% threshold enforced) |
| `build-contracts` | `cargo fmt --check` + `cargo clippy` + WASM build + `cargo test` (unit + integration) for all three contracts |
| `contract-coverage` | `cargo-llvm-cov` lcov reports for oracle, provenance, and registry |
| `e2e-tests` | Playwright on Chromium/Firefox/WebKit matrix against the full spec suite |
| `ci-complete` | Gate job — all above jobs must pass before this job reports success; required for PR merge |

Pull requests are blocked from merging until `ci-complete` passes.

### Artifact outputs

- `playwright-report/` — Playwright HTML report (uploaded even on test failure)
- `mutation-report` — Stryker HTML mutation report from `packages/shared`
- lcov coverage files — per-contract Rust coverage (available in `contract-coverage` job artifacts)

---

## 11. Testing Docs Index

Detailed testing design documents are in [`docs/testing/`](./docs/testing/):

| Document | Contents |
|---|---|
| [`docs/testing/247-contract-snapshot-testing.md`](./docs/testing/247-contract-snapshot-testing.md) | State, event, storage, and gas snapshot strategies for all three contracts. **Read this first if picking up contract work** — it documents a known pre-existing build issue with duplicate definitions in the contract source files. |
| [`docs/testing/246-chaos-engineering-tests.md`](./docs/testing/246-chaos-engineering-tests.md) | Cross-contract fault injection, frontend network/wallet chaos testing strategies |
| [`docs/testing/245-api-contract-testing.md`](./docs/testing/245-api-contract-testing.md) | OpenAPI spec, consumer-driven contract tests, mock server, API versioning |
| [`docs/testing/244-visual-regression-testing.md`](./docs/testing/244-visual-regression-testing.md) | Playwright screenshot baselines, diff thresholds, update workflow |
| [`docs/testing/accessibility-testing.md`](./docs/testing/accessibility-testing.md) | WCAG compliance testing, screen reader testing, automated axe-core integration |
| [`docs/testing/fuzz-testing.md`](./docs/testing/fuzz-testing.md) | Input fuzzing strategies for contract entry points and API routes |
| [`docs/testing/MUTATION_TESTING.md`](./docs/testing/MUTATION_TESTING.md) | Stryker setup, current baseline, path to 80% target, CI integration |
| [`docs/testing/performance-testing.md`](./docs/testing/performance-testing.md) | Lighthouse, contract gas profiling, load testing |
| [`docs/testing/security-audit-tests.md`](./docs/testing/security-audit-tests.md) | Security-focused test cases, vulnerability scanning, audit checklist |
