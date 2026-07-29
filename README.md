# ⭐ StellarVeriphy — The Truth Engine for the Stellar Ecosystem

> **Note:** This README is intentionally long and comprehensive. It documents the *current* code in this repository (Soroban contracts, shared TypeScript utilities, and the Next.js frontend skeleton) and explains how the pieces are meant to work together.

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
