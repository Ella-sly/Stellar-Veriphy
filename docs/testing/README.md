# Testing Initiative — Issue Specs

Specs for the four testing issues filed against the frontend. The repo is
currently a bare scaffold (`frontend/app/layout.tsx`, `page.tsx`, and
`creator/upload-content/page.tsx` only — no `components/`, no hooks, no
wallet integration, no test tooling installed). None of these issues can be
picked up as pure "add tests" work yet; each doc below calls out what has to
land first.

## Suggested order

1. **[#401 — Test Fixtures](./401-test-fixtures.md)** (Beginner, 3-4h) — no
   dependencies, unblocks the other three.
2. **[#400 — React Hook Tests](./400-react-hook-tests.md)** (Intermediate,
   5-6h) — blocked on custom hooks existing; none are implemented yet.
3. **[#402 — Wallet Connection Integration Tests](./402-wallet-integration-tests.md)**
   (Intermediate, 6-8h) — blocked on a wallet connection feature existing;
   none is implemented yet.
4. **[#403 — Visual Regression Tests](./403-visual-regression-tests.md)**
   (Intermediate, 6-8h) — blocked on there being enough UI surface (key
   components/pages, dark mode) to make snapshots worthwhile.

## Shared prerequisites (all four issues)

- No test runner is installed. `frontend/package.json` has no `test` script
  and no `vitest`/`jest`/`@testing-library/*` in `devDependencies`.
- No `frontend/components/` directory exists yet, despite being referenced
  in the root [README](../../README.md#-monorepo-structure).
- CI: there's no `.github/workflows/` in the repo, so "integrate with CI"
  in #403 also means creating the workflow, not just adding a step to one.
# Testing Strategy — Design Docs

Implementation designs for the four open testing issues, written against the
actual current state of the codebase (not generic advice).

| Issue                                                                   | Doc                                                                              | Priority |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------- |
| [#247 Snapshot Testing for Contracts](247-contract-snapshot-testing.md) | State/event/storage/gas snapshots for `oracle`, `registry`, `provenance`         | Medium   |
| [#246 Chaos Engineering Tests](246-chaos-engineering-tests.md)          | Cross-contract fault injection + frontend network/wallet chaos                   | Low      |
| [#245 API Contract Testing](245-api-contract-testing.md)                | OpenAPI spec, contract tests, versioning, mock server, consumer-driven contracts | Medium   |
| [#244 Visual Regression Testing](244-visual-regression-testing.md)      | Consolidate + extend the existing Playwright screenshot setup                    | Medium   |

**Read #247 first if you're picking up contract work** — it documents a
pre-existing build break on `main` (merge corruption in all three contract
`lib.rs` files) that blocks `cargo test`/`cargo build` for every contract,
unrelated to snapshot testing itself but a hard prerequisite for it.
