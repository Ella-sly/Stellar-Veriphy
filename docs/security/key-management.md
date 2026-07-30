# Secure Key Management

This document inventories every category of cryptographic key StellarVeriphy touches, and states the custody, rotation, storage, access-control, backup, and auditing model for each. Closes #268.

There is no single "the key" in this system — a wallet-based dapp on Soroban has several distinct key categories with different owners and different risk profiles. Treating them uniformly (e.g. "buy an HSM") would either overprotect low-risk keys or, worse, give a false sense of coverage to the ones that actually matter. The sections below go category by category.

## Key inventory

| Category | Held by | Where | Risk if compromised |
|---|---|---|---|
| End-user wallet keys | End users | Freighter browser extension (never touches this app) | User's own funds/signing authority only |
| Stellar deployer/admin keys | Whoever deploys `contracts/*` | Local `stellar keys` identity | Ability to deploy new contract instances; for `registry`, ability to approve TEE code hashes (see gap noted below) |
| TEE oracle attestation key | AWS Nitro Enclave | Generated inside the enclave, never exported | Ability to forge verification attestations |
| CI/CD deployment secrets | GitHub Actions | Repository/Environment secrets (`GHCR_TOKEN`, `DEPLOY_SSH_KEY`, etc. — see [`docs/deployment/ci-cd-pipeline.md`](../deployment/ci-cd-pipeline.md)) | Ability to push arbitrary images / deploy to staging or production |
| Application-issued API keys | End users of the verification API | `frontend/components/APIKeyManagement.tsx` (client-side, see below) | Ability to call the verification API within the granted scopes |

## HSM / hardware-backed signing

- **TEE oracle signing:** already hardware-backed today. Per [ADR-0004](../adr/0004-tee-oracle-trust-model.md), off-chain verification and attestation signing run inside AWS Nitro Enclaves — an isolated hardware environment functionally equivalent to an HSM for this key. The enclave's private key never leaves the enclave; only signed attestations and the enclave's public attestation document leave it. `contracts/registry`'s approved-code-hash allow-list is what lets the chain trust an attestation without trusting the operator directly.
- **Stellar deployer/admin keys:** for testnet/development, a local `stellar keys` identity is acceptable (see [`docs/deployment.md`](../deployment.md)). **For mainnet**, use a hardware wallet (Ledger, supported by the Stellar CLI via `--hd-path`) or an HSM-backed signer (e.g. AWS KMS/CloudHSM fronted by a signing service) rather than a plaintext local keystore. Never store a mainnet secret key in shell history, a committed `.env`, or CI logs — `.gitignore` already excludes `.env*`, keep it that way.
- **CI/CD secrets:** stored as GitHub Actions encrypted secrets, scoped to a GitHub Environment (`staging`/`production`) rather than repo-wide, so a workflow run only has access to the secrets its environment needs. See [`docs/deployment/ci-cd-pipeline.md`](../deployment/ci-cd-pipeline.md).

## Key rotation

