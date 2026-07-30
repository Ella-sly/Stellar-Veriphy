# Smart Contract API Reference

This document covers the public functions exposed by StellarVeriphy's three
Soroban (Rust/WASM) contracts: `oracle`, `provenance`, and `registry`. For the
HTTP API exposed by the Next.js frontend, see the interactive explorer at
`/docs` (spec: `frontend/public/openapi.yaml`).

Each contract function can be invoked with the [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)
once deployed:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source <YOUR_IDENTITY> \
  -- <function> --<arg-name> <value> ...
```

The tables below were generated directly from each contract's `pub fn`
signatures and `///` doc comments, so they track the source rather than
duplicating a description that can drift. For the full generated API
reference (including private helpers and complete type definitions), run:

```bash
cargo doc --manifest-path contracts/oracle/Cargo.toml --no-deps --open
cargo doc --manifest-path contracts/provenance/Cargo.toml --no-deps --open
cargo doc --manifest-path contracts/registry/Cargo.toml --no-deps --open
```

> **⚠️ Known issue — `contracts/oracle/src/lib.rs` is currently broken on `main`.**
> Several functions (`add_provider`, `remove_provider`, `is_provider`,
> `get_ttl_config`, `update_ttl_config`, `update_warning_threshold`,
> `get_warning_threshold`, `check_expiration_warning`, `cancel_request`,
> `get_requests_by_state`, `submit_batch_request`, `get_provider_metrics`)
> are defined **twice** in the same `impl OracleContract` block, with what
> look like two different implementations interleaved line-by-line (no git
> conflict markers — the file itself is malformed, not a merge conflict in
> this branch). This pre-dates and is unrelated to this PR; the table below
> documents the *intended* function surface (deduplicated by name, using the
> version that appears self-consistent) but the crate will not currently
> compile as-is. This needs a manual fix, verified with `cargo build`, before
> the oracle contract's own CI job (or `cargo doc`) will succeed.

---

## `oracle` — `contracts/oracle`

Coordinates the off-chain verification workflow: provider registration and
staking, request submission/lifecycle (with TTL-based expiration and
archival), SLA tracking and reputation-weighted provider selection, dispute
handling, and cost estimation. Cross-calls `registry` (for TEE attestation
checks) and `provenance` (to mint certificates once verified).

### Error codes

| Code | Name | Code | Name |
|---|---|---|---|
| 1 | `NotInitialized` | 11 | `InsufficientStake` |
| 2 | `UnauthorizedSigner` | 12 | `NoStake` |
| 3 | `AlreadyInitialized` | 13 | `WithdrawalCooldown` |
| 4 | `RegistryNotConfigured` | 14 | `ContractPaused` |
| 5 | `TeeNotVerified` | 15 | `ProviderSuspended` / `NoAvailableProvider`* |
| 6 | `ProviderNotRegistered` | 16 | `PricingNotSet` / `DisputeNotFound`* |
| 7 | `BatchSizeExceeded` | 17 | `DisputeAlreadyResolved` |
| 8 | `RequestNotFound` | 18 | `InvalidTTL` |
| 9 | `Unauthorized` | 19 | `InvalidThreshold` |
| 10 | `InvalidState` | | |

\* Codes 15 and 16 each have two conflicting variant names in the current
source — another symptom of the known issue above; confirm the real values
with `cargo doc` once the file is fixed.

### Functions

