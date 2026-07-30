"use client";

interface TransactionTrackerProps {
  transactionHash?: string;
  status?: "pending" | "success" | "failed";
}

export function TransactionTracker({
  transactionHash,
  status = "pending",
}: TransactionTrackerProps) {
  const explorerUrl = transactionHash
    ? `https://stellar.expert/explorer/testnet/tx/${transactionHash}`
    : null;

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <div className="p-4 border rounded bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-black dark:text-white">
          Transaction Status
        </h3>
        <span className={`px-3 py-1 rounded text-sm font-medium ${statusColors[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
      {transactionHash && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Hash: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs">{transactionHash}</code>
          </p>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-blue-500 hover:text-blue-700 text-sm"
            >
              View on Stellar Expert →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
