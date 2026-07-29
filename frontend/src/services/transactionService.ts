/**
 * Transaction service — wraps the Horizon fetch utility and exposes
 * helpers used by UI components.
 */

export type TransactionStatus = "PENDING" | "CONFIRMED" | "FAILED";

const HORIZON_URL = "https://horizon.stellar.org";
const EXPLORER_BASE = "https://stellar.expert/explorer/public/tx";

/**
 * Fetches the current status of a Stellar transaction from Horizon.
 * Returns PENDING when the transaction is not yet found (404),
 * FAILED when `successful` is false, and CONFIRMED otherwise.
 * Falls back to PENDING on network errors.
 */
export async function fetchTransactionStatus(
  txHash: string
): Promise<TransactionStatus> {
  try {
    const response = await fetch(`${HORIZON_URL}/transactions/${txHash}`);

    if (response.status === 404) {
      return "PENDING";
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.successful === false) {
      return "FAILED";
    }

    return "CONFIRMED";
  } catch (error) {
    console.error("Error fetching transaction status:", error);
    return "PENDING";
  }
}

/**
 * Returns the Stellar Expert explorer URL for a given transaction hash.
 */
export function getExplorerUrl(txHash: string): string {
  return `${EXPLORER_BASE}/${txHash}`;
 * transactionService.ts
 *
 * Fetches Stellar transaction status from the Horizon API and provides a
 * Stellar Expert explorer URL helper.
 *
 * In development (NEXT_PUBLIC_MOCK_TX=true) a mock fallback simulates the
 * PENDING → CONFIRMED progression so the UI can be exercised without a live
 * network connection.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Possible lifecycle states of a Stellar transaction. */
export type TxStatus = "PENDING" | "CONFIRMED" | "FAILED";

/** Full result object returned by fetchTransactionStatus. */
export interface TransactionStatusResult {
  /** The transaction hash that was queried. */
  hash: string;
  /** Current status of the transaction. */
  status: TxStatus;
  /** ISO 8601 timestamp of when the status was last checked. */
  checkedAt: string;
  /** Whether this result came from the mock fallback. */
  isMock: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HORIZON_TESTNET_URL = "https://horizon-testnet.stellar.org";
const HORIZON_MAINNET_URL = "https://horizon.stellar.org";
const STELLAR_EXPERT_BASE = "https://stellar.expert/explorer";

/**
 * Which Horizon endpoint to use.  Defaults to testnet; set
 * NEXT_PUBLIC_STELLAR_NETWORK=mainnet to switch.
 */
const HORIZON_URL =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
    ? HORIZON_MAINNET_URL
    : HORIZON_TESTNET_URL;

/**
 * Network name used in Stellar Expert URLs.
 */
const EXPLORER_NETWORK =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet" ? "public" : "testnet";

// ---------------------------------------------------------------------------
// Mock fallback
// ---------------------------------------------------------------------------

/**
 * In-memory store that tracks how many times each hash has been polled.
 * After MOCK_CONFIRM_AFTER_POLLS polls the status advances to CONFIRMED.
 */
const mockPollCount = new Map<string, number>();
const MOCK_CONFIRM_AFTER_POLLS = 3;

/**
 * Simulates PENDING → CONFIRMED progression.
 * Each call increments an internal counter for the given hash; once the
 * counter reaches MOCK_CONFIRM_AFTER_POLLS the status becomes CONFIRMED.
 */
function getMockStatus(hash: string): TxStatus {
  const count = (mockPollCount.get(hash) ?? 0) + 1;
  mockPollCount.set(hash, count);
  return count >= MOCK_CONFIRM_AFTER_POLLS ? "CONFIRMED" : "PENDING";
}

// ---------------------------------------------------------------------------
// Core service functions
// ---------------------------------------------------------------------------

/**
 * Fetch the current status of a Stellar transaction from the Horizon API.
 *
 * - Returns `PENDING`  when the transaction is not yet found (HTTP 404).
 * - Returns `CONFIRMED` when the transaction exists and `successful === true`.
 * - Returns `FAILED`   when the transaction exists but `successful === false`.
 *
 * Falls back to the mock implementation when:
 *   - `NEXT_PUBLIC_MOCK_TX=true`, OR
 *   - the Horizon request throws a network error.
 *
 * @param hash  64-character hex transaction hash.
 * @returns     A `TransactionStatusResult` describing the current state.
 */
export async function fetchTransactionStatus(
  hash: string
): Promise<TransactionStatusResult> {
  const useMock = process.env.NEXT_PUBLIC_MOCK_TX === "true";

  if (useMock) {
    return {
      hash,
      status: getMockStatus(hash),
      checkedAt: new Date().toISOString(),
      isMock: true,
    };
  }

  try {
    const response = await fetch(`${HORIZON_URL}/transactions/${hash}`);

    if (response.status === 404) {
      return {
        hash,
        status: "PENDING",
        checkedAt: new Date().toISOString(),
        isMock: false,
      };
    }

    if (!response.ok) {
      throw new Error(`Horizon returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const status: TxStatus = data.successful === false ? "FAILED" : "CONFIRMED";

    return {
      hash,
      status,
      checkedAt: new Date().toISOString(),
      isMock: false,
    };
  } catch (error) {
    // Network error or unexpected response — fall back to mock so the UI
    // degrades gracefully during development.
    console.warn(
      "[transactionService] Horizon request failed, using mock fallback:",
      error
    );
    return {
      hash,
      status: getMockStatus(hash),
      checkedAt: new Date().toISOString(),
      isMock: true,
    };
  }
}

/**
 * Build a Stellar Expert explorer URL for the given transaction hash.
 *
 * @param hash  64-character hex transaction hash.
 * @returns     Full HTTPS URL to the transaction on stellar.expert.
 *
 * @example
 * getExplorerUrl("abc123...")
 * // → "https://stellar.expert/explorer/testnet/tx/abc123..."
 */
export function getExplorerUrl(hash: string): string {
  return `${STELLAR_EXPERT_BASE}/${EXPLORER_NETWORK}/tx/${hash}`;
}
