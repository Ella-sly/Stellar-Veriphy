# #401 — Create Test Fixtures

**Labels:** testing · **Difficulty:** Beginner · **Estimate:** 3-4h
**Depends on:** nothing — do this first, it unblocks #400 and #402.

## Description

Build reusable test fixtures and mock data so #400, #402, and future test
suites don't each hand-roll their own certificate/manifest/wallet stubs.

## Acceptance criteria (from issue)

- [ ] Create fixture files
- [ ] Mock certificate data
- [ ] Mock manifest data
- [ ] Mock wallet data
- [ ] Reusable across tests
- [ ] Well-documented

## What "certificate" / "manifest" mean here

Per the root [README](../../README.md#manifest-schema), a manifest looks
like:

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

A provenance certificate (per `contracts/provenance`) additionally carries a
storage reference ID (IPFS CID or DB ID), attestation proof hash, and
timestamp/creator. Check `packages/shared/types/index.ts` for whatever
canonical TypeScript types already exist there before inventing new shapes —
fixtures should satisfy those types, not diverge from them.

## Proposed layout

```
frontend/test/fixtures/
├── index.ts              # barrel export
├── manifest.fixtures.ts  # valid manifest, missing-field variants, edge cases (no aiModel, no location)
├── certificate.fixtures.ts
├── wallet.fixtures.ts    # mock Freighter-style public key, signed tx payload, connected/disconnected states
└── README.md             # how to use + how to add a new fixture
```

Use factory functions (`buildManifest(overrides?)`) rather than only static
objects, so tests can tweak one field without redefining the whole shape.

## Notes for whoever picks this up

- This issue has no test runner as a prerequisite — fixtures are plain data
  and can be written before #400/#402 pick a testing framework. If a
  framework is chosen first, prefer keeping fixtures framework-agnostic
  (plain `.ts` exports, not tied to Jest/Vitest APIs).
- Import fixture types from `packages/shared/types` if compatible, so
  fixtures stay in sync with the real shared types instead of drifting.
