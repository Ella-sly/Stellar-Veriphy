# Smart Contract API Reference

This document covers the public functions exposed by StellarVeriphy's three
Soroban (Rust/WASM) contracts. For the HTTP API exposed by the Next.js
frontend, see the interactive explorer at `/docs` (spec: `frontend/public/openapi.yaml`).

Each contract function below can be invoked with the [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)
once deployed:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source <YOUR_IDENTITY> \
  -- <function> --<arg-name> <value> ...
```

---

## `oracle` — `contracts/oracle`

Handles submission and lookup of off-chain verification requests before a
TEE attestation is available.

### `submit`

```rust
pub fn submit(env: Env, storage_ref: Bytes, manifest_hash: Bytes, requester: Address) -> u64
```

Submits a new verification request and stores it under a fresh ID.

| Parameter       | Type      | Description                                             |
|-----------------|-----------|----------------------------------------------------------|
| `storage_ref`   | `Bytes`   | Reference to where the content is stored (e.g. IPFS CID). |
| `manifest_hash` | `Bytes`   | sha256 hash of the content manifest.                      |
| `requester`     | `Address` | Stellar address submitting the request. Must authorize this call. |

**Returns:** `u64` — the request ID (the ledger sequence number at submission time).

**Auth:** requires `requester.require_auth()`. Fails (traps) if the invocation
is not authorized by `requester`.

**Events:** publishes `("submitted",)` with the new request ID as data.

**Example:**

```bash
stellar contract invoke --id $ORACLE_ID --network testnet --source alice -- \
  submit --storage_ref ipfs://bafybeigd... --manifest_hash 9f86d081... --requester $ALICE_ADDRESS
```

### `get`

```rust
pub fn get(env: Env, id: u64) -> Result<VerificationRequest, Error>
```

Retrieves a previously submitted verification request.

| Parameter | Type  | Description                     |
|-----------|-------|----------------------------------|
| `id`      | `u64` | The request ID returned by `submit`. |

**Returns:** `VerificationRequest { storage_ref: Bytes, manifest_hash: Bytes, requester: Address }`

**Errors:**

| Code | Name       | Meaning                                   |
|------|------------|--------------------------------------------|
| `1`  | `NotFound` | No request has been submitted with this ID. |

**Example:**

```bash
stellar contract invoke --id $ORACLE_ID --network testnet --source alice -- get --id 12345
```

---

## `provenance` — `contracts/provenance`

Mints immutable provenance certificates once a TEE attestation confirms a
verification request.

### `mint`

```rust
pub fn mint(env: Env, storage_ref: Bytes, manifest_hash: Bytes, attestation_hash: Bytes, creator: Address) -> u64
```

| Parameter          | Type      | Description                                             |
|--------------------|-----------|----------------------------------------------------------|
| `storage_ref`      | `Bytes`   | Reference to where the content is stored.                 |
| `manifest_hash`    | `Bytes`   | sha256 hash of the content manifest.                       |
| `attestation_hash` | `Bytes`   | Hash of the signed TEE attestation proving verification.   |
| `creator`          | `Address` | Stellar address of the content creator. Must authorize this call. |

**Returns:** `u64` — the certificate ID (the ledger sequence number at mint time).

**Auth:** requires `creator.require_auth()`.

**Events:** publishes `("minted",)` with the new certificate ID as data.

**Example:**

```bash
stellar contract invoke --id $PROVENANCE_ID --network testnet --source alice -- \
  mint --storage_ref ipfs://bafybeigd... --manifest_hash 9f86d081... \
       --attestation_hash 3b2f9c11... --creator $ALICE_ADDRESS
```

### `get`

```rust
pub fn get(env: Env, id: u64) -> Result<ProvenanceCert, Error>
```

| Parameter | Type  | Description                   |
|-----------|-------|---------------------------------|
| `id`      | `u64` | The certificate ID returned by `mint`. |

**Returns:** `ProvenanceCert { storage_ref: Bytes, manifest_hash: Bytes, attestation_hash: Bytes, creator: Address, timestamp: u64 }`

`timestamp` is the ledger close time (Unix seconds) at mint.

**Errors:**

| Code | Name       | Meaning                                    |
|------|------------|----------------------------------------------|
| `1`  | `NotFound` | No certificate has been minted with this ID. |

**Example:**

```bash
stellar contract invoke --id $PROVENANCE_ID --network testnet --source alice -- get --id 12345
```

---

## `registry` — `contracts/registry`

Maintains the set of TEE code hashes approved to produce attestations that
the `provenance` contract will trust.

### `register`

```rust
pub fn register(env: Env, admin: Address, code_hash: Bytes)
```

| Parameter   | Type      | Description                                  |
|-------------|-----------|------------------------------------------------|
| `admin`     | `Address` | Registry administrator. Must authorize this call. |
| `code_hash` | `Bytes`   | The TEE enclave code hash to approve.            |

**Returns:** nothing.

**Auth:** requires `admin.require_auth()`.

**Events:** publishes `("registered",)` with the approved code hash as data.

**Errors:** none — this function has no fallible paths beyond the
authorization trap enforced by `require_auth`.

**Example:**

```bash
stellar contract invoke --id $REGISTRY_ID --network testnet --source admin -- \
  register --admin $ADMIN_ADDRESS --code_hash 7c9e6f3a...
```

### `is_approved`

```rust
pub fn is_approved(env: Env, code_hash: Bytes) -> bool
```

| Parameter   | Type    | Description                     |
|-------------|---------|-----------------------------------|
| `code_hash` | `Bytes` | The TEE enclave code hash to check. |

**Returns:** `bool` — `true` if `code_hash` has been registered, `false`
otherwise (including for hashes that were never registered — this call never
panics).

**Errors:** none.

**Example:**

```bash
stellar contract invoke --id $REGISTRY_ID --network testnet --source alice -- \
  is_approved --code_hash 7c9e6f3a...
```

---

## Error handling conventions

- Functions that can fail to find a stored record return `Result<T, Error>`
  with a contract-specific `Error` enum (`#[contracterror]`). The
  Soroban-generated client exposes both a panicking convenience method
  (e.g. `client.get(...)`) and a `try_` variant (e.g. `client.try_get(...)`)
  that surfaces the `Result` without panicking.
- Functions gated by `require_auth()` trap (abort the transaction) if the
  named address did not authorize the invocation — this is a host-level
  failure, not a contract-defined `Error` variant.
