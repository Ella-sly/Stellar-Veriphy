# Architecture Decision Records

This directory records the significant architectural decisions made in StellarVeriphy, using the [ADR](https://adr.github.io/) format.

An ADR captures a decision, the context that drove it, and its consequences — so future contributors understand _why_ the system looks the way it does, not just _what_ it looks like today. Reading the code tells you the current state; ADRs tell you the reasoning that got it there.

## When to write one

Write an ADR when a decision:

- Is hard or expensive to reverse (choice of blockchain, storage model, trust model).
- Affects multiple parts of the system (contracts, frontend, oracle).
- Was debated — there were real alternatives, and someone reading the code later would reasonably ask "why not X?"

Small, easily-reversible implementation details (variable naming, a single function's internal structure) don't need an ADR.

## Process

1. Copy [`template.md`](template.md) to `NNNN-short-title.md`, using the next sequential number (zero-padded to 4 digits) and a kebab-case title.
2. Fill in Context, Decision, and Consequences. Open it as a PR so the decision gets reviewed like code.
3. Set **Status** to `Proposed` while under discussion, `Accepted` once merged.
4. If a later decision replaces this one, don't delete it — set its status to `Superseded by ADR-NNNN` and link the new record. The old ADR stays as history.

## Index

| ADR                                           | Title                                               | Status   |
| --------------------------------------------- | --------------------------------------------------- | -------- |
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions                       | Accepted |
| [0002](0002-soroban-on-stellar.md)            | Use Soroban smart contracts on Stellar              | Accepted |
| [0003](0003-pnpm-monorepo.md)                 | Use a pnpm workspaces monorepo                      | Accepted |
| [0004](0004-tee-oracle-trust-model.md)        | TEE-based oracle for trusted off-chain verification | Accepted |
| [0005](0005-pluggable-storage-layer.md)       | Pluggable storage layer (IPFS or MongoDB)           | Accepted |
