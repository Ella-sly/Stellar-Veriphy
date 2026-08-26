# Contract Error Codes

This reference documents the typed contract errors defined in the Soroban
contracts under `contracts/oracle`, `contracts/provenance`, and
`contracts/registry`.

Use this as the canonical troubleshooting guide when a contract call returns a
contract-defined error enum rather than a host-level auth trap.

## Oracle contract

Location: [`contracts/oracle/src/lib.rs`](../../contracts/oracle/src/lib.rs)

| Code | Error | When it occurs | Typical resolution |
| --- | --- | --- | --- |
| 1 | `NotInitialized` | A method that depends on contract setup runs before `init`. | Call `init` first and confirm the registry/provenance addresses are stored. |
| 2 | `UnauthorizedSigner` | An attestation or verification payload was not signed by the authorized provider key. | Re-sign with the configured provider key and make sure the provider is registered. |
| 3 | `AlreadyInitialized` | `init` is called more than once. | Do not re-run initialization on an already configured contract. |
| 4 | `RegistryNotConfigured` | The oracle tries to cross-call `registry` but the registry address is missing. | Reinitialize with the registry address set, or repair the stored config. |
| 5 | `TeeNotVerified` | A TEE hash is not approved by the registry. | Add or restore the expected TEE hash in `registry`, then retry. |
| 6 | `ProviderNotRegistered` | A provider-specific action targets an address that is not registered. | Register the provider in the oracle before retrying the action. |
| 7 | `BatchSizeExceeded` | A batch request exceeds the configured maximum size. | Split the request into smaller batches. |
| 8 | `RequestNotFound` | A request ID does not exist or has already expired/been removed. | Check the request ID and state before retrying. |
| 9 | `Unauthorized` | The caller lacks the required admin or ownership rights. | Use the contract admin or the request owner. |
| 10 | `InvalidState` | The request or dispute is not in a valid lifecycle state for the action. | Confirm the request state and only call the method in the supported phase. |
| 11 | `InsufficientStake` | A provider tries to stake below the minimum or withdraw more than the active stake. | Increase the deposit or lower the withdrawal amount. |
| 12 | `NoStake` | No stake record exists for the provider. | Deposit stake before initiating stake operations. |
| 13 | `WithdrawalCooldown` | A withdrawal is finalized before the cooldown period expires. | Wait the required number of ledgers and try again. |
| 14 | `ContractPaused` | The contract is paused and the requested action is blocked. | Resume the contract or wait for the pause to be lifted. |
| 15 | `ProviderSuspended` | A provider is suspended due to poor SLA compliance. | Rehabilitate the provider and reinstate it before use. |
| 16 | `PricingNotSet` | Cost estimation is requested before pricing is configured for the provider. | Set provider pricing first. |
| 17 | `NoAvailableProvider` | No provider meets the current eligibility rules. | Register, unpause, or unsuspend a provider with sufficient reputation. |
| 18 | `DisputeNotFound` | The dispute ID does not exist. | Check the dispute ID and ensure it was filed successfully. |
| 19 | `DisputeAlreadyResolved` | A resolved dispute is acted on again. | Use the original dispute record only while it is still open. |
| 20 | `InvalidTTL` | TTL configuration contains an invalid zero value. | Set all TTL values to positive ledger counts. |
| 21 | `InvalidThreshold` | A warning threshold is zero or otherwise invalid. | Set the threshold to a positive ledger count. |

## Provenance contract

Location: [`contracts/provenance/src/lib.rs`](../../contracts/provenance/src/lib.rs)

> Note: the current source file has stray enum-like lines after `ProvenanceError`
> that do not form a second typed error enum. The table below lists the
> confirmed compile-time `ProvenanceError` variants only.

| Code | Error | When it occurs | Typical resolution |
| --- | --- | --- | --- |
| 1 | `CertificateNotFound` | A certificate ID, code, or history entry cannot be found. | Verify the certificate ID or lookup code. |
| 2 | `Unauthorized` | The caller is not permitted to perform the action. | Use the owner, creator, or other authorized account. |
| 3 | `DuplicateCertificate` | The contract detects an attempt to mint or register the same certificate twice. | Reuse the existing certificate or pick a new unique input set. |
| 4 | `BatchSizeExceeded` | A batch mint or batch lookup exceeds the configured limit. | Reduce the batch size. |
| 5 | `CodeNotFound` | A verification code is missing for the requested certificate. | Generate the verification code first. |
| 6 | `InvalidMediaMetadata` | Media metadata fails contract validation. | Fix the content type, dimensions, duration, or other metadata fields. |

## Registry contract

Location: [`contracts/registry/src/lib.rs`](../../contracts/registry/src/lib.rs)

| Code | Error | When it occurs | Typical resolution |
| --- | --- | --- | --- |
| 1 | `NotInitialized` | An admin or registry action runs before `init`. | Call `init` with the admin and provenance addresses. |
| 2 | `Unauthorized` | The caller is not the expected admin or multisig-authorized account. | Use an authorized account and re-run the action. |
| 3 | `InvalidThreshold` | A multisig threshold or cert-expiration value is invalid. | Configure a positive threshold that fits the proposal set. |
| 4 | `ProposalNotFound` | A proposal ID does not exist. | Double-check the proposal ID and its lifecycle. |
| 5 | `ProposalExpired` | A proposal exceeds its timelock window before execution. | Re-submit the proposal and approve it within the active window. |
| 6 | `InsufficientApprovals` | A proposal has not gathered enough approvals to execute. | Collect the remaining approvals and retry. |
| 7 | `TeeHashNotFound` | The TEE hash or its version info is missing. | Add the hash before querying or rotating it. |
| 8 | `ProviderNotFound` | A provider public key or record is missing. | Register the provider first. |
| 9 | `CertificateExpired` | A certificate reference has passed its validity window. | Attach a new certificate reference. |
| 10 | `ProviderBlacklisted` | A provider is blacklisted and therefore blocked from authorization. | Whitelist the provider after resolving the underlying issue. |
| 11 | `NotBlacklisted` | A whitelist or blacklist query expects a blacklist entry that does not exist. | Check whether the provider was ever blacklisted. |
| 12 | `CapacityExceeded` | The provider has reached its configured active-request limit. | Wait for capacity to free up or increase the limit. |
| 13 | `InvalidCapacity` | The configured capacity is zero or otherwise invalid. | Set a positive capacity value. |

## Troubleshooting tips

- Contract-defined errors return as typed enum values. Host-level auth failures
  from `require_auth()` are separate and do not use these enums.
- If a call fails and the enum looks unexpected, check whether the contract was
  initialized, whether the caller has the required authority, and whether the
  referenced ID exists.
- For cross-contract flows, debug the downstream contract first. In this repo
  that usually means `registry` for TEE approval and `provenance` for minting
  failures.
