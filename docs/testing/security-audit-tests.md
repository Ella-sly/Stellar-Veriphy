# Automated Security Test Plan

Tracks issue #241. Defines the automated, in-repo security test suite for
`contracts/oracle`, `contracts/provenance`, and `contracts/registry`, run via
`cargo test` alongside the existing unit/integration tests in each crate's
`src/test.rs`. This complements, but does not replace, the external audit
process in [docs/security/smart-contract-audit-runbook.md](../security/smart-contract-audit-runbook.md).

## 1) Reentrancy Attack Tests

- Identify every function that performs an external call (e.g. cross-contract
  invocation) followed by a state update, across all three contracts.
- Add tests using `soroban-sdk`'s `testutils` to simulate a malicious callee
  that re-enters the calling contract mid-execution, asserting state is
  consistent (checks-effects-interactions is enforced) rather than
  double-spent or double-updated.

## 2) Authorization Bypass Tests

- For every privileged function (admin-only, owner-only, role-gated), add
  negative tests asserting the call panics/rejects when:
  - Called by an unauthorized `Address`
  - Called without the required `require_auth()` / `require_auth_for_args()`
    signature
  - Called with a forged or mismatched `Address` argument
- Build a privileged-roles matrix per contract (role → gated functions) in
  this doc's companion table below, and ensure each entry has a corresponding
  negative test.

## 3) Integer Overflow/Underflow Tests

- All arithmetic on balances, counters, and indices must be tested at
  `i128`/`u64`/`u32` boundaries (`MAX`, `MAX - 1`, `0`, underflow via
  subtraction from `0`).
- Contracts must use checked arithmetic (`checked_add`/`checked_sub`) in
  production code; tests assert the contract call fails cleanly rather than
  wrapping or panicking with an unhandled trap.

## 4) Storage Collision Tests

- Enumerate all storage keys (instance/persistent/temporary) used by each
  contract and assert no two logical entities can collide on the same key
  (e.g. via crafted `Address`/`BytesN` inputs used as key components).
- Add tests that write to adjacent logical keys and assert reads return the
  expected, non-overlapping values.

## 5) Gas Limit (Resource) Attacks

- Soroban meters CPU instructions and memory rather than traditional EVM gas;
  tests should assert that no public function's resource cost scales
  unboundedly with attacker-controlled input (e.g. unbounded loops over a
  caller-supplied `Vec`).
- Add tests that pass maximum-realistic-size collections and assert the call
  completes within the network's resource limits, using `soroban-sdk`
  `testutils::cost` budget assertions where available.

## 6) Formal Verification (Where Possible)

- Scope: contract invariants that are simple enough to state formally (e.g.
  "total supply is conserved across transfer", "registry entry count never
  decreases without an explicit removal call").
- Evaluate `kani` or property-based testing via `proptest` as a lighter-weight
  first step before full formal verification tooling, given Soroban's young
  formal-verification ecosystem.
- Document which invariants are formally checked vs. only tested, and why, in
  this file as the work lands.

## Privileged Roles Matrix (fill in per contract)

| Contract   | Role  | Gated Functions | Negative Test Present |
| ---------- | ----- | --------------- | --------------------- |
| registry   | admin | TBD             | ☐                     |
| oracle     | admin | TBD             | ☐                     |
| provenance | admin | TBD             | ☐                     |

## Automated Runs in CI

- These tests live in each crate's existing `src/test.rs` (or a new
  `src/security_test.rs` module) and run automatically via the existing
  `Run unit tests` / `Run integration tests` steps in the `build-contracts`
  job of `.github/workflows/ci.yml` — no new CI job required, since they're
  plain `cargo test` cases.
