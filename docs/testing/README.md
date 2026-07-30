# Testing Strategy — Design Docs

Implementation designs for the four open testing issues, written against the
actual current state of the codebase (not generic advice).

| Issue | Doc | Priority |
|---|---|---|
| [#247 Snapshot Testing for Contracts](247-contract-snapshot-testing.md) | State/event/storage/gas snapshots for `oracle`, `registry`, `provenance` | Medium |
| [#246 Chaos Engineering Tests](246-chaos-engineering-tests.md) | Cross-contract fault injection + frontend network/wallet chaos | Low |
| [#245 API Contract Testing](245-api-contract-testing.md) | OpenAPI spec, contract tests, versioning, mock server, consumer-driven contracts | Medium |
| [#244 Visual Regression Testing](244-visual-regression-testing.md) | Consolidate + extend the existing Playwright screenshot setup | Medium |

**Read #247 first if you're picking up contract work** — it documents a
pre-existing build break on `main` (merge corruption in all three contract
`lib.rs` files) that blocks `cargo test`/`cargo build` for every contract,
unrelated to snapshot testing itself but a hard prerequisite for it.
