# #402 — Add Integration Tests for Wallet Connection

**Labels:** testing, frontend, wallet · **Difficulty:** Intermediate · **Estimate:** 6-8h
**Depends on:** a wallet connection feature existing (currently none does); [#401](./401-test-fixtures.md) for mock wallet data.

## Description

Write integration tests for the wallet connection flow.

## Acceptance criteria (from issue)

- [ ] Test wallet detection
- [ ] Test connection flow
- [ ] Test disconnection
- [ ] Test account switching
- [ ] Mock wallet providers
- [ ] Test error scenarios

## Blocker

There is no wallet integration code anywhere in `frontend/` yet — no
Freighter/Stellar Wallets Kit dependency in `frontend/package.json`, no
connect/disconnect UI, no `useWallet` hook. The root README lists
"Freighter wallet (for Stellar testnet)" only as a developer prerequisite
for using the *dApp*, not as an implemented feature. This issue can't be
"integration tests for" an existing flow — it has to be scoped alongside
building the flow itself, likely the same piece of work referenced as a
blocker in [#400](./400-react-hook-tests.md).

Recommend building the wallet integration first (or in the same PR) using
[Stellar Wallets Kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit) or
Freighter's API directly, exposing it as a `useWallet` hook +
`WalletProvider` context, before writing "integration tests" against it.

## Tooling

Same base as [#400](./400-react-hook-tests.md) (Vitest/Jest +
`@testing-library/react`), plus a mock wallet provider since these are
*integration* tests (render the connect button → click → assert UI
reflects connected state), not pure hook unit tests.

```
frontend/
├── components/wallet/
│   ├── ConnectWalletButton.tsx
│   └── ConnectWalletButton.test.tsx
├── hooks/useWallet.ts
└── lib/wallet/
    ├── provider.ts              # real Freighter/Wallets Kit adapter
    └── mockProvider.ts          # in-memory mock implementing the same interface, for tests
```

## Test scenarios to cover

- **Detection**: wallet extension absent → UI shows "install wallet" state,
  not a crash.
- **Connection**: click connect → mock provider resolves with a public key
  (from [#401](./401-test-fixtures.md)'s wallet fixtures) → UI shows
  truncated address + connected state.
- **Disconnection**: click disconnect → state resets, no stale public key
  rendered anywhere.
- **Account switching**: mock provider emits a changed-account event →
  connected UI updates to the new public key without requiring a manual
  reconnect.
- **Error scenarios**: user rejects the connection prompt (mock provider
  rejects) → UI shows a recoverable error, not a silent failure or crash;
  network/timeout error from the provider is handled the same way.

## Mocking approach

Define a `WalletProvider` interface (`connect()`, `disconnect()`,
`getPublicKey()`, `onAccountChange(cb)`) that both the real adapter and a
test double implement, and inject the implementation via context/DI rather
than importing the real Freighter SDK directly in components. This is what
makes "mock wallet providers" (an explicit acceptance criterion) clean
instead of requiring `vi.mock('freighter-api')` sprinkled across every test.