| Function | Parameters (besides `env`) | Returns | Description |
|---|---|---|---|
| `init` | registry: Address; provenance: Address; admin: Address | `Result<(), Error>` | One-time setup: stores the registry/provenance contract addresses and admin, and initializes the default TTL config. |
| `add_provider` | provider: Address | `Result<(), Error>` | Register a provider address (admin-gated). |
| `remove_provider` | provider: Address | `Result<(), Error>` | Deregister a provider address (admin-gated). |
| `is_provider` | provider: Address | `bool` | Check whether an address is a registered provider. |
| `pause` / `unpause` | _none_ | `Result<(), Error>` | Admin-gated circuit breaker; `submit_request` and friends should be checked against `is_paused`. |
| `is_paused` | _none_ | `bool` | Whether the contract is currently paused. |
| `get_ttl_config` / `update_ttl_config` | _get: none_; _update:_ default_ttl: u32; high_priority_ttl: u32; low_priority_ttl: u32 | `TTLConfig` / `Result<(), Error>` | Read/update the per-priority request TTL (in ledgers) before a pending request expires. |
| `get_warning_threshold` / `update_warning_threshold` | _update:_ ledgers: u32 | `u32` / `Result<(), Error>` | Read/update how many ledgers before expiry a request is flagged via `check_expiration_warning`. |
| `check_expiration_warning` | id: u64 | `bool` | Whether request `id` is inside its expiration-warning window; emits an `expiration_warning` event if so. |
| `deposit_stake` | provider: Address; amount: u128 | `Result<(), Error>` | Provider stakes XLM (in stroops) as a bond; must meet `MINIMUM_STAKE`. |
| `initiate_withdrawal` / `complete_withdrawal` | provider: Address; amount: u128 (initiate only) | `Result<(), Error>` / `Result<u128, Error>` | Two-step stake withdrawal with a cooldown (`WITHDRAWAL_COOLDOWN_LEDGERS`) in between. |
| `get_provider_stake` | provider: Address | `u128` | Current staked amount for a provider. |
| `slash_stake` | provider: Address; amount: u128 | `Result<(), Error>` | Admin-gated penalty that reduces a provider's stake (used on dispute resolution). |
| `record_verification_success` / `record_verification_failure` | provider: Address | `()` | Record a verification outcome for a provider, feeding `get_reputation_score`. |
| `get_reputation_score` | provider: Address | `u32` | `(successful / total) * 100`, clamped to 100; new providers start at 100 (trusted by default). |
| `get_next_available_provider` | _none_ | `Result<Address, Error>` | Weighted round-robin provider selection: registered → not in failure cooldown → highest reputation, ties broken by rotation. |
| `get_provider_list` | _none_ | `Vec<Address>` | All registered providers. |
| `file_dispute` | request_id: u64; provider: Address; reason: Bytes | `Result<u64, Error>` | Original requester disputes a provider's handling of a request; emits `dispute_filed`. |
| `resolve_dispute` | dispute_id: u64; resolution: DisputeResolution; reputation_penalty: u32; slash_amount: u128 | `Result<(), Error>` | Admin resolves a dispute, optionally penalizing reputation and/or slashing stake. |
| `dismiss_dispute` | dispute_id: u64 | `Result<(), Error>` | Admin dismisses a dispute without penalty (e.g. frivolous claim). |
| `get_dispute` / `get_disputes_by_provider` | dispute_id: u64 / provider: Address | `Option<Dispute>` / `Vec<u64>` | Look up a dispute, or list dispute IDs filed against a provider. |
| `submit_request` | storage_ref: Bytes; manifest_hash: Bytes; requester: Address; priority: Priority | `Result<u64, Error>` | Submit a new verification request; `requester` must authorize. |
| `get_request` | id: u64 | `Option<VerificationRequest>` | Look up a request by ID. |
| `cancel_request` | id: u64 | `Result<(), Error>` | Cancel a pending request (requester-gated). |
| `submit_batch_request` | requests: Vec<(Bytes, Bytes, Address, Priority)> | `Result<Vec<u64>, Error>` | Submit multiple requests in one call, bounded by a max batch size. |
| `get_requests_by_state` | state: RequestState; offset: u32; limit: u32; requester: Option<Address> | `PaginatedRequests` | Paginated query over requests, optionally filtered by requester. |
| `archive_old_requests` | _none_ | `u32` | Move expired requests out of active (temporary) storage into archival storage; returns the count archived. |
| `get_archived_request` / `get_last_archival_ledger` | id: u64 / _none_ | `Option<ArchivedRequest>` / `u32` | Look up an archived request, or the last ledger archival ran. |
| `verify_tee_hash` | tee_hash: BytesN<32> | `Result<(), Error>` | Cross-calls `registry.is_tee_hash_approved`; errors with `TeeNotVerified` if not approved. |
| `verify_attestation` | provider: BytesN<32>; tee_hash: BytesN<32>; payload: Bytes; signature: BytesN<64> | `Result<(), Error>` | Verifies a provider's signed TEE attestation payload. |
| `set_provider_sla` | provider: Address; target_response_time_seconds: u32; target_uptime_percentage: u32; target_success_rate: u32 | `Result<(), Error>` | Admin sets SLA targets for a provider. |
| `record_verification` | provider: Address; success: bool; response_time_seconds: u32; uptime_sample: u32 | `Result<(), Error>` | Update a provider's rolling SLA actuals after a verification; auto-suspends the provider below `SLA_SUSPENSION_THRESHOLD`. |
| `get_sla_compliance` | provider: Address | `Result<SLACompliance, Error>` | Per-metric SLA compliance + overall percent + suspension flag. |
| `reinstate_provider` | provider: Address | `Result<(), Error>` | Admin manually un-suspends a provider after remediation. |
| `is_provider_suspended` | provider: Address | `bool` | Whether a provider is currently SLA-suspended. |
| `set_provider_pricing` / `get_provider_pricing` | provider: Address; base_fee_stroops: u128; per_kb_fee_stroops: u128 (set only) | `Result<(), Error>` / `Option<ProviderPricing>` | Configure/read a provider's pricing. |
| `estimate_cost` | provider: Address; content_size_bytes: u64; priority: Priority; complexity: ContentComplexity | `Result<CostEstimate, Error>` | Itemized cost estimate (base + size + priority + complexity fees) for a would-be request. |

