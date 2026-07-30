# ADR-0003: Use a pnpm workspaces monorepo

- **Status:** Accepted
- **Date:** 2026-03-15
- **Deciders:** Core maintainers

## Context

StellarVeriphy's TypeScript surface area spans a Next.js frontend and shared types/utilities (content manifest shapes, hashing helpers) that both the frontend and, eventually, backend/oracle services need to consume without drifting out of sync. The Rust contracts live alongside this code but are built with Cargo, not npm tooling.

Options considered for the JS/TS side:
- **Separate repositories** per app/package — clean ownership boundaries, but shared types (`packages/shared`) would need to be published and versioned independently, adding release overhead disproportionate to the project's current size.
- **npm/yarn workspaces** — similar capability to pnpm, but pnpm's content-addressable store and strict dependency resolution avoid phantom-dependency bugs (a package silently working because a sibling package hoisted a dependency it never declared).
- **pnpm workspaces** — fast installs, disk-efficient via a shared store, strict-by-default module resolution.

## Decision

We use a single repository with pnpm workspaces (`pnpm-workspace.yaml`) covering `frontend` and `packages/*`. Rust contracts under `contracts/` are excluded from the pnpm workspace and built independently via Cargo/Stellar CLI.

## Consequences

- `packages/shared` types and utilities (e.g. `ContentManifest`, `sha256`) are consumed directly by the frontend via workspace linking — no publish step, no version-skew between them.
- A single `pnpm install` at the repo root sets up all JS/TS packages; contract dependencies are still managed separately via `cargo` (see [ADR-0002](0002-soroban-on-stellar.md)), so a full setup is a two-toolchain process — documented in the [Developer Onboarding Guide](../onboarding.md).
- As the project grows, workspace-wide scripts (lint, test, build) should be added at the root `package.json` so CI and contributors don't need to know the internal package layout to run checks — this is not yet in place and is called out in the onboarding guide's "Common Issues" section.
- Monorepo tooling (pnpm) is a hard dependency for anyone touching frontend or shared code; contributors coming from an npm/yarn background need pnpm installed specifically.
