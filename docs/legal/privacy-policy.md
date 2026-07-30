# Privacy Policy

**Last updated: 2026-07-30**

This is the canonical source for the privacy policy rendered at [`/privacy`](../../frontend/app/privacy/page.tsx) in the app. Closes #269 together with [`data-retention-policy.md`](data-retention-policy.md). If you edit this file, update the in-app page to match.

## Manage your data

StellarVeriphy keeps everything described below in your browser, not on a server, so you can export or permanently delete it yourself at any time — no request or waiting period required. In the app, this is the "Export my data" / "Delete all my data" pair on [`/privacy`](../../frontend/app/privacy/page.tsx), backed by `frontend/lib/privacy/localData.ts`.

## What we store, and where

StellarVeriphy has no user-account database and no analytics or advertising trackers. Everything the app remembers about you lives in your browser's `localStorage`, scoped to this site's origin, and is never transmitted to a StellarVeriphy server:

- Theme preference (light/dark)
- In-progress form drafts (manifest builder, issue report) for autosave/recovery
- The security audit log of admin actions taken in this browser (90-day retention, pruned automatically — see `frontend/lib/security/auditLogger.ts`)
- Mock API keys you generate for the demo API key manager (only a SHA-256 hash is kept — see [`key-management.md`](../security/key-management.md))
- Keyboard shortcut and notification preferences

## Blockchain data is public

Verification requests, provenance certificates, and registry entries submitted through StellarVeriphy are written to the Stellar public ledger via `contracts/oracle`, `contracts/provenance`, and `contracts/registry`. Public ledger data is, by design, permanent and visible to anyone — it is not covered by the export/delete controls above, since no one (including StellarVeriphy) can remove data from the chain after it's confirmed. Do not submit content you don't want to be permanently, publicly associated with your wallet address.

## Wallet keys

StellarVeriphy never has access to your wallet's private key. Signing happens entirely inside your connected wallet extension (e.g. Freighter); the app only ever receives your public address and signed transactions. See [`key-management.md`](../security/key-management.md) for how every other key category in the system is handled.

## Cookies and tracking

StellarVeriphy does not set tracking or advertising cookies, and does not run third-party analytics. The only browser storage in use is the functional `localStorage` described above. A one-time notice banner (`frontend/components/ConsentBanner.tsx`) discloses this on first visit and links here.

## Your rights (GDPR / CCPA)

- **Right to access:** use "Export my data" to download everything stored about you, in full, at any time.
- **Right to erasure:** use "Delete all my data". Because storage is local-only, deletion is immediate and complete — there is no server-side copy to separately purge.
- **Right to know / opt out of sale:** StellarVeriphy does not sell or share personal data with third parties, because it does not collect any on a server in the first place.

## Data retention

See [`data-retention-policy.md`](data-retention-policy.md) for the retention window of each data category listed above.

## Data processing agreements

StellarVeriphy does not process personal data on behalf of a third party, and does not use a third-party data processor — there is no server-side data pipeline for this app today. If a server-side component that processes user data is introduced in the future, a DPA covering that component (and an update to this policy) is required before it ships.

## Contact

Questions about this policy or how StellarVeriphy handles data can be raised as a [GitHub issue](https://github.com/Stellar-Veriphy/Stellar-Veriphy/issues/new).