### Example — submit and check a request

```bash
stellar contract invoke --id $ORACLE_ID --network testnet --source alice -- \
  submit_request --storage-ref ipfs://bafybeigd... --manifest-hash 9f86d081... \
    --requester $ALICE_ADDRESS --priority Normal

stellar contract invoke --id $ORACLE_ID --network testnet --source alice -- \
  get_request --id 12345
```

---

## `provenance` — `contracts/provenance`

Mints and manages immutable provenance certificates: minting (single and
batch), revocation, expiration/renewal, verification-level badges,
parent/child/sibling linking, collections/portfolios, media metadata,
verification codes (offline lookup), full amendment history, and
aggregate/time-series statistics.

### Error codes (`ProvenanceError`)

| Code | Name | Meaning |
|---|---|---|
| 1 | `CertificateNotFound` | No certificate exists for the given ID. |
| 2 | `Unauthorized` | Caller is not authorized for this action (e.g. not the oracle, not the owner). |
| 3 | `DuplicateCertificate` | Certificate already exists / already in the target state. |
| 4 | `BatchSizeExceeded` | `mint_batch` request exceeds the maximum batch size. |
| 5 | `CodeNotFound` | No certificate matches the given verification code. |
| 6 | `InvalidMediaMetadata` | Media metadata failed validation (e.g. empty MIME type). |

### Functions