| Key | Rotation trigger | Procedure |
|---|---|---|
| Stellar deployer/admin key | Suspected compromise, or on a routine cadence for mainnet (recommended: annually) | Generate a new `stellar keys` identity, transfer any required authority (e.g. re-run `registry.register` with the new admin once [the admin-check gap](../deployment.md#contract-initialization) is closed), update deployment docs/CI secrets, revoke the old key from any secrets manager |
| CI/CD deployment secrets | Suspected compromise, contributor offboarding, or every 90 days | Rotate the credential at its source (e.g. regenerate a GHCR PAT, rotate the SSH deploy key pair), update the GitHub Environment secret, confirm the next deploy succeeds before deleting the old credential |
| Application API keys | User-initiated, or automatically at the expiration the user set at creation | Handled entirely client-side today — see [Application API keys](#application-api-keys-encrypted-storage) below. Revoking or letting a key expire is immediate; there is no server-side propagation delay because there is no server-side key store yet |
| TEE enclave key | On enclave image rebuild | A new enclave image produces a new key pair by construction (the key is generated inside the enclave at boot and never persisted outside it). The new image's code hash must be re-approved via `contracts/registry` before its attestations are trusted — see ADR-0004 |

## Application API keys: encrypted storage

`frontend/components/APIKeyManagement.tsx` previously persisted the full, plaintext API key to `localStorage` for the lifetime of the key — meaning anyone with local access to the browser profile, or an XSS bug anywhere on the origin, could read out every active key. This has been fixed: the raw key is now shown to the user exactly once at creation time (`revealedKey` state, never persisted) and only a SHA-256 hash (`keyHash`, via `hashValue` in `frontend/lib/security/auditLogger.ts`) plus a short, non-secret display prefix (`keyPrefix`, e.g. `sv_AbC1...9xYz`) are written to `localStorage`. This mirrors how GitHub/Stripe-style API key UIs work: the secret is unrecoverable after the reveal screen closes, and losing/forgetting it means generating a new key, not looking the old one up.

This is client-side-only key management (there is no backend verifying or storing these keys yet — see the "Mock API" comment in that file). When a real backend is introduced, it must perform the same hash-and-compare pattern server-side and must never log or store the raw key either.

## Access control

- **Contract admin actions:** `contracts/registry.register` currently requires only the caller's own signature (`admin.require_auth()`), not membership in a pre-defined admin set — **any account can currently approve a TEE code hash.** This is a known, already-tracked gap (see [`docs/deployment.md#contract-initialization`](../deployment.md#contract-initialization)); closing it (storing a real admin address at deploy time and checking against it) is a prerequisite for any deployment where `registry`'s output is trusted for real decisions.
- **CI/CD:** production deploys require GitHub Environment protection (required reviewers) — see [`docs/deployment/ci-cd-pipeline.md`](../deployment/ci-cd-pipeline.md). Only accounts with write access to the repo and membership in the configured reviewer list can approve a production deployment.
- **Application API keys:** scoped per key (`read:certificates`, `write:verifications`, `read:analytics`, `admin:registry`) so a leaked key only grants the permissions explicitly checked when it was created.

## Backup and recovery

- **Stellar deployer/admin keys:** back up the mnemonic recovery phrase offline (e.g. on paper, in a hardware wallet's built-in backup flow) — never in a password manager's cloud sync alone, and never in the repo. Losing the key with no backup means deploying a new contract instance and migrating consumers, per the [rollback procedures](../deployment.md#rollback-procedures) — Soroban contracts here have no upgrade mechanism, so key loss and code-bug rollback follow the same "deploy new, repoint consumers" path.
- **CI/CD secrets:** the source of truth for a credential (e.g. the GHCR PAT, the SSH deploy key pair) should live in a team secrets manager (1Password, Vault, etc.), not solely inside GitHub's encrypted secret store — GitHub secrets are write-only and can't be recovered if lost, only rotated.
- **Application API keys:** by design, unrecoverable after the one-time reveal (see above) — this is intentional, not a gap. Losing a key means revoking it and issuing a new one.

## Key usage auditing

- **Application API keys:** every create/revoke/delete action is recorded by `frontend/lib/security/auditLogger.ts`, a client-side, hash-chained (tamper-evident) audit log with a 90-day retention window. Each entry's `chainHash` commits to the previous entry's hash, so any retroactive edit to a stored entry breaks the chain (`getSummary().tamperProof` reflects this).
- **Contract-level key usage:** every write path on `contracts/oracle`, `contracts/provenance`, and `contracts/registry` emits an on-chain event (`submitted`, `minted`, `registered`) — see [Verification process](../deployment.md#verification-process) — which is the durable, third-party-verifiable audit trail for who used which admin/deployer authority to do what.
- **CI/CD deployments:** GitHub Actions' own run log and required-reviewer approval record (for production) serve as the audit trail for who approved a deploy and when — see [`docs/deployment/ci-cd-pipeline.md`](../deployment/ci-cd-pipeline.md).
