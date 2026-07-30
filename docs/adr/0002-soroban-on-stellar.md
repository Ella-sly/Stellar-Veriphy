# ADR-0002: Use Soroban smart contracts on Stellar

- **Status:** Accepted
- **Date:** 2026-03-15
- **Deciders:** Core maintainers

## Context

StellarVeriphy needs an on-chain layer to mint immutable, verifiable provenance certificates for digital media and to maintain a registry of trusted verification providers. Candidate platforms included:

- **Ethereum / EVM L2s** — largest smart contract ecosystem and tooling maturity, but transaction fees and confirmation times are unpredictable, and per-certificate costs would be significant at content-verification scale (potentially thousands of low-value transactions).
- **Solana** — fast and cheap, but a different trust/validator model and less mature Rust-native contract tooling at the time of evaluation.
- **Stellar / Soroban** — purpose-built for payments and asset movement at very low cost (~0.00001 XLM per operation), 3–5 second finality, and Soroban (introduced as Stellar's smart contract platform) supports Rust/WASM contracts.

The dominant constraint is that content verification is only useful at scale if certifying a single piece of media is cheap enough to be routine, not a rare, expensive event.

## Decision

We build StellarVeriphy's on-chain layer (`contracts/oracle`, `contracts/provenance`, `contracts/registry`) as Soroban smart contracts deployed on the Stellar network, written in Rust and compiled to WASM.

## Consequences

- Per-certificate cost stays low enough that per-upload, per-verification on-chain writes are economically viable, which is core to the product's use case.
- The team commits to Rust for all on-chain logic and to Soroban's storage/auth model (`env.storage()`, `Address::require_auth()`), which is a smaller ecosystem than EVM — fewer third-party libraries, audits, and tooling examples to draw on.
- Contributors need Rust + the Stellar CLI in their toolchain in addition to the Node/TypeScript stack used by the frontend (see [ADR-0003](0003-pnpm-monorepo.md)).
- Soroban was young at the time of this decision; contract APIs (e.g. `soroban-sdk`) may still change between minor versions, which is a real migration risk to track — see `contracts/*/Cargo.toml` for the pinned SDK version (`21.0.0`).
