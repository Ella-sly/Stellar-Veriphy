# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-07-30
- **Deciders:** Core maintainers

## Context

StellarVeriphy spans several architecturally significant choices — the blockchain platform, the trust model for off-chain verification, the storage layer, the monorepo layout — that were made during initial scaffolding without a durable written record. As the team grows, new contributors need a way to understand *why* the system is shaped the way it is, not just read the current code and guess.

Without a record, the same debates (e.g. "why not Ethereum," "why not just trust the oracle server") tend to resurface repeatedly, and knowledge stays trapped in whoever was present for the original discussion.

## Decision

We will use Architecture Decision Records (ADRs), stored in `/docs/adr/`, to document significant architectural decisions as they are made — and retroactively for decisions already baked into the initial scaffold. Each ADR follows the template in [`template.md`](template.md) and is reviewed as a PR.

## Consequences

- Every future significant decision has a clear place to be written down and reviewed.
- New contributors can read `/docs/adr/` to get the reasoning behind the architecture, not just its shape.
- This requires discipline — an ADR process only has value if it's kept up to date. Reviewers should ask "does this PR need an ADR?" for architecturally significant changes.
- The first four decision ADRs (0002–0005) were written retroactively to document choices already present in the initial commit; they may be less complete than ADRs written at decision time, since the original discussion wasn't captured live.
