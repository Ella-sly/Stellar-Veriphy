# ⭐ StellarVeriphy — The Truth Engine for the Stellar Ecosystem

StellarVeriphy is a decentralized digital content verification and provenance platform built on the **Stellar blockchain**. It enables creators, developers, and platforms to generate immutable authenticity proofs for digital media directly on-chain using **Soroban smart contracts** — Stellar's native smart contract platform built on Rust/WASM.

By leveraging Stellar's ultra-low transaction fees (~0.00001 XLM), fast 3–5 second finality, and energy-efficient **Stellar Consensus Protocol (SCP)**, StellarVeriphy makes large-scale content verification affordable, scalable, and environmentally sustainable.

---

## 🔑 Quick Summary

| Property | Value |
|---|---|
| **Project Name** | StellarVeriphy |
| **Goal** | Verifiable, auditable provenance for digital media and metadata |
| **Blockchain** | Stellar Network |
| **Smart Contracts** | Soroban (Rust/WASM) |
| **Frontend** | Next.js + TypeScript + Tailwind CSS |
| **Storage** | IPFS (decentralized) or MongoDB (high performance) |
| **Encryption** | StellarVeriphy Key Management Service (KMS) |
| **Trusted Verification** | Oracle-driven TEE using AWS Nitro Enclave |
| **Monorepo Manager** | pnpm |

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

---

## ⚙️ Key Features

### 📂 Media Provenance Verification
- Upload images, videos, documents, or AI-generated media.
- Attach a JSON manifest describing origin metadata (creator, timestamp, device info).
- Generate immutable authenticity certificates on Stellar.

### 🔐 Encryption & Access Control (KMS)
- Encrypts media before it enters the storage layer.
- Controls decryption permissions — creators specify who can view content.
- Supports key rotation and audit trails for enterprise-grade security.

### 🧠 Trusted Off-Chain Verification (TEE Oracle)
- **AWS Nitro Enclaves** provide a highly isolated compute environment.
- **Oracle Worker Nodes** orchestrate data flow between storage and the TEE.
- **Cryptographic Attestation** — the TEE generates a signed proof that verification ran correctly.

### 📜 On-Chain Provenance Certificates (Soroban)
Each minted certificate contains:
- Storage reference ID (IPFS CID or DB ID)
- Manifest hash
- Attestation proof hash
- Timestamp and creator identity (Stellar public key)

### 🧪 Proof-as-a-Service APIs
- `POST /api/verify/submit` — submit media for verification
- `GET /api/verify/status/:jobId` — check verification status
- `POST /api/webhook` — receive real-time callbacks

---

## 🛠️ Smart Contracts

| Contract | Purpose |
|---|---|
| `contracts/oracle` | Handles verification request submission and state management |
| `contracts/provenance` | Mints immutable provenance certificates after TEE attestation |
| `contracts/registry` | Maintains approved TEE code hashes and trusted oracle providers |

### Manifest Schema

```json
{
  "contentHash": "sha256:...",
  "creator": "G...",
  "timestamp": "2026-03-15T17:00:00Z",
  "metadata": {
    "device": "Camera Model X",
    "location": "Lat/Long",
    "aiModel": "None"
  }
}
```

---

## 🧰 Tech Stack

| Component | Technology |
|---|---|
| Blockchain | Stellar Network |
| Smart Contracts | Soroban (Rust/WASM) |
| Frontend | Next.js 15 + TypeScript + Tailwind CSS |
| Storage | IPFS / MongoDB |
| Encryption | Custom KMS |
| Trusted Compute | AWS Nitro Enclave |
| Oracle | Node.js Worker |
| Package Manager | pnpm |

---

## ⚡ Getting Started

### Prerequisites
- Node.js 20+
- Rust (latest stable) + Cargo
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)
- pnpm
- Freighter wallet (for Stellar testnet)

### Installation

```bash
git clone https://github.com/your-org/StellarVeriphy.git
cd StellarVeriphy
pnpm install
```

### Run Frontend

```bash
pnpm dev:frontend
# opens at http://localhost:3000
```

### Build Soroban Contracts

```bash
cd contracts/oracle && stellar contract build
cd ../provenance && stellar contract build
cd ../registry && stellar contract build
```

### Deploy to Testnet

```bash
stellar contract deploy \
  --wasm contracts/oracle/target/wasm32-unknown-unknown/release/oracle.wasm \
  --network testnet
```

For network setup, initialization, verification, and rollback, see the full [Contract Deployment Process](docs/deployment.md).

---

## 🌍 Use Cases

- **Journalism Authenticity** — verify source and time of news footage
- **AI-Generated Content** — distinguish human vs AI creation
- **NFT Provenance** — link NFTs to verifiable off-chain assets
- **Document Compliance** — ensure legal documents haven't been tampered with
- **Legal Audit Trails** — immutable chains of custody for evidence
- **Supply Chain Verification** — verify photos of goods at transit points
- **Prediction Market Resolution** — use verified media as trustless oracles

---

## 🗺️ Roadmap

| Phase | Description |
|---|---|
| Phase 0 | Architecture design — manifest schema, storage abstraction, Soroban contract schema |
| Phase 1 | MVP creator workflow — upload UI, storage integration, basic TEE simulation |
| Phase 2 | Developer APIs — SDK release, webhooks, job management |
| Phase 3 | Security hardening — full Nitro Enclave deployment, KMS key rotation |
| Phase 4 | Ecosystem integration — NFT provenance linking, marketplace verification APIs |
| Phase 5 | Governance & registry — TEE hash governance, oracle provider staking |

---

## 📚 Documentation

| Guide | Covers |
|---|---|
| [Developer Onboarding Guide](docs/onboarding.md) | Environment setup, dependency install, local dev workflow, testing, code style, contribution process, common issues |
| [Contract Deployment Process](docs/deployment.md) | Deploying `oracle`, `provenance`, and `registry` — network config, initialization, verification, rollback |
| [User Guide and Tutorials](docs/user-guide.md) | Using StellarVeriphy — what works today vs. the target verification/certificate workflow, troubleshooting, FAQ |
| [Architecture Decision Records](docs/adr/README.md) | Why the system is built the way it is — Soroban, the monorepo layout, the TEE trust model, storage abstraction |

## 🤝 Contributing

See the [Developer Onboarding Guide](docs/onboarding.md) for full setup and contribution details. Short version:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request.

---

## 📄 License

MIT License

---

## 🙏 Acknowledgments

- Built on the **Stellar Blockchain** — [stellar.org](https://stellar.org)
- Powered by **Soroban Smart Contracts** — [developers.stellar.org](https://developers.stellar.org)
- Inspired by decentralized authenticity infrastructure

---

## ❤️ Vision

StellarVeriphy aims to become the universal authenticity layer for digital content across the Stellar ecosystem — enabling trust, transparency, and verifiable digital truth at scale.
