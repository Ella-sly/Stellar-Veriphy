# Contract Fuzz Testing Plan

Tracks issue #242. Defines the fuzzing strategy for the Soroban contracts in
`contracts/oracle`, `contracts/provenance`, and `contracts/registry`.

## 1) Fuzz All Public Functions

- Every `pub fn` exposed on each contract's `#[contractimpl]` block is in
  scope, across all three crates.
- Fuzz targets live alongside existing tests, e.g.
  `contracts/<crate>/fuzz/fuzz_targets/<function>.rs`, one target per public
  entry point (or grouped by logical operation where functions share state).

## 2) Generate Random but Valid Inputs

- Use `cargo-fuzz` (libFuzzer) with `arbitrary`-derived input structs so
  generated inputs deserialize into valid Soroban types (`Address`, `BytesN`,
  `Vec`, custom structs) rather than raw byte garbage that only exercises
  deserialization.
- Seed corpora with realistic values pulled from existing unit/integration
  tests (`contracts/*/src/test.rs`) to bias generation toward semantically
  valid but edge-heavy inputs.

## 3) Test Boundary Conditions

Explicitly include boundary cases in the `arbitrary` strategies and seed
corpus:

- Empty / zero-length collections and strings
- Max-length values (contract storage limits, `BytesN` bounds)
- Numeric boundaries: 0, 1, `i128::MIN`, `i128::MAX`, `u64::MAX`
- Duplicate/repeated calls with identical arguments
- Unauthorized/foreign `Address` values

## 4) Discover Panic Conditions

- Fuzz runs treat any panic, unreachable, arithmetic overflow (in debug
  builds), or Soroban host trap as a crash to be triaged, since these
  represent liveness/availability bugs even when they aren't security bugs.
- Crashing inputs are minimized by `cargo-fuzz` and saved to
  `contracts/<crate>/fuzz/artifacts/` for reproduction.

## 5) Document Discovered Issues

For each crash found:

1. Minimize the input with `cargo fuzz tmin`.
2. File an issue tagged `fuzzing` with the target, minimized input, and
   panic/backtrace.
3. Add the minimized input as a permanent regression case in
   `contracts/<crate>/src/test.rs`.
4. Record resolution (fixed / accepted risk / duplicate) once triaged.

## 6) Automated Fuzz Runs in CI

Fuzzing is time-unbounded by nature, so it runs as a separate, non-blocking
workflow rather than inside the existing `ci.yml` PR gate:

- New workflow `.github/workflows/fuzz.yml`, scheduled nightly (`cron`) plus
  `workflow_dispatch` for manual runs.
- Matrix over `[oracle, provenance, registry]`, mirroring the `build-contracts`
  matrix in `ci.yml`.
- Each job runs `cargo fuzz run <target> -- -max_total_time=600` (10 min
  budget per target) and uploads any `fuzz/artifacts/` crash inputs.
- A future PR-blocking short fuzz pass (e.g. 30s/target) can be added to
  `ci.yml` once the initial corpus is stable and crash-free.

## Suggested Tooling

| Purpose | Tool |
|---|---|
| Fuzz harness | `cargo-fuzz` (libFuzzer) |
| Structured input generation | `arbitrary` |
| Input minimization | `cargo fuzz tmin` |
