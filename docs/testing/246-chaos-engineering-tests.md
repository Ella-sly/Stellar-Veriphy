# #246 — Add Chaos Engineering Tests

**Labels:** testing, reliability · **Priority:** Low

## Goal

Verify the system degrades predictably — instead of corrupting state or
hanging — when a dependency misbehaves: a cross-contract call panics, an RPC
call drops, a wallet extension stalls, or a request times out mid-flight.

## Where "chaos" actually applies here

Stellar-Veriphy has no long-lived servers or queues to kill — the failure
surface is (a) cross-contract calls between `oracle` → `registry` /
`provenance`, and (b) the frontend's calls out to Soroban RPC and the
Freighter wallet extension. The acceptance criteria map onto those two
tiers rather than infra-style chaos (pod kills, network partitions).

### Tier 1 — contract-level fault injection

`contracts/oracle/src/test.rs` already has the right pattern to extend: it
defines `mock_registry` (happy path) and `reject_registry` (always denies)
test-only contracts that stand in for `registry` when exercising `oracle`.
Add siblings for the failure modes the acceptance criteria call for:

- `panicking_registry` — a mock whose functions panic, simulating a
  dependent contract erroring mid-call. Assert the caller's storage is
  unchanged afterward (Soroban transactions are atomic, so this should
  hold — the test exists to *prove* it, and to catch any future code path
  that writes to storage before making the cross-contract call).
- `malformed_registry` — returns a `bool`/type that's technically valid but
  semantically wrong (e.g. `is_provider` always `true` while
  `is_tee_hash_approved` always `false`), to check the caller doesn't
  silently accept an inconsistent combination.
- **Partial batch failure**: `oracle` has a batch request path — add a test
  where one item in a batch fails validation and assert the others still
  succeed (or the whole batch atomically rolls back, whichever is the
  intended contract) rather than leaving partial state.

There's no real "timeout" at the unit-test level (a Soroban call either
returns or panics within the same host invocation), so "transaction timeout
handling" is covered by the request-TTL / expiration-ledger paths already
present in `oracle` (`RequestTTL`, `ExpirationWarningLedgers`,
`LastArchivalLedger`) — add a chaos test that advances the ledger past TTL
mid-flight and confirms the request is rejected/archived rather than left
in limbo.

### Tier 2 — frontend fault injection

Target `frontend/services/certificateVerificationService.ts`,
`verificationStatusService.ts`, and `wallet.ts` / `walletAdapters.ts` — the
layer that talks to Soroban RPC and Freighter.

New `frontend/test/chaos/` harness, plain Jest (no new dependency):

```ts
// frontend/test/chaos/network.ts
export function simulateNetworkFailure() // fetch rejects
export function simulateTimeout(ms: number) // fetch never resolves; pair with AbortController assertions
export function simulateFlaky(failCount: number) // fails N times, then succeeds — for retry/recovery tests
export function simulateMalformedResponse(body: unknown) // 200 OK, invalid JSON shape
```

Test matrix per acceptance criterion:

| Criterion | Test |
|---|---|
| Network failure simulation | `fetch` rejects → service surfaces a typed error, doesn't throw unhandled |
| Transaction timeout handling | `AbortController` fires past a deadline → in-flight request is cancelled, UI leaves "pending" state rather than hanging forever |
| Partial system failures | Wallet connects but Soroban RPC is unreachable (and vice versa) → each failure is attributable, not a generic "something went wrong" |
| Recovery testing | `simulateFlaky(2)` → a retry wrapper succeeds on the 3rd attempt; assert exactly the expected number of calls |
| Graceful degradation | RPC down → previously-cached verification result (if any) is still shown, clearly marked stale, instead of blanking the UI |
| Error boundary testing | **Doesn't exist yet** — no `ErrorBoundary`/`componentDidCatch` anywhere in `frontend/`. Add a `VerificationErrorBoundary` around the async verification widgets ([features/verification](../../frontend/features/verification)) and test that a thrown render error shows a fallback instead of a blank page |

## Non-goals for a first pass

Full infra chaos (killing the Next.js process, simulating disk failure,
Toxiproxy-style network partitioning) is out of scope — there's no
persistent backend process to target. If a real backend/queue is added
later, revisit with a proper fault-injection proxy.

## Rollout

1. Add the `frontend/test/chaos/` fault-injection helpers.
2. Add the `VerificationErrorBoundary` component + test (currently missing).
3. Retry/recovery + graceful-degradation tests on the verification services.
4. Contract-side `panicking_registry` / `malformed_registry` mocks in
   `oracle/src/test.rs`, plus the TTL-expiry-mid-flight test.
5. Batch partial-failure test.