| Function | Parameters (besides `env`) | Returns | Description |
|---|---|---|---|
| `initialize` | oracle: Address | `()` | One-time setup: stores the oracle address authorized to mint. |
| `set_admin` / `get_admin` | admin: Address (set only) | `()` / `Option<Address>` | Configure/read the contract admin. |
| `mint` | storage_ref: String; manifest_hash: String; attestation_hash: String; to: Address | `u64` | Mint a provenance certificate (oracle-gated). Returns the new certificate ID. |
| `get_certificate` | id: u64 | `Result<ProvenanceCert, ProvenanceError>` | Look up a certificate by ID. |
| `revoke_certificate` | certificate_id: u64; reason: RevocationReason | `Result<(), ProvenanceError>` | Revoke a certificate (oracle-gated). |
| `is_certificate_revoked` | certificate_id: u64 | `Result<bool, ProvenanceError>` | Whether a certificate has been revoked. |
| `set_expiration` / `is_certificate_expired` | certificate_id: u64; expires_at: Option<u64> (set only) | `Result<(), ProvenanceError>` / `Result<bool, ProvenanceError>` | Set (or clear) and check a certificate's expiration timestamp. |
| `renew_certificate` | certificate_id: u64; new_expires_at: u64 | `Result<(), ProvenanceError>` | Renew an expired (or soon-to-expire) certificate with a new expiration. |
| `check_expiration_warning` | certificate_id: u64; warning_window: u64 | `Result<bool, ProvenanceError>` | Emit a warning event if the certificate expires within `warning_window` seconds. |
| `set_verification_level` / `get_verification_level` | certificate_id: u64; level: VerificationLevel (set only) | `Result<(), ProvenanceError>` / `Result<VerificationLevel, ProvenanceError>` | Oracle-gated upgrade / read of a certificate's verification badge (Basic/Standard/Premium/Enterprise). |
| `get_certificates_by_verification_level` | level: VerificationLevel; offset: u32; limit: u32 | `Vec<(u64, ProvenanceCert)>` | Paginated query by verification level. |
| `link_certificates` / `get_linked_certificates` | certificate_id: u64; relation: CertificateRelation (link only) | `Result<(), ProvenanceError>` / `Result<Vec<CertificateRelation>, ProvenanceError>` | Link two certificates (parent/child/sibling, stored reciprocally) and query existing links. |
| `transfer_certificate` | certificate_id: u64; new_owner: Address | `Result<(), ProvenanceError>` | Transfer certificate ownership. |
| `update_metadata` / `get_metadata` | certificate_id: u64; display_name: String; description: String (update only) | `Result<(), ProvenanceError>` / `Result<CertificateMetadata, ProvenanceError>` | Update/read a certificate's display name and description (version-tracked). |
| `get_certificates_by_time_range` | start_time: u64; end_time: u64; offset: u32; limit: u32 | `Vec<(u64, ProvenanceCert)>` | Paginated query by mint-timestamp range. |
| `mint_batch` | storage_refs: Vec\<String\>; manifest_hashes: Vec\<String\>; attestation_hashes: Vec\<String\>; to: Address | `Result<Vec<u64>, ProvenanceError>` | Mint multiple certificates atomically in one transaction. |
| `get_certificates_by_creator` | creator: Address; offset: u32; limit: u32 | `Vec<(u64, ProvenanceCert)>` | Paginated query by creator, most recent first. |
| `get_certificate_history` | certificate_id: u64; offset: u32; limit: u32 | `Vec<CertificateHistory>` | Paginated amendment history, most recent first. |
| `generate_verification_code` / `get_verification_code` | certificate_id: u64 | `Result<String, ProvenanceError>` | Generate (or fetch) an 8-character human-readable code for offline certificate lookup. |
| `verify_by_code` | code: String | `Result<ProvenanceCert, ProvenanceError>` | Look up a certificate by its verification code. |
| `set_media_properties` / `get_media_properties` | certificate_id: u64; content_type: ContentType; mime_type: String; resolution: Option\<String\>; duration_seconds: Option\<u64\>; file_size_bytes: Option\<u64\>; codec: Option\<String\> (set only) | `Result<(), ProvenanceError>` / `Result<MediaProperties, ProvenanceError>` | Attach/read rich media metadata for a certificate. |
| `get_certificate_stats` | _none_ | `CertificateStats` | Aggregate stats: total certificates minted, and minted today. |
| `get_creator_certificate_count` | creator: Address | `u64` | Number of certificates minted to a given creator. |
| `get_minting_time_series` | start_day: u64; end_day: u64 | `Vec<TimeSeriesPoint>` | Daily minting counts over an inclusive day range (capped at 366 points). |
| `create_collection` / `get_collection` | owner: Address; name: String; description: String (create only) | `u64` / `Result<Collection, ProvenanceError>` | Create/fetch a certificate collection ("portfolio"). |
| `add_certificate_to_collection` / `get_certificates_in_collection` / `get_collections_for_certificate` | collection_id: u64; certificate_id: u64 | `Result<(), ProvenanceError>` / `Vec<u64>` / `Vec<u64>` | Manage many-to-many membership between certificates and collections. |
| `get_certificates_by_content_type` | content_type: ContentType; offset: u32; limit: u32 | `Vec<(u64, ProvenanceCert)>` | Paginated query by media content type. |
| `lock_certificate` | certificate_id: u64 | `Result<(), ProvenanceError>` | Irreversibly lock a certificate against further modification, even by its owner. |

