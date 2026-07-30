# CI Troubleshooting Guide

This guide helps you diagnose and fix common CI failures in the StellarVeriphy project.

## Table of Contents

- [Frontend Issues](#frontend-issues)
- [Contract Build Issues](#contract-build-issues)
- [Cache Issues](#cache-issues)
- [Dependency Issues](#dependency-issues)
- [Performance Issues](#performance-issues)

---

## Frontend Issues

### ❌ ESLint Errors

**Symptom**: `lint-and-build-frontend` job fails with ESLint errors

**Example Error**:
```
Error: 'useState' is not defined  no-undef
```

**Solution**:
```bash
# Run lint locally
cd frontend
pnpm lint

# Auto-fix issues
pnpm lint --fix

# Commit fixes
git add .
git commit -m "fix: resolve ESLint errors"
```

**Prevention**: Set up pre-commit hooks (see [CI_QUICK_REFERENCE.md](./CI_QUICK_REFERENCE.md))

---

### ❌ TypeScript Compilation Errors

**Symptom**: `build:frontend` fails with TypeScript errors

**Example Error**:
```
Type 'string | undefined' is not assignable to type 'string'
```

**Solution**:
```bash
# Run build locally to see errors
pnpm build:frontend

# Fix type errors in the code
# Add proper type guards or assertions

# Verify fix
pnpm build:frontend
```

**Common Fixes**:
- Add null checks: `if (value) { ... }`
- Use optional chaining: `value?.property`
- Add type assertions: `value as string`
- Fix type definitions in `*.d.ts` files

---

### ❌ Frontend Tests Failing

**Symptom**: `pnpm --filter frontend test` fails

**Example Error**:
```
FAIL app/components/Button.test.tsx
  ● Button › renders correctly
    expect(received).toBeInTheDocument()
```

**Solution**:
```bash
# Run tests locally
cd frontend
pnpm test

# Run specific test file
pnpm test Button.test.tsx

# Update snapshots if needed
pnpm test -- -u

# Commit fixes
git add .
git commit -m "fix: update failing tests"
```

---

### ❌ Missing Environment Variables

**Symptom**: Build succeeds but runtime errors expected

**Example Error**:
```
Warning: NEXT_PUBLIC_NETWORK is not defined
```

**Solution**:

Environment variables in CI are typically not needed for build, but if required:

1. Add to GitHub Secrets (Settings → Secrets → Actions)
2. Reference in workflow:
   ```yaml
   env:
     NEXT_PUBLIC_NETWORK: ${{ secrets.NEXT_PUBLIC_NETWORK }}
   ```

For build-time variables, ensure they have defaults in the code.

---

## Contract Build Issues

### ❌ Rust Formatting Errors

**Symptom**: `cargo fmt -- --check` fails

**Example Error**:
```
Diff in /home/runner/work/Stellar-Veriphy/contracts/oracle/src/lib.rs
```

**Solution**:
```bash
# Format all contracts
cd contracts/oracle
cargo fmt

cd ../provenance
cargo fmt

cd ../registry
cargo fmt

# Commit formatted code
git add .
git commit -m "style: format Rust code"
```

**Prevention**: Run `cargo fmt` before committing Rust code

---

### ❌ Clippy Warnings

**Symptom**: `cargo clippy` fails with warnings (treated as errors in CI)

**Example Error**:
```
warning: unused variable: `env`
  --> src/lib.rs:42:9
   |
42 |     let env = Env::default();
   |         ^^^ help: if this is intentional, prefix it with an underscore: `_env`
```

**Solution**:
```bash
# Run Clippy locally
cd contracts/oracle
cargo clippy --target wasm32-unknown-unknown --release

# Fix warnings in code
# For unused variables, prefix with underscore: _env
# For other warnings, follow Clippy's suggestions

# Verify fix
cargo clippy --target wasm32-unknown-unknown --release -- -D warnings
```

**Common Clippy Fixes**:
- Unused variables: Prefix with `_` or remove
- Unnecessary clones: Remove `.clone()` if not needed
- Inefficient string operations: Use `&str` instead of `String`
- Missing documentation: Add doc comments

---

### ❌ Contract Compilation Errors

**Symptom**: `cargo build` fails

**Example Error**:
```
error[E0425]: cannot find value `DataKey` in this scope
  --> src/lib.rs:45:30
```

**Solution**:
```bash
# Build locally to see full error
cd contracts/oracle
cargo build --target wasm32-unknown-unknown --release

# Fix compilation errors
# Check imports, type definitions, etc.

# Verify fix
cargo build --target wasm32-unknown-unknown --release
```

**Common Issues**:
- Missing imports: Add `use` statements
- Type mismatches: Check function signatures
- Missing dependencies: Update `Cargo.toml`

---

### ❌ Contract Tests Failing

**Symptom**: `cargo test` fails

**Example Error**:
```
test test_init ... FAILED

failures:
    test_init

test result: FAILED. 0 passed; 1 failed
```

**Solution**:
```bash
# Run tests locally
cd contracts/oracle
cargo test

# Run specific test
cargo test test_init

# Run with output
cargo test -- --nocapture

# Fix test or implementation
# Commit fixes
```

---

### ❌ WASM Target Not Found

**Symptom**: Build fails with target error

**Example Error**:
```
error: target 'wasm32-unknown-unknown' not found
```

**Solution**:

This shouldn't happen in CI (target is installed in workflow), but locally:

```bash
rustup target add wasm32-unknown-unknown
```

If it happens in CI, check the workflow setup step.

---

## Cache Issues

### ❌ Stale Cache Causing Failures

**Symptom**: CI fails but local builds succeed, or vice versa

**Solution**:

1. Go to GitHub repository
2. Click **Actions** tab
3. Click **Caches** in left sidebar
4. Find and delete relevant caches:
   - `pnpm-store-*` for frontend issues
   - `cargo-*` for contract issues
5. Re-run the workflow

**Alternative**: Add `[skip cache]` to commit message (requires workflow modification)

---

### ❌ Cache Size Too Large

**Symptom**: Cache save/restore takes very long

**Solution**:

Caches are automatically managed, but if issues persist:

1. Check cache sizes in Actions → Caches
2. If a cache is >1GB, consider excluding unnecessary files
3. Update cache paths in workflow to be more specific

---

## Dependency Issues

### ❌ pnpm Lock File Out of Sync

**Symptom**: `pnpm install` fails or installs wrong versions

**Example Error**:
```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile"
```

**Solution**:

The workflow uses `--no-frozen-lockfile` to avoid this, but if it persists:

```bash
# Update lock file
pnpm install

# Commit updated lock file
git add pnpm-lock.yaml
git commit -m "chore: update pnpm lock file"
```

---

### ❌ Cargo Lock File Out of Sync

**Symptom**: Cargo build fails with dependency resolution errors

**Solution**:

```bash
cd contracts/oracle  # or provenance, or registry
cargo update
cargo build --target wasm32-unknown-unknown --release

# Commit updated lock file
git add Cargo.lock
git commit -m "chore: update Cargo lock file"
```

---

### ❌ Dependency Version Conflicts

**Symptom**: Build fails with version conflict errors

**Example Error**:
```
error: failed to select a version for `soroban-sdk`
```

**Solution**:

```bash
# Check dependency versions
cd contracts/oracle
cat Cargo.toml

# Update to compatible versions
# Edit Cargo.toml

# Update dependencies
cargo update

# Test build
cargo build --target wasm32-unknown-unknown --release
```

---

## Performance Issues

### ❌ CI Takes Too Long

**Symptom**: CI runs exceed 10 minutes

**Diagnosis**:

1. Check which job is slow in Actions UI
2. Look at individual step durations

**Solutions**:

**Slow Frontend Build**:
- Ensure pnpm cache is working (check cache hit/miss in logs)
- Consider splitting lint and build into separate jobs

**Slow Contract Build**:
- Ensure Cargo cache is working
- Check if all three contracts are building in parallel (matrix strategy)
- Consider using `cargo build --release` without `--target` for tests

**Slow Tests**:
- Run tests in parallel: `cargo test -- --test-threads=4`
- Skip slow tests in CI: `#[ignore]` attribute

---

### ❌ Cache Not Being Used

**Symptom**: Every run downloads all dependencies

**Diagnosis**:

Check CI logs for:
```
Cache not found for input keys: ...
```

**Solution**:

1. Verify cache key includes correct hash:
   - Frontend: `pnpm-lock.yaml`
   - Contracts: `Cargo.lock`
2. Ensure lock files are committed
3. Check if cache was manually deleted
4. Verify cache paths are correct in workflow

---

## GitHub Actions Specific Issues

### ❌ Workflow Not Triggering

**Symptom**: Push to main but workflow doesn't run

**Solution**:

1. Check workflow file is in `.github/workflows/`
2. Verify YAML syntax is valid
3. Check branch name matches trigger (e.g., `main` vs `master`)
4. Ensure Actions are enabled in repository settings

---

### ❌ Permission Denied Errors

**Symptom**: Workflow fails with permission errors

**Example Error**:
```
Error: Resource not accessible by integration
```

**Solution**:

1. Go to Settings → Actions → General
2. Under "Workflow permissions", select:
   - "Read and write permissions"
3. Save changes
4. Re-run workflow

---

### ❌ Artifact Upload Fails

**Symptom**: Contract artifacts not uploaded

**Example Error**:
```
Error: No files were found with the provided path
```

**Solution**:

1. Verify contract builds successfully
2. Check WASM file path:
   ```bash
   ls contracts/oracle/target/wasm32-unknown-unknown/release/
   ```
3. Ensure `Cargo.toml` has:
   ```toml
   [lib]
   crate-type = ["cdylib"]
   ```
4. Update artifact path in workflow if needed

---

## Getting Help

If you've tried the solutions above and still have issues:

1. **Check CI logs**: Click on failed job → Expand failed step → Read full error
2. **Search existing issues**: [GitHub Issues](https://github.com/your-org/Stellar-Veriphy/issues)
3. **Open a new issue**: Include:
   - Link to failed workflow run
   - Full error message
   - Steps you've tried
   - Local environment details
4. **Ask in discussions**: [GitHub Discussions](https://github.com/your-org/Stellar-Veriphy/discussions)

---

## Useful Commands

### View CI Logs Locally

```bash
# Install act (GitHub Actions local runner)
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run workflow locally
act push
```

### Debug CI Environment

Add this step to workflow for debugging:

```yaml
- name: Debug Environment
  run: |
    echo "Node version: $(node --version)"
    echo "pnpm version: $(pnpm --version)"
    echo "Rust version: $(rustc --version)"
    echo "Cargo version: $(cargo --version)"
    echo "Working directory: $(pwd)"
    echo "Files:"
    ls -la
```

---

**Last Updated**: June 1, 2026

**Related Documentation**:
- [CI Quick Reference](./CI_QUICK_REFERENCE.md)
- [Workflow README](./workflows/README.md)
- [Contributing Guide](../CONTRIBUTING.md)
