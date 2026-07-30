# ADR-0004: TEE-based oracle for trusted off-chain verification

- **Status:** Accepted
- **Date:** 2026-03-15
- **Deciders:** Core maintainers

## Context

Deciding whether a piece of media matches its claimed manifest (device, timestamp, AI-generation status, etc.) requires computation that is impractical to run directly on-chain — media files are large, verification logic may involve ML models, and Soroban contracts are not designed for that workload. Some off-chain component has to do this work and report a result the chain can trust.

Options considered:
- **Trust a centralized server** — simplest to build, but reintroduces exactly the single-point-of-trust problem StellarVeriphy exists to remove. A compromised or dishonest server could mint false certificates with no way to detect it.
- **Full decentralized compute (e.g. a validator network re-running verification)** — strongest trust guarantees, but far more infrastructure and coordination than an early-stage project can build and operate.
- **Trusted Execution Environment (TEE), specifically AWS Nitro Enclaves** — an isolated hardware environment that can produce a cryptographic attestation proving *specific code* ran on *specific input* without tampering. This lets a single oracle worker do the heavy computation while still producing a proof that the chain (and third parties) can verify, without trusting the operator's word alone.

## Decision

Off-chain verification runs inside AWS Nitro Enclaves. The oracle worker submits requests via `contracts/oracle`, and the enclave's signed attestation is what `contracts/provenance` requires before minting a certificate. `contracts/registry` maintains the allow-list of TEE code hashes that are considered trustworthy, so a certificate is only valid if it was produced by code the registry has approved.

## Consequences

- Verification results are backed by hardware attestation rather than "trust the server operator," which is a materially stronger guarantee and central to the product's value proposition.
- The team takes on AWS Nitro Enclave-specific operational complexity: enclave image builds, attestation document verification, and keeping `contracts/registry`'s approved code hashes current whenever the enclave image changes.
- This is a *hardware* trust root, not a fully trustless one — it still requires trusting AWS's hardware and Nitro's attestation chain. This tradeoff should be stated plainly in user-facing docs (see the [User Guide](../user-guide.md)) rather than overstated as "trustless."
- `contracts/registry`'s current implementation (`register`/`is_approved`) does not yet store or check a fixed contract admin — every call to `register` only requires the caller's own signature, not membership in an existing admin set. This is a known gap to close before mainnet use; tracked as follow-up work rather than re-litigated here.