### Example — mint and look up a certificate

```bash
stellar contract invoke --id $PROVENANCE_ID --network testnet --source oracle -- \
  mint --storage-ref ipfs://bafybeigd... --manifest-hash 9f86d081... \
       --attestation-hash 3b2f9c11... --to $ALICE_ADDRESS

stellar contract invoke --id $PROVENANCE_ID --network testnet --source alice -- \
  get_certificate --id 12345
```

---

## `registry` — `contracts/registry`

Governs trust for the whole system: approved TEE code hashes (with
versioning, rotation, expiry, and attached attestation certificates),
oracle-provider registration (tiers, reputation, capacity, regions,
specializations, blacklisting, applications), and multisig-gated admin
operations (threshold changes, proposals with timelocks).

### Error codes

| Code | Name | Code | Name |
|---|---|---|---|
| 1 | `NotInitialized` | 8 | `ProviderNotFound` |
| 2 | `Unauthorized` | 9 | `CertificateExpired` |
| 3 | `InvalidThreshold` | 10 | `ProviderBlacklisted` |
| 4 | `ProposalNotFound` | 11 | `NotBlacklisted` |
| 5 | `ProposalExpired` | 12 | `CapacityExceeded` |
| 6 | `InsufficientApprovals` | 13 | `InvalidCapacity` |
| 7 | `TeeHashNotFound` | | |

### Functions

