# Registry Contract Events (docs/registry_events.md)

This document describes the events emitted by the **registry contract** (`contracts/registry`).

> Note: The current `contracts/registry/src/lib.rs` implementation uses storage-only operations for:
> - `add_tee_hash`
> - `add_provider`
> and does **not** publish events via `env.events().publish(...)` or `#[contractevent]`.
>
> Therefore, there are currently **no off-chain events** exposed for:
> - `TeeHashAdded`
> - `TeeHashRemoved`
> - `ProviderAdded`
> - `ProviderRemoved`

## Why there are no events right now

In the current code, the functions that update registry state are implemented as:
- `env.storage().persistent().set(..., &true)`
- `env.storage().persistent().remove(...)` (not present in this contract version)

There is no event definition (`#[contractevent]`) and no event emission (`env.events().publish(...)`).

## Event reference (expected)

If/when the registry contract is updated to emit events, the intended off-chain contract event reference should include:

### `TeeHashAdded`
- **Topic fields**: (to be defined)
- **Payload type**: (to be defined)
- **When emitted**: after a successful admin call to `add_tee_hash`
- **Example JSON**: (to be provided)

### `TeeHashRemoved`
- **Topic fields**: (to be defined)
- **Payload type**: (to be defined)
- **When emitted**: after a successful admin call that removes a previously registered tee hash
- **Example JSON**: (to be provided)

### `ProviderAdded`
- **Topic fields**: (to be defined)
- **Payload type**: (to be defined)
- **When emitted**: after a successful admin call to `add_provider`
- **Example JSON**: (to be provided)

### `ProviderRemoved`
- **Topic fields**: (to be defined)
- **Payload type**: (to be defined)
- **When emitted**: after a successful admin call that removes a previously registered provider
- **Example JSON**: (to be provided)

## Subscribing to contract events (Horizon API)

When events are available on-chain, clients can subscribe through Horizon using the **events stream** for a given contract.

### Stream contract events
- Use Horizon’s streaming endpoint (Server-Sent Events) for Soroban contract events.
- Filter by contract id and (optionally) by event topics.

Because Horizon event payload schemas depend on the on-chain event definition, consult Horizon’s Soroban events docs and the final on-chain event field ordering.

### Pseudocode example

```ts
// Pseudocode (adjust endpoint/fields to match your Horizon version)
const horizon = "https://<network>.stellar.org";
const contractId = "<registry_contract_id>";

const url = `${horizon}/events?contract_id=${contractId}`;

const es = new EventSource(url);

es.onmessage = (evt) => {
  const data = JSON.parse(evt.data);
  // data will include the emitted event name/type and the payload/topics.
};
```

## Next step

To complete this reference with exact topic fields, payload types, and JSON examples, the registry contract must emit events via `#[contractevent]` / `env.events().publish(...)` and include corresponding methods for removal (`remove_provider`, `remove_tee_hash`, etc.) if `TeeHashRemoved` / `ProviderRemoved` are required.

