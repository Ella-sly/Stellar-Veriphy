# Developer Setup Tutorial Transcript

Length target: 15 minutes

## Outline

1. Clone the repo and install dependencies.
2. Explain the monorepo layout.
3. Run frontend and contract-focused commands.
4. Show the key docs pages.
5. Mention common troubleshooting steps.

## Transcript

This tutorial covers the developer setup for StellarVeriphy.

Start by installing the root workspace dependencies. The repository is a pnpm
monorepo, so the root package manages the shared workspace.

After install, look at the top-level layout. The main areas are the frontend,
the smart contracts, the shared package, and the docs.

For frontend development, use the Next.js app in `frontend/`. For contract work,
use the Rust projects under `contracts/`.

The onboarding guide covers the day-one setup path. The deployment guide covers
how to initialize and verify the contracts. The contract API reference and the
new error code guide are the best places to look when a contract call fails.

If something breaks, first confirm the toolchain versions, then verify the
workspace install, and finally check the specific contract or frontend logs.

That’s the setup path. With the repo installed and the docs open, you have
everything needed to start building and testing safely.

