# GitHub Actions CI Workflow

This directory contains the Continuous Integration (CI) workflow for StellarVeriphy.

## Workflow Overview

The CI workflow (`ci.yml`) automatically runs on every push and pull request to the `main` branch. It ensures code quality, builds all components, and runs tests.

## Workflow Structure

### Triggers

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

The workflow runs on:
- Every push to the `main` branch
- Every pull request targeting the `main` branch

### Jobs

The workflow consists of three jobs that run in parallel (where possible):

#### 1. `lint-and-build-frontend`

**Purpose**: Validate and build the Next.js frontend application

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Setup pnpm 10.18.2
4. Cache pnpm store for faster subsequent runs
5. Install dependencies with `pnpm install --no-frozen-lockfile`
6. Check frontend (lint) with `pnpm check:frontend`
7. Build frontend for production
8. Run frontend tests with Jest

**Caching**: 
- pnpm store is cached using `pnpm-lock.yaml` hash
- Significantly speeds up dependency installation

#### 2. `build-contracts`

**Purpose**: Build and test all three Soroban smart contracts

**Strategy**: Matrix build for parallel execution
- Contracts: `oracle`, `provenance`, `registry`
- Each contract builds in parallel for faster CI

**Steps** (per contract):
1. Checkout code
2. Setup Rust stable toolchain
3. Add `wasm32-unknown-unknown` target
4. Install `rustfmt` and `clippy` components
5. Cache Rust dependencies and build artifacts
6. Check Rust code formatting with `cargo fmt`
7. Run Clippy linter with warnings as errors
8. Build contract for wasm32 target in release mode
9. Run contract tests
10. Upload compiled WASM artifact

**Caching**:
- Cargo registry, git database, and build artifacts
- Separate cache per contract for optimal performance

#### 3. `integration-check`

**Purpose**: Verify all components built successfully

**Dependencies**: Runs after `lint-and-build-frontend` and `build-contracts` complete

**Steps**:
1. Checkout code
2. Download all contract artifacts
3. List artifacts to verify presence
4. Display success message

## Environment Variables

```yaml
RUST_VERSION: stable
NODE_VERSION: 20
PNPM_VERSION: 10.18.2
```

These can be updated to change toolchain versions across all jobs.

## Caching Strategy

### pnpm Cache

```yaml
path: $(pnpm store path)
key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
```

- Caches the global pnpm store
- Invalidates when `pnpm-lock.yaml` changes
- Reduces dependency installation time from ~2 minutes to ~30 seconds

### Rust Cache

```yaml
path: |
  ~/.cargo/bin/
  ~/.cargo/registry/index/
  ~/.cargo/registry/cache/
  ~/.cargo/git/db/
  contracts/${{ matrix.contract }}/target/
key: ${{ runner.os }}-cargo-${{ matrix.contract }}-${{ hashFiles('**/Cargo.lock') }}
```

- Caches Cargo registry and compiled dependencies
- Separate cache per contract for isolation
- Invalidates when `Cargo.lock` changes
- Reduces build time from ~5 minutes to ~1 minute

## Artifacts

Compiled WASM contracts are uploaded as artifacts:

- **Name**: `{contract}-contract` (e.g., `oracle-contract`)
- **Path**: `contracts/{contract}/target/wasm32-unknown-unknown/release/*.wasm`
- **Retention**: 7 days

Artifacts can be downloaded from the GitHub Actions UI for testing or deployment.

## Adding the CI Badge to README

Add this badge to your README.md to show CI status:

```markdown
[![CI](https://github.com/your-org/Stellar-Veriphy/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/Stellar-Veriphy/actions/workflows/ci.yml)
```

Replace `your-org` with your GitHub organization or username.

## Local Testing

To run the same checks locally before pushing:

### Frontend Checks

```bash
# Install dependencies
pnpm install

# Lint
pnpm --filter frontend lint

# Build
pnpm build:frontend

# Test
pnpm --filter frontend test
```

### Contract Checks

```bash
# For each contract (oracle, provenance, registry)
cd contracts/oracle

# Format check
cargo fmt -- --check

# Clippy
cargo clippy --target wasm32-unknown-unknown --release -- -D warnings

# Build
cargo build --target wasm32-unknown-unknown --release

# Test
cargo test
```

## Troubleshooting

### Frontend Build Fails

**Issue**: ESLint errors or TypeScript compilation errors

**Solution**:
1. Run `pnpm --filter frontend lint` locally
2. Fix all linting errors
3. Run `pnpm build:frontend` to verify build succeeds

### Contract Build Fails

**Issue**: Rust compilation errors or Clippy warnings

**Solution**:
1. Run `cargo fmt` to format code
2. Run `cargo clippy --target wasm32-unknown-unknown --release` to see warnings
3. Fix all warnings (CI treats warnings as errors)
4. Run `cargo build --target wasm32-unknown-unknown --release` to verify

### Cache Issues

**Issue**: CI is slow or using stale dependencies

**Solution**:
1. Go to Actions → Caches in GitHub
2. Delete relevant caches
3. Re-run the workflow

### Artifact Upload Fails

**Issue**: WASM file not found

**Solution**:
1. Verify contract builds successfully locally
2. Check that `Cargo.toml` has correct `[lib]` configuration:
   ```toml
   [lib]
   crate-type = ["cdylib"]
   ```

## Performance Metrics

Typical CI run times (with warm cache):

| Job | Duration | Notes |
|-----|----------|-------|
| `lint-and-build-frontend` | ~2 minutes | Includes lint, build, and tests |
| `build-contracts` (per contract) | ~1.5 minutes | Parallel execution |
| `integration-check` | ~30 seconds | Lightweight verification |
| **Total** | ~2-3 minutes | With parallel execution |

Cold cache (first run or after cache invalidation):

| Job | Duration | Notes |
|-----|----------|-------|
| `lint-and-build-frontend` | ~4 minutes | Full dependency download |
| `build-contracts` (per contract) | ~5 minutes | Full Rust compilation |
| **Total** | ~6-8 minutes | One-time cost |

## Future Enhancements

Potential improvements to the CI workflow:

1. **Code Coverage**: Add coverage reporting with Codecov or Coveralls
2. **Security Scanning**: Add dependency vulnerability scanning
3. **Contract Size Check**: Verify WASM size doesn't exceed limits
4. **Deploy Preview**: Automatic deployment to testnet for PRs
5. **Performance Testing**: Add benchmarks for contract gas usage
6. **Documentation**: Auto-generate and deploy documentation
7. **Release Automation**: Automatic releases on version tags

## Related Documentation

- [Contributing Guide](../../CONTRIBUTING.md) - Development setup and guidelines
- [Deployment Guide](../../DEPLOYMENT.md) - Contract deployment instructions
- [Implementation Details](../../IMPLEMENTATION.md) - Contract architecture

## Support

If you encounter issues with the CI workflow:

1. Check the [Actions tab](https://github.com/your-org/Stellar-Veriphy/actions) for detailed logs
2. Review this documentation for common issues
3. Open an issue with the `ci` label
4. Contact the DevOps team

---

**Last Updated**: June 1, 2026
