# Contributing to StellarVeriphy

Thank you for your interest in contributing to StellarVeriphy! This guide will help you set up your development environment and understand our contribution workflow.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Running the Project](#running-the-project)
- [Building Contracts](#building-contracts)
- [Running Tests](#running-tests)
- [Code Style and Linting](#code-style-and-linting)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Getting Help](#getting-help)

---

## Prerequisites

Before you begin, ensure you have the following tools installed:

### Required Tools

1. **Node.js 20+**
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **pnpm 10.18.2+**
   - Install: `npm install -g pnpm`
   - Verify installation: `pnpm --version`
   - This project uses pnpm workspaces for monorepo management

3. **Rust (stable)**
   - Install via [rustup](https://rustup.rs/): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
   - Verify installation: `rustc --version`
   - Add wasm32 target: `rustup target add wasm32-unknown-unknown`

4. **Stellar CLI**
   - Install: `cargo install --locked stellar-cli --features opt`
   - Verify installation: `stellar --version`
   - Used for building and deploying Soroban smart contracts

5. **Freighter Wallet** (for frontend testing)
   - Install the [Freighter browser extension](https://www.freighter.app/)
   - Create a testnet account and fund it via [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)

### Optional Tools

- **Git** (for version control)
- **VS Code** or your preferred IDE
- **Rust Analyzer** extension (for Rust development)

---

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/Stellar-Veriphy.git
cd Stellar-Veriphy
```

### 2. Install Dependencies

Install all workspace dependencies using pnpm:

```bash
pnpm install
```

This will install dependencies for:
- Root workspace
- Frontend (`frontend/`)
- Shared packages (`packages/shared/`)

### 3. Configure Environment Variables

#### Frontend Configuration

Copy the example environment file and configure it:

```bash
cd frontend
cp .env.local.example .env.local
```

Edit `.env.local` and set the following variables:

```env
# Stellar Network RPC URLs
NEXT_PUBLIC_TESTNET_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_MAINNET_RPC_URL=https://mainnet.stellar.validationcloud.io/v1/soroban/rpc
NEXT_PUBLIC_FUTURENET_RPC_URL=https://rpc-futurenet.stellar.org

# Active network (testnet | mainnet | futurenet)
NEXT_PUBLIC_NETWORK=testnet

# Soroban contract addresses (leave empty for local development)
NEXT_PUBLIC_ORACLE_CONTRACT_ID=
NEXT_PUBLIC_PROVENANCE_CONTRACT_ID=
NEXT_PUBLIC_REGISTRY_CONTRACT_ID=
```

#### Stellar CLI Configuration

Configure your Stellar CLI for testnet:

```bash
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Create or import an identity
stellar keys generate alice --network testnet
```

---

## Running the Project

### Frontend Development Server

Start the Next.js development server:

```bash
# From the root directory
pnpm dev:frontend

# Or from the frontend directory
cd frontend
pnpm dev
```

The frontend will be available at [http://localhost:3000](http://localhost:3000).

### Building the Frontend

To create a production build:

```bash
pnpm build:frontend
```

---

## Building Contracts

### Build All Contracts

From the root directory:

```bash
pnpm build:contracts
```

This will build all three Soroban contracts:
- `contracts/oracle/`
- `contracts/provenance/`
- `contracts/registry/`

### Build Individual Contracts

To build a specific contract:

```bash
cd contracts/oracle
stellar contract build

# Or for provenance
cd contracts/provenance
stellar contract build

# Or for registry
cd contracts/registry
stellar contract build
```

The compiled WASM files will be in `target/wasm32-unknown-unknown/release/`.

### Deploy Contracts (Optional)

For deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Running Tests

### Frontend Tests

Run Jest tests for the frontend:

```bash
cd frontend
pnpm test

# Watch mode for development
pnpm test:watch
```

### Contract Tests

Each contract has its own test suite. Run tests for a specific contract:

```bash
# Oracle contract tests
cd contracts/oracle
cargo test

# Provenance contract tests
cd contracts/provenance
cargo test

# Registry contract tests
cd contracts/registry
cargo test
```

To run all contract tests:

```bash
# From the root directory
cd contracts/oracle && cargo test && \
cd ../provenance && cargo test && \
cd ../registry && cargo test
```

### Test Coverage

For Rust contracts, you can generate coverage reports:

```bash
cargo install cargo-tarpaulin
cd contracts/oracle
cargo tarpaulin --out Html
```

---

## Code Style and Linting

### Frontend Linting

The project uses ESLint for TypeScript/JavaScript code:

```bash
cd frontend
pnpm lint

# Or from root
pnpm check:frontend
```

### Rust Formatting

Format Rust code using `rustfmt`:

```bash
cd contracts/oracle
cargo fmt

# Check formatting without modifying files
cargo fmt -- --check
```

### Pre-commit Hooks

This project uses Husky and lint-staged for pre-commit hooks. They will automatically run when you commit:

- ESLint on staged frontend files
- Rustfmt on staged Rust files

To manually run pre-commit checks:

```bash
pnpm prepare
```

### Pre-commit Hooks

This project uses Husky and lint-staged for pre-commit hooks. They will automatically run when you commit:

- ESLint on staged frontend files
- Rustfmt on staged Rust files

To manually run pre-commit checks:

```bash
pnpm prepare
```

**Note**: The hooks are automatically installed when you run `pnpm install`.

---

## Branch Naming Conventions

Use the following naming conventions for branches:

- **Feature branches**: `feature/<issue-number>-<short-description>`
  - Example: `feature/121-add-contributing-guide`

- **Bug fix branches**: `fix/<issue-number>-<short-description>`
  - Example: `fix/45-oracle-signature-validation`

- **Documentation branches**: `docs/<issue-number>-<short-description>`
  - Example: `docs/121-contributing-guide`

- **Refactoring branches**: `refactor/<issue-number>-<short-description>`
  - Example: `refactor/78-simplify-manifest-hashing`

- **Hotfix branches**: `hotfix/<issue-number>-<short-description>`
  - Example: `hotfix/99-critical-security-patch`

---

## Pull Request Process

### Before Submitting a PR

Complete this checklist before submitting your pull request:

- [ ] **Code Quality**
  - [ ] Code follows the project's style guidelines
  - [ ] All linting checks pass (`pnpm lint` for frontend, `cargo fmt --check` for contracts)
  - [ ] No unnecessary console.logs or debug statements

- [ ] **Testing**
  - [ ] All existing tests pass
  - [ ] New tests added for new features or bug fixes
  - [ ] Test coverage is maintained or improved

- [ ] **Documentation**
  - [ ] Code is properly commented where necessary
  - [ ] README or other docs updated if needed
  - [ ] API changes are documented

- [ ] **Contracts (if applicable)**
  - [ ] Contract builds successfully (`stellar contract build`)
  - [ ] Contract tests pass (`cargo test`)
  - [ ] No panics or unsafe operations introduced
  - [ ] Gas optimization considered

- [ ] **Frontend (if applicable)**
  - [ ] UI is responsive and accessible
  - [ ] No TypeScript errors (`pnpm build`)
  - [ ] Freighter wallet integration tested (if applicable)

- [ ] **Git Hygiene**
  - [ ] Branch is up to date with `main`
  - [ ] Commits are logical and well-described
  - [ ] No merge conflicts
  - [ ] Pre-commit hooks pass (lint-staged)
  - [ ] Pre-push hook passes (frontend build)

### Submitting the PR

1. **Push your branch** to the remote repository:
   ```bash
   git push origin feature/121-add-contributing-guide
   ```

2. **Create a Pull Request** on GitHub with:
   - **Title**: Clear, concise description (e.g., "Add CONTRIBUTING.md with development setup guide")
   - **Description**: Include:
     - Summary of changes
     - Related issue number (e.g., "Closes #121")
     - Testing performed
     - Screenshots (for UI changes)
     - Breaking changes (if any)

3. **Request Review**: Tag relevant maintainers or team members

4. **Address Feedback**: Respond to review comments and make necessary changes

5. **Merge**: Once approved, a maintainer will merge your PR

### PR Title Format

Use conventional commit format for PR titles:

- `feat: Add new feature`
- `fix: Fix bug in oracle contract`
- `docs: Update contributing guide`
- `refactor: Simplify manifest hashing`
- `test: Add tests for provenance contract`
- `chore: Update dependencies`

---

## Project Structure

```
Stellar-Veriphy/
├── contracts/              # Soroban smart contracts
│   ├── oracle/            # Oracle contract (TEE attestation verification)
│   ├── provenance/        # Provenance certificate minting
│   └── registry/          # TEE hash and provider registry
├── frontend/              # Next.js frontend application
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   └── lib/              # Utility functions
├── packages/
│   └── shared/           # Shared TypeScript types and utilities
├── CONTRIBUTING.md       # This file
├── DEPLOYMENT.md         # Deployment instructions
├── README.md             # Project overview
└── package.json          # Root workspace configuration
```

---

## Getting Help

If you need help or have questions:

1. **Check existing documentation**:
   - [README.md](./README.md) - Project overview
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
   - [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Implementation details

2. **Search existing issues** on GitHub

3. **Open a new issue** with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)

4. **Join the community** (if applicable):
   - Discord server
   - Telegram group
   - Developer forum

---

## Code of Conduct

Please note that this project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

---

## License

By contributing to StellarVeriphy, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to StellarVeriphy! 🚀⭐
