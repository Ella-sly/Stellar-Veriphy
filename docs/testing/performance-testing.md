# Performance Testing Plan

Tracks issue #240. Defines load/performance testing for the Soroban contracts
(`contracts/oracle`, `contracts/provenance`, `contracts/registry`) and the
Next.js frontend/API (`frontend/`).

## 1) Contract Gas (Resource) Usage Profiling

- Soroban meters CPU instructions, memory, and ledger I/O rather than a single
  "gas" number; profile all three via `soroban-sdk`'s `testutils::cost` budget
  reporting inside `cargo test`.
- Record baseline resource cost for every public function in each contract
  after a representative call (typical input size), stored as a checked-in
  snapshot (e.g. `contracts/<crate>/benches/baseline.json`) so regressions are
  visible in review.

## 2) Load Test with 100+ Concurrent Users

- Target the frontend/API surface (not the contracts directly, which are
  rate-limited by the network itself).
- Use `k6` (scriptable, CI-friendly) driving the primary user flows:
  certificate verification lookup, certificate search, manifest submission.
- Scenario: ramp to 100 virtual users over 30s, hold for 2 minutes, ramp down;
  run against a locally-built production server (`next start`, same pattern
  the `e2e-tests` job in `.github/workflows/ci.yml` already uses to boot the
  app for Playwright).

## 3) API Response Time Measurements

- Capture p50/p95/p99 latency per endpoint from the `k6` run above.
- Track any endpoint backed by an on-chain read (oracle/registry/provenance
  queries) separately from purely off-chain endpoints, since on-chain latency
  is a different bottleneck class.

## 4) Identify Performance Bottlenecks

- Use `k6`'s built-in metrics plus Next.js server logs to attribute slow
  requests to: on-chain RPC round-trips, server-side rendering, or
  data-fetching/serialization in `frontend/services/`.
- Flag any endpoint whose p95 exceeds its baseline (see below) by more than
  20% for investigation before merge.

## 5) Generate Performance Reports

- `k6` run output (JSON) is converted to an HTML summary and uploaded as a CI
  artifact, mirroring how `playwright-report` is uploaded in the existing
  `e2e-tests` job.
- Contract resource-cost snapshots are diffed against the checked-in baseline
  and included in the same report for a single before/after view per PR.

## 6) Establish Performance Baselines

- First run of each new test records the baseline (contract resource costs,
  API p50/p95/p99 under 100-VU load).
- Baselines are checked into the repo (`contracts/*/benches/baseline.json`,
  `frontend/perf/baseline.json`) and updated deliberately via PR review, not
  silently overwritten by CI.

## Suggested Tooling

| Purpose                     | Tool                            |
| --------------------------- | ------------------------------- |
| Contract resource profiling | `soroban-sdk` `testutils::cost` |
| HTTP/frontend load testing  | `k6`                            |
| Report generation           | `k6` HTML reporter              |

## CI Integration

- New workflow `.github/workflows/performance.yml`, run on a schedule (e.g.
  nightly) plus `workflow_dispatch`, rather than blocking every PR, since load
  tests take longer than the existing PR gate in `ci.yml`.
- A lightweight smoke version (10 VUs, 30s) can later be added as a
  non-blocking step in `ci.yml`'s `e2e-tests` job once baselines are stable.
