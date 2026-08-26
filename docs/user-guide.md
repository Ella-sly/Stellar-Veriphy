# User Guide and Tutorials

This guide covers how to use StellarVeriphy as an end user — verifying content and checking its on-chain provenance certificate.

> **Where the product actually is today:** StellarVeriphy is an early-stage scaffold. The frontend currently has a home page and an "Upload Content" page (`frontend/app/creator/upload-content`) that is a static placeholder — it doesn't yet accept a file, call an API, or submit anything on-chain. The [smart contracts](../contracts) that would back verification and certificate minting exist and work in isolation (see the [Deployment Guide](deployment.md)), but nothing in the frontend calls them yet.
>
> Rather than write a tutorial for buttons that don't do anything yet, this guide is split into **what works today** and **the target workflow** the product is built toward — clearly labeled, so you don't go looking for a "Verify" button that isn't wired up. As real UI lands, this doc should be updated in the same PR, moving sections from "target" to "today."

## Table of contents

- [Getting started (what works today)](#getting-started-what-works-today)
- [Target workflow: how content verification will work](#target-workflow-how-content-verification-will-work)
- [Target workflow: how to view a certificate](#target-workflow-how-to-view-a-certificate)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Screenshots, video tutorials, and a searchable docs site](#screenshots-video-tutorials-and-a-searchable-docs-site)

## Getting started (what works today)

1. **Run the app locally** (see the [Developer Onboarding Guide](onboarding.md) if you haven't set up the environment yet):

   ```bash
   pnpm install
   pnpm dev:frontend
   ```

2. **Open** [http://localhost:3000](http://localhost:3000). You'll see the StellarVeriphy home page — a heading and a one-line description of the project. There's no navigation or interactive content on it yet.

3. **Visit the upload page** at [http://localhost:3000/creator/upload-content](http://localhost:3000/creator/upload-content). Today this shows a static "Upload Content" heading and description only — there is no file picker, form, or submit action yet. It's a placeholder marking where the creator upload flow will live.

4. **Check the health endpoint** to confirm the app's API layer is running:

   ```bash
   curl http://localhost:3000/api/health
   # {"status":"ok","service":"stellarveriphy"}
   ```

That's the full extent of the current running application. Everything below describes the workflow the product is designed around, based on the manifest schema and contract behavior already implemented on the contracts side.

## Target workflow: how content verification will work

This describes the intended end-to-end flow once the upload UI and its backing API routes are implemented, so you know what to expect and can track progress against it.

1. **Prepare your content and a manifest.** A manifest is a small JSON document describing your media's origin — see the schema below. `contentHash` is a SHA-256 hash of the file itself (the shared `sha256`/`buildManifestHash` helpers in `packages/shared/utils/hash.ts` compute this).

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

2. **Upload.** From the creator upload page, you'll select your media file; it's stored via the configured storage backend (IPFS or MongoDB — see [ADR-0005](adr/0005-pluggable-storage-layer.md)) and a `storage_ref` is returned.

3. **Submit for verification.** The frontend submits `storage_ref` and `manifest_hash` on your behalf to the `oracle` contract's `submit` method, which requires your Stellar account's signature (via Freighter) and returns a request ID.

4. **TEE verification runs.** An oracle worker picks up the request and runs verification inside an AWS Nitro Enclave, producing a signed attestation. This is the trust mechanism described in [ADR-0004](adr/0004-tee-oracle-trust-model.md) — the point is that you don't have to trust the oracle operator's word, only the enclave's attestation.

5. **Certificate minted.** Once attestation succeeds, the `provenance` contract's `mint` method is called, creating an on-chain, permanent `ProvenanceCert` — your content's verifiable "birth certificate."

You can watch the underlying contract calls happen today with the Stellar CLI even without the frontend UI — see the [Deployment Guide's verification section](deployment.md#verification-process) for the `stellar contract invoke` commands that exercise `submit` and `mint` directly.

## Target workflow: how to view a certificate

Once minted, a certificate's data is public and permanently on-chain — you don't need any special access to read it back, only the certificate ID.

**Via the (planned) frontend:** a certificate viewer page will look up a `ProvenanceCert` by ID and display its storage reference, manifest hash, attestation hash, creator address, and timestamp. Not yet implemented.

**Via the Stellar CLI, today:**

```bash
stellar contract invoke \
  --id <PROVENANCE_CONTRACT_ID> \
  --source <any-account> \
  --network testnet \
  -- get --id <certificate-id>
```

This returns the certificate's fields directly from the contract — no frontend required, since the data is just an on-chain read. This is also the fastest way to confirm a certificate exists while the viewer UI is still being built.

**Via a block explorer:** look up the `provenance` contract's ID on [Stellar Expert](https://stellar.expert/) and inspect its `minted` events to find certificate IDs and their transactions.

## Troubleshooting

**The upload page doesn't do anything when I try to use it.**
Expected for now — see the status note at the top of this guide. There's no file input or submit handler wired up yet.

**`pnpm dev:frontend` starts, but `/api/health` 404s.**
Confirm you're hitting `http://localhost:3000/api/health` (not `/health`) and that the dev server finished starting (watch the terminal for "Ready"). If it still 404s, check you're running from a clean install (`pnpm install` at the repo root, not inside `frontend/` alone).

**I deployed the contracts myself and want to test the flow — where do I start?**
Follow the [Deployment Guide](deployment.md) to deploy `oracle`, `provenance`, and `registry` to testnet, then use `stellar contract invoke` to call `submit` and `mint` directly, simulating what the frontend will eventually do automatically.

**My Freighter wallet isn't connecting.**
There's no wallet connection wired into the frontend yet — this will apply once the upload flow calls contracts directly from the browser. For now, all contract interaction happens via the Stellar CLI (see the [Deployment Guide](deployment.md)).

## FAQ

**Is StellarVeriphy usable as a product today?**
Not yet — it's a working set of smart contracts plus a frontend scaffold. The [Developer Onboarding Guide](onboarding.md) and [Roadmap in the README](../README.md#️-roadmap) are the best guide to current state and what's next.

**What does a verification certificate actually prove?**
That a specific content hash, at a specific time, was attested by a specific approved TEE code hash (see [`contracts/registry`](../contracts/registry)) and recorded immutably on Stellar. It does not prove the content is "true" or "good" — only that the described verification process ran and produced this result. See [ADR-0004](adr/0004-tee-oracle-trust-model.md) for the honest scope of that trust guarantee.

**Can I delete or edit a certificate once it's minted?**
No — that's the point. Certificates are immutable on-chain records. If a certificate is wrong, the fix is a new certificate (and, at the application level, marking the old one superseded), not editing history.

**Where do storage costs come from — is my media file stored on Stellar?**
No. Only a hash and a storage reference (an IPFS CID or database ID) are ever written on-chain. The media itself lives in whichever storage backend the deployment is configured to use — see [ADR-0005](adr/0005-pluggable-storage-layer.md).

**I found a bug or have a feature request — where do I report it?**
Open a [GitHub issue](https://github.com/Stellar-Veriphy/Stellar-Veriphy/issues) on the repository.

## Screenshots, video tutorials, and a searchable docs site

These are explicitly **not included** in this pass, and that's a deliberate choice rather than an oversight:

- **Screenshots** would currently just show unstyled placeholder text (see [Getting started](#getting-started-what-works-today)) — adding them now would need to be redone the moment real UI design lands, so they're deferred until the upload/certificate-viewer pages have real layouts.
- **Video tutorials** now have transcript drafts in [docs/tutorials](tutorials/README.md). The actual recordings and YouTube uploads are still a follow-up task, but the narration, structure, and accessibility text are ready to use as source material.
- **A searchable documentation site** (e.g. a static site generator like [Nextra](https://nextra.site/) or [Docusaurus](https://docusaurus.io/) publishing everything under `/docs`) is a reasonable next step once there's enough written documentation to make search worthwhile — tracked as follow-up rather than built speculatively here.

If you're picking up one of these as a follow-up task, it's a good candidate for its own issue rather than folding into this guide.