| Function | Parameters (besides `env`) | Returns | Description |
|---|---|---|---|
| `init` / `get_admin` | admin: Address; provenance: Address (init only) | `()` / `Option<Address>` | One-time setup; read the current admin. |
| `add_tee_hash` / `is_tee_hash_approved` | code_hash: BytesN<32> | `()` / `bool` | Register (180-day validity) / check an approved TEE code hash. |
| `is_tee_hash_near_expiry` | code_hash: BytesN<32> | `bool` | Whether a hash has entered its pre-expiry warning window. |
| `rotate_tee_hash` / `get_tee_hash_migration` | old_hash: BytesN<32>; new_hash: BytesN<32> (rotate only) | `()` / `Option<BytesN<32>>` | Force-rotate a TEE hash and query the replacement for a rotated hash. |
| `add_tee_hash_version` / `get_tee_hash_version` / `get_tee_hashes_by_version` / `get_tee_hash_version_history` | code_hash: BytesN<32>; version: u32 (add only) | `()` / `Result<TeeHashVersionInfo, Error>` / `Vec<BytesN<32>>` / `Vec<TeeHashVersionInfo>` | Explicit version tracking for TEE hashes (multiple hashes may share a version). |
| `deprecate_tee_hash` | code_hash: BytesN<32> | `Result<(), Error>` | Flag a hash as deprecated without removing it. |
| `add_provider` / `is_provider` | provider: BytesN<32> | `()` / `bool` | Register / check a trusted oracle provider public key. |
| `set_provider_tier` / `get_provider_info` / `get_providers_by_tier` | provider: BytesN<32>; tier: ServiceTier (set only) | `()` / `Option<ProviderInfo>` / `Vec<BytesN<32>>` | Assign and query provider service tiers (Basic/Standard/Premium/Enterprise). |
| `deactivate_provider` / `can_accept_new_requests` / `finalize_removal` | provider: BytesN<32> | `()` / `bool` / `()` | Graceful provider removal with a 30-day grace period for in-flight requests. |
| `submit_provider_application` / `get_application` / `review_application` | applicant: Address; provider_key: BytesN<32>; metadata: String (submit only) | `u64` / `Option<ProviderApplication>` / `()` | Provider onboarding: apply, fetch an application, admin approve/reject. |
| `record_verification_result` / `get_provider_reputation` / `get_providers_by_min_reputation` | provider: BytesN<32>; success: bool (record only) | `Result<(), Error>` / `Result<ProviderReputation, Error>` / `Vec<BytesN<32>>` | Record outcomes and query reputation scores. |
| `apply_reputation_decay` | provider: BytesN<32> | `Result<(), Error>` | Time-based reputation decay for inactive providers (callable by anyone). |
| `set_provider_regions` / `add_provider_region` / `get_provider_regions` / `get_providers_by_region` | provider: BytesN<32>; region(s): Region (set/add only) | `Result<(), Error>` / `Vec<Region>` | Multi-region provider assignment and lookup. |
| `set_provider_capacity` / `get_provider_capacity` / `has_capacity` | provider: BytesN<32>; max_concurrent: u32 (set only) | `Result<(), Error>` / `Result<ProviderCapacity, Error>` / `bool` | Concurrent-request capacity limits per provider. |
| `increment_active_requests` / `decrement_active_requests` | provider: BytesN<32> | `Result<(), Error>` | Reserve/release a capacity slot (errors at the configured limit). |
| `add_provider_specialization` / `remove_provider_specialization` / `get_provider_specializations` / `get_providers_by_specialization` | provider: BytesN<32>; specialization: Specialization | `Result<(), Error>` / `Vec<Specialization>` / `Vec<BytesN<32>>` | Tag providers by content specialization and query by tag. |
| `blacklist_provider` / `whitelist_provider` / `is_blacklisted` / `get_blacklist_entry` | provider: BytesN<32>; reason_code: u32 (blacklist only) | `Result<(), Error>` / `bool` / `Result<BlacklistEntry, Error>` | Blacklist management; blacklisted providers fail `is_provider_authorized`. |
| `is_provider_authorized` | provider: BytesN<32> | `Result<bool, Error>` | Combined registration + blacklist authorization check. |
| `verify_and_mint` | content: Bytes; expected_hash: BytesN<32>; owner: Address | `VerificationResult` | Hash `content`, verify it matches `expected_hash`, then cross-call `provenance` to mint. |
| `get_multisig_threshold` / `update_multisig_threshold` | threshold: u32 (update only) | `u32` / `Result<(), Error>` | Read/update how many approvals a proposal needs. |
| `propose_operation` / `approve_proposal` / `execute_proposal` / `get_proposal` / `get_proposal_approvals` | operation: ProposalOperation; timelock_ledgers: u32 (propose only); proposal_id: u64 (others) | `Result<u64, Error>` / `Result<(), Error>` / `Option<Proposal>` / `Vec<Address>` | Multisig-gated admin operations: propose → approve (until threshold) → execute after the timelock. |
| `attach_cert_ref` / `get_cert_ref` | code_hash: BytesN<32>; issuer: String; valid_from: u64; valid_until: u64; cert_uri: Option\<String\> (attach only) | `Result<(), Error>` / `Result<TeeHashCertRef, Error>` | Attach/read an attestation certificate reference for a TEE hash. |
| `get_tee_hash_with_cert` | code_hash: BytesN<32> | `(bool, Option<TeeHashCertRef>)` | Approval status + certificate reference in one call. |
| `validate_cert_expiration` | code_hash: BytesN<32> | `Result<bool, Error>` | Whether the cert attached to a TEE hash has expired (`Ok(false)` if none attached). |

### Example — approve a TEE hash and check it

```bash
stellar contract invoke --id $REGISTRY_ID --network testnet --source admin -- \
  add_tee_hash --code-hash 7c9e6f3a...

stellar contract invoke --id $REGISTRY_ID --network testnet --source alice -- \
  is_tee_hash_approved --code-hash 7c9e6f3a...
```

---

## Error handling conventions

- Functions that can fail return `Result<T, Error>` (or a contract-specific
  error enum: `ProvenanceError`, `Error`) via `#[contracterror]`. The
  Soroban-generated client exposes both a panicking convenience method (e.g.
  `client.get_certificate(...)`) and a `try_` variant (e.g.
  `client.try_get_certificate(...)`) that surfaces the `Result` without
  panicking.
- Functions gated by `require_auth()` trap (abort the transaction) if the
  named address did not authorize the invocation — this is a host-level
  failure, not a contract-defined `Error` variant.
- Query functions that can legitimately return "nothing" (rather than fail)
  use `Option<T>` instead of `Result` (e.g. `get_request`, `get_admin`).
