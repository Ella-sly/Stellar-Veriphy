# ⭐ StellarVeriphy — The Truth Engine for the Stellar Ecosystem

[![CI Status](https://github.com/Stellar-Veriphy/Stellar-Veriphy/actions/workflows/ci.yml/badge.svg)](https://github.com/Stellar-Veriphy/Stellar-Veriphy/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/Stellar-Veriphy/Stellar-Veriphy/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://github.com/Stellar-Veriphy/Stellar-Veriphy)
[![pnpm](https://img.shields.io/badge/pnpm-10.18.2-blue.svg)](https://pnpm.io/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![Rust](https://img.shields.io/badge/rust-stable-orange.svg)](https://www.rust-lang.org/)

StellarVeriphy is a decentralized digital content verification and provenance platform built on the **Stellar blockchain**. It enables creators, developers, and platforms to generate immutable authenticity proofs for digital media directly on-chain using **Soroban smart contracts** — Stellar's native smart contract platform built on Rust/WASM.

By leveraging Stellar's ultra-low transaction fees (~0.00001 XLM), fast 3–5 second finality, and energy-efficient **Stellar Consensus Protocol (SCP)**, StellarVeriphy makes large-scale content verification affordable, scalable, and environmentally sustainable.

---

## 🔑 Quick Summary

| Property                 | Value                                                           |
| ------------------------ | --------------------------------------------------------------- |
| **Project Name**         | StellarVeriphy                                                  |
| **Goal**                 | Verifiable, auditable provenance for digital media and metadata |
| **Blockchain**           | Stellar Network                                                 |
| **Smart Contracts**      | Soroban (Rust/WASM)                                             |
| **Frontend**             | Next.js + TypeScript + Tailwind CSS                             |
| **Storage**              | IPFS (decentralized) or MongoDB (high performance)              |
| **Encryption**           | StellarVeriphy Key Management Service (KMS)                     |
| **Trusted Verification** | Oracle-driven TEE using AWS Nitro Enclave                       |
| **Monorepo Manager**     | pnpm                                                            |

---

## 🌐 What StellarVeriphy Solves

Digital media today can easily be manipulated, forged, or misrepresented — deepfakes, AI-generated content, tampered documents. StellarVeriphy provides a robust solution through:

- **Tamper-proof content provenance** — records the history and origin of content immutably on Stellar.
- **Cryptographic authenticity verification** — uses advanced cryptographic techniques to verify media has not been altered.
- **On-chain certification** — mints a permanent record on Stellar that acts as a "digital birth certificate" for the asset.
- **Trustless third-party verification** — external apps can verify media without relying on a central authority.
- **Secure encryption and access control** — protects sensitive media while allowing controlled sharing.
- **Developer APIs** — simplifies integration of trust verification into existing workflows.

---

## 🚀 Core Architecture

StellarVeriphy combines **Web2 infrastructure** (speed and storage) with **Web3 trust guarantees** (immutability and verification).

```
Media + Manifest
      │
      ▼
Storage Layer (IPFS / MongoDB)
      │
      ▼
TEE Oracle Worker
      │
      ▼
AWS Nitro Enclave (Attestation)
      │
      ▼
Soroban Smart Contract
      │
      ▼
On-Chain Provenance Certificate (Stellar)
```

---

## 🏗️ Monorepo Structure

```
StellarVeriphy/
├── package.json                  # Root workspace config (pnpm)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
│
├── frontend/                     # Next.js app (UI + API routes)
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── api/health/route.ts
│   │   └── creator/upload-content/page.tsx
│   ├── components/
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── contracts/                    # Soroban smart contracts (Rust)
│   ├── oracle/                   # Verification request + attestation
│   │   ├── src/lib.rs
│   │   └── Cargo.toml
│   ├── provenance/               # Provenance certificate minting
│   │   ├── src/lib.rs
│   │   └── Cargo.toml
│   └── registry/                 # TEE code hash registry
│       ├── src/lib.rs
│       └── Cargo.toml
│
├── packages/
│   └── shared/                   # Shared types and utilities
│       ├── types/index.ts
│       ├── utils/hash.ts
│       └── package.json
│
└── docs/                         # Documentation (onboarding, deployment, user guide, ADRs)
    ├── onboarding.md
    ├── deployment.md
    ├── user-guide.md
    └── adr/
```

> **Note:** This README is intentionally long and comprehensive. It documents the _current_ code in this repository (Soroban contracts, shared TypeScript utilities, and the Next.js frontend skeleton) and explains how the pieces are meant to work together.

---

## 1. Project overview

**StellarVeriphy** is a decentralized platform for **digital content verification** and **provenance** on the **Stellar** blockchain.

In practice, “verification” means: given some piece of media (an image, video, document, or other binary asset) and some metadata that claims an origin (“who created it”, “when it was produced”, “what device produced it”, “which AI model was used”, etc.), the system must provide cryptographic evidence that:

1. The content has not been altered since verification.
2. The metadata (the “manifest”) corresponds to the content.
3. A trusted verification process ran (for example, an oracle backed by a Trusted Execution Environment).
4. The final result is recorded **immutably** on-chain, so any third party can audit and verify the certificate without trusting a central authority.

StellarVeriphy implements this design by splitting the system into two main trust layers:

- **Off-chain / Web2 layer**: fast storage and orchestration (e.g., IPFS or MongoDB for asset bytes and manifests).
- **On-chain / Web3 layer**: immutable verification records on Stellar using **Soroban smart contracts**.

The platform’s core outcome is an on-chain **“provenance certificate”**—a record minted on Stellar that binds together:

- a reference to where the asset bytes live (e.g., an IPFS CID or a database id),
- a cryptographic hash of the manifest,
- a cryptographic hash of an attestation proof that verification happened in a trusted way,
- and the creator identity (an on-chain address).

The code in this repository also includes an additional **registry** of approved **TEE code hashes** and approved **oracle provider keys**, which is used to gate who can attest and which trusted code is acceptable.

---

## 2. Repository layout (monorepo)

This repository is managed as a **pnpm workspace**.

Top-level:

- `package.json` — workspace scripts and tooling.
- `pnpm-workspace.yaml` — workspace package discovery.
- `tsconfig.base.json` — shared TypeScript config.

Main components:

1. **`frontend/`** — Next.js application.
2. **`contracts/`** — Rust/Soroban smart contracts:
   - `contracts/oracle/`
   - `contracts/provenance/`
   - `contracts/registry/`
3. **`packages/shared/`** — shared TypeScript types and hashing utilities.

### 2.1. Why a monorepo?

A monorepo is especially useful here because the system relies on a consistent definition of:

- what a “manifest” is,
- how hashes are computed,
- which parameters are passed from the off-chain world into on-chain calls,
- and which verification states exist.

Keeping `packages/shared` close to both the frontend and the contracts reduces the risk of mismatched hashing or schema drift.

For network setup, initialization, verification, and rollback, see the full [Contract Deployment Process](docs/deployment.md).

---

## 3. Stellar concepts used by the contracts

The contracts use the **Soroban SDK** (Rust → WASM). The important building blocks include:

- `Env` — execution environment, provides storage, ledger time, crypto, etc.
- Contract storage types:
  - `env.storage().instance()` for contract instance data (persistent across calls; commonly used for configuration)
  - `env.storage().persistent()` for long-lived mappings
  - `env.storage().temporary()` for state that should expire
- Cross-contract calls via `env.invoke_contract(...)` and generated contract clients.
- Contract events via `env.events().publish(...)` or typed `#[contractevent]` events.
- Cryptographic verification via `env.crypto().ed25519_verify(...)`.

---

## 📚 Documentation

| Guide                                                 | Covers                                                                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [Developer Onboarding Guide](docs/onboarding.md)      | Environment setup, dependency install, local dev workflow, testing, code style, contribution process, common issues                  |
| [Contract Deployment Process](docs/deployment.md)     | Deploying `oracle`, `provenance`, and `registry` — network config, initialization, verification, rollback                            |
| [CI/CD Pipeline](docs/deployment/ci-cd-pipeline.md)   | Frontend build/deploy pipeline — GHCR image, staging/production GitHub Environments, blue-green deploy, rollback, notifications      |
| [Security Headers](docs/security/security-headers.md) | The HTTP security header set applied to every response and why                                                                       |
| [Key Management](docs/security/key-management.md)     | Custody, rotation, storage, access control, backup, and auditing for every key category in the system                                |
| [Privacy Policy](docs/legal/privacy-policy.md)        | What StellarVeriphy stores, where, and your GDPR/CCPA rights — see also [Data Retention Policy](docs/legal/data-retention-policy.md) |
| [User Guide and Tutorials](docs/user-guide.md)        | Using StellarVeriphy — what works today vs. the target verification/certificate workflow, troubleshooting, FAQ                       |
| [Architecture Decision Records](docs/adr/README.md)   | Why the system is built the way it is — Soroban, the monorepo layout, the TEE trust model, storage abstraction                       |

## 🤝 Contributing

See the [Developer Onboarding Guide](docs/onboarding.md) for full setup and contribution details. Short version:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request.

## 4. Shared TypeScript utilities (`packages/shared`)

### 4.1. `packages/shared/types/index.ts`

This file defines TypeScript interfaces that model what the frontend/off-chain systems will likely send to contracts.

Key definitions:

- `ContentManifest`
  - `contentHash`: string representing a SHA-256 hash of the media file
  - `creator`: Stellar public key like `G...`
  - `timestamp`: ISO 8601 string
  - `metadata` (optional): device/location/AI model

- `ProvenanceCert`
  - `id`: certificate id
  - `storageRef`: where the asset bytes live
  - `manifestHash`: hash of manifest
  - `attestationHash`: hash of the TEE attestation
  - `creator`: creator public key
  - `timestamp`: when the certificate was minted

- `VerificationStatus`
  - union of states: `
