# CI Quick Reference

Quick commands to run the same checks locally that CI runs in GitHub Actions.

## Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add wasm32 target
rustup target add wasm32-unknown-unknown

# Install Node.js 20 and pnpm
npm install -g pnpm@10.18.2
```

## Frontend Checks

```bash
# From repo root
pnpm install --no-frozen-lockfile

# Check (lint)
pnpm check:frontend

# Build
pnpm build:frontend

# Test
pnpm --filter frontend test
```

## Contract Checks

Run these for each contract (`oracle`, `provenance`, `registry`):

```bash
cd contracts/oracle  # or provenance, or registry

# Format check
cargo fmt -- --check

# Lint with Clippy (warnings as errors)
cargo clippy --target wasm32-unknown-unknown --release -- -D warnings

# Build
cargo build --target wasm32-unknown-unknown --release

# Test
cargo test
```

## All Checks (One Command)

### Frontend

```bash
pnpm install && pnpm check:frontend && pnpm build:frontend && pnpm --filter frontend test
```

### All Contracts

```bash
for contract in oracle provenance registry; do
  echo "Checking $contract..."
  cd contracts/$contract
  cargo fmt -- --check && \
  cargo clippy --target wasm32-unknown-unknown --release -- -D warnings && \
  cargo build --target wasm32-unknown-unknown --release && \
  cargo test
  cd ../..
done
```

## Fix Common Issues

### Auto-fix Rust formatting

```bash
cd contracts/oracle  # or provenance, or registry
cargo fmt
```

### Auto-fix ESLint issues

```bash
cd frontend
pnpm lint --fix
```

## CI Status

Check CI status: [GitHub Actions](https://github.com/your-org/Stellar-Veriphy/actions)

## What CI Checks

| Check | Command | Job |
|-------|---------|-----|
| Frontend check | `pnpm check:frontend` | `lint-and-build-frontend` |
| Frontend build | `pnpm build:frontend` | `lint-and-build-frontend` |
| Frontend tests | `pnpm --filter frontend test` | `lint-and-build-frontend` |
| Rust format | `cargo fmt -- --check` | `build-contracts` |
| Rust lint | `cargo clippy ... -- -D warnings` | `build-contracts` |
| Contract build | `cargo build --target wasm32-unknown-unknown --release` | `build-contracts` |
| Contract tests | `cargo test` | `build-contracts` |

## Pre-commit Hook

Add this to `.git/hooks/pre-commit` to run checks before committing:

```bash
#!/bin/bash

echo "Running pre-commit checks..."

# Frontend checks
echo "Checking frontend..."
pnpm check:frontend || exit 1

# Contract checks (only changed contracts)
for contract in oracle provenance registry; do
  if git diff --cached --name-only | grep -q "contracts/$contract"; then
    echo "Checking $contract contract..."
    cd contracts/$contract
    cargo fmt -- --check || exit 1
    cargo clippy --target wasm32-unknown-unknown --release -- -D warnings || exit 1
    cd ../..
  fi
done

echo "✅ All pre-commit checks passed!"
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

## Troubleshooting

### "error: linker `rust-lld` not found"

```bash
rustup component add rust-lld
```

### "error: target 'wasm32-unknown-unknown' not found"

```bash
rustup target add wasm32-unknown-unknown
```

### "pnpm: command not found"

```bash
npm install -g pnpm@10.18.2
```

### CI passes but local checks fail

```bash
# Clear caches
rm -rf node_modules
rm -rf contracts/*/target
pnpm install
```

### Local checks pass but CI fails

- Ensure you're using the same versions:
  - Node.js 20
  - pnpm 10.18.2
  - Rust stable
- Check for uncommitted files
- Verify `pnpm-lock.yaml` is committed

---

**Tip**: Run `pnpm install && pnpm check:frontend && pnpm build:frontend` before pushing to catch most issues early!
