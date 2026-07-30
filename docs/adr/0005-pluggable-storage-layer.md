# ADR-0005: Pluggable storage layer (IPFS or MongoDB)

- **Status:** Accepted
- **Date:** 2026-03-15
- **Deciders:** Core maintainers

## Context

Media files (images, video, documents) are too large and too expensive to store on-chain — Soroban contracts only ever hold a hash/reference, never the content itself. Something has to hold the actual bytes, and different adopters of StellarVeriphy have different requirements:

- Some want maximal decentralization and content-addressing guarantees — favoring **IPFS**.
- Others (e.g. enterprise customers with existing infrastructure, or use cases needing low-latency reads) want a conventional, high-performance datastore — favoring **MongoDB**.

Picking exactly one would force every adopter into the same tradeoff, which doesn't fit the range of use cases in the README (journalism, NFT provenance, legal audit trails, supply-chain checks).

## Decision

The storage layer is treated as an abstraction: on-chain contracts and the manifest schema only ever store a `storage_ref` (a CID for IPFS or a document ID for MongoDB) and a `manifest_hash`, never the storage mechanism itself. Deployers choose IPFS or MongoDB (or, in principle, another backend) behind that same reference shape.

## Consequences

- On-chain contracts (`contracts/oracle`, `contracts/provenance`) never need to change based on where content is actually stored — they only deal in hashes and opaque reference bytes.
- The actual storage adapter (IPFS client vs. MongoDB driver) is an off-chain implementation detail that has not yet been built in this repository — today `storage_ref` is just a `Bytes` field with no concrete backend wired up. This ADR documents the intended shape, not a shipped integration.
- Because verification and provenance depend on the storage layer actually keeping the referenced content available, whichever backend a deployer chooses inherits that backend's own durability guarantees (e.g. IPFS pinning strategy, MongoDB backup policy) — StellarVeriphy's on-chain certificate only proves a hash existed and was verified, not that the content will remain retrievable forever.
