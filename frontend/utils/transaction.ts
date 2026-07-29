export type TransactionStatus = "PENDING" | "CONFIRMED" | "FAILED";

const HORIZON_URL = "https://horizon.stellar.org";

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
