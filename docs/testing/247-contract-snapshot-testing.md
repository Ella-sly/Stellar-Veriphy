# #247 — Snapshot Testing for Contracts

**Labels:** testing, contracts · **Priority:** Medium

## Goal

Catch unintended changes to contract behavior — state, events, storage
layout, and gas cost — by comparing test output against a checked-in
baseline, the same way UI snapshot testing catches unintended render diffs.

## Blocker — fix before starting

All three contract crates currently fail to build on `main` (confirmed via
`gh run view` — every `Build & Test Soroban Contracts` CI job is red at the
`cargo fmt --check` step):

- `contracts/registry/src/lib.rs:1-8` and `contracts/oracle/src/lib.rs:1-18`
  each have **two overlapping `use soroban_sdk::{...}` blocks** left over
  from a merge that combined two feature branches without deduplicating —
  the braces don't balance, so the file doesn't parse.
- `contracts/registry` `DataKey` and `contracts/oracle` `DataKey` each
  declare the **same variant name twice** (registry: `Provider`,
  `ProviderList`, `TeeHash`; oracle: `Paused`, `ProviderStake`,
  `ProviderWithdrawalCooldown`, `ArchivedRequest`, `LastArchivalLedger`,
  `RequestTTL`, `ExpirationWarningLedgers`) — a hard `E0428` once the parse
  error above is fixed.
- `contracts/provenance/src/lib.rs:13-26` has the same kind of unbalanced
  brace inside `ProvenanceError`.

None of this is related to snapshot testing — it's merge damage. It has to
be fixed (dedupe the variants, merge the import lists into one `use` block
per file) before `cargo test` can run at all, which this issue depends on.

## Current state

Soroban SDK's `Env::default()` test harness already **auto-writes** a ledger
replay file per test to `test_snapshots/**/<test_name>.1.json` (visible today
in all three crates). That's a debugging/replay aid, regenerated on every
run — nothing diffs it against a baseline or fails a test on drift. This
issue is about adding actual **assertion-based** snapshots on top of that.

## Proposed approach

Add [`insta`](https://insta.rs) as a dev-dependency in each contract's
`Cargo.toml`. It's the standard Rust snapshot-testing crate: `cargo insta
test` runs tests and reports diffs against committed `.snap` files; `cargo
insta review` is an interactive accept/reject workflow — which directly
satisfies the "detect breaking changes" acceptance criterion (a
behavior-changing PR fails CI until a human explicitly accepts the new
snapshot).

New file per crate: `contracts/<name>/src/snapshot_test.rs` (`#[cfg(test)]`,
`mod snapshot_test;` added to `lib.rs`), covering the four criteria:

| Criterion | Approach |
|---|---|
| **State snapshot comparison** | After a representative op (e.g. `submit_request`, `add_provider`, `mint`), read back the relevant storage entries and `assert_yaml_snapshot!` a normalized struct (addresses substituted with stable placeholders via `Address::generate` in a fixed-seed harness, so snapshots don't churn on every run). |
| **Event emission snapshots** | Call the op, read `env.events().all()`, map to `(topics, data)` tuples, snapshot. Catches accidental topic renames, dropped events, or reordered payload fields. |
| **Storage layout snapshots** | Snapshot the `DataKey` variant list itself (name + shape) via `stringify!`/`Debug` over an exhaustive `match`. The `match` being exhaustive means the compiler forces this test to be touched whenever a variant is added/removed/renamed — the snapshot then captures whether that change was intentional. |
| **Gas usage snapshots** | After the op, read `env.budget().cpu_instruction_cost()` / `.memory_bytes_cost()` (soroban-sdk `testutils`) and assert against a stored baseline with a tolerance band (e.g. fail if cost regresses >10%). Exact-match would be too brittle across SDK patch bumps; a tolerance band is what actually catches a real regression (e.g. an accidental O(n) loop over `ProviderList`). |

## CI wiring

Add a step to each `Build & Test Soroban Contracts (<crate>)` job in
`.github/workflows/ci.yml`, after the existing `cargo test` step:

```yaml
- name: Check contract snapshots
  run: cargo insta test --check
```

Document `cargo insta review` (or the non-interactive `cargo insta accept`)
in `contracts/IMPLEMENTATION.md` for contributors who need to accept an
intentional change.

## Rollout

1. Fix the three merge-corrupted files (prerequisite, blocks everything below).
2. Add `insta`, scaffold `snapshot_test.rs` for `registry` (smallest surface
   with the multisig/proposal flow already well-covered by existing tests).
3. Repeat for `provenance` (mint / lock / revoke / version-history state).
4. Repeat for `oracle` (request lifecycle, dispute, staking, SLA).
5. Wire the CI gate once all three have a non-empty snapshot baseline.
