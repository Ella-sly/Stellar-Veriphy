# Continuous Integration

Pipeline definition: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).
It triggers on every push to `main` and on all pull requests, and runs five
jobs in parallel (one, `mutation-testing`, waits on `test-js` since it reuses
the same coverage run's dependency install):

| Job                  | What it does                                                                 |
|----------------------|-------------------------------------------------------------------------------|
| `lint-and-typecheck` | `next lint` (ESLint) across the frontend, plus `tsc --noEmit` in every workspace package. |
| `test-js`            | Runs the Vitest suites in `packages/shared` and `frontend` with coverage, publishes JUnit results as a check via `dorny/test-reporter`, and builds the Next.js app. |
| `test-rust`          | `cargo clippy` (blocking), `cargo test --workspace` for the three Soroban contracts, and a release `wasm32-unknown-unknown` build. `cargo fmt --check` also runs but is non-blocking (style only). |
| `security-scan`      | `pnpm audit --audit-level=high` for JS/TS dependencies and `rustsec/audit-check` for Rust dependencies (via the [RustSec advisory database](https://rustsec.org)). |
| `mutation-testing`   | Runs Stryker against `packages/shared` (see [`docs/testing/MUTATION_TESTING.md`](../testing/MUTATION_TESTING.md)) and uploads the HTML report as a build artifact. Currently observability-only, not a merge gate — see that doc for why. |

## Test result reporting

`test-js` writes JUnit XML (`**/test-results/junit.xml`, one per package) and
`dorny/test-reporter` turns it into a GitHub check with per-test pass/fail
annotations on the PR, in addition to the raw Vitest output in the job log.
Rust test results are visible in the `test-rust` job log; there's no separate
JUnit step for Rust yet (would need `cargo-nextest` — not added, to keep the
Rust toolchain install lean).

## Blocking merges on failure

The workflow itself only reports job status — GitHub doesn't let a workflow
file force branch protection from within itself. To actually block merging on
red CI:

1. Repo **Settings → Branches → Branch protection rules** → add a rule for `main`.
2. Enable **"Require status checks to pass before merging"**.
3. Select the required jobs: `lint-and-typecheck`, `test-js`, `test-rust`,
   `security-scan`. (Leave `mutation-testing` optional until its threshold is
   enforced — see the mutation testing doc.)

This is a one-time repo setting, not something this PR can configure on your
behalf.

## Local equivalents

Every CI step has a matching root script, so you can reproduce a job locally
before pushing:

```bash
pnpm install
pnpm run lint
pnpm run typecheck
pnpm run test:coverage
pnpm run test:mutation
cargo test --workspace   # requires the Rust toolchain locally; workspace root is Cargo.toml
```
