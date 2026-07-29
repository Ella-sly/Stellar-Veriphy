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
}
