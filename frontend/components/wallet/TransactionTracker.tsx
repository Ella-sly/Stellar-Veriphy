"use client";

import { useEffect, useState } from "react";
import {
  fetchTransactionStatus,
  type TransactionStatus,
} from "@/utils/transaction";
import { FiLoader, FiCheckCircle, FiAlertCircle, FiExternalLink } from "react-icons/fi";

interface TransactionTrackerProps {
  txHash: string;
}

export function TransactionTracker({ txHash }: TransactionTrackerProps) {
  const [status, setStatus] = useState<TransactionStatus>("PENDING");
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (!isPolling) return;

    const pollTransaction = async () => {
      const newStatus = await fetchTransactionStatus(txHash);
      setStatus(newStatus);

      if (newStatus !== "PENDING") {
        setIsPolling(false);
      }
    };

    pollTransaction();
    const interval = setInterval(pollTransaction, 3000);

    return () => clearInterval(interval);
  }, [txHash, isPolling]);

  const getStatusDisplay = () => {
    switch (status) {
      case "PENDING":
        return {
          icon: <FiLoader className="w-5 h-5 animate-spin text-blue-500" />,
          text: "Pending",
          color: "text-blue-600",
        };
      case "CONFIRMED":
        return {
          icon: <FiCheckCircle className="w-5 h-5 text-green-500" />,
          text: "Confirmed",
          color: "text-green-600",
        };
      case "FAILED":
        return {
          icon: <FiAlertCircle className="w-5 h-5 text-red-500" />,
          text: "Failed",
          color: "text-red-600",
        };
    }
  };

  const display = getStatusDisplay();
  const explorerUrl = `https://stellar.expert/explorer/public/tx/${txHash}`;

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      <div>{display.icon}</div>
      <div className="flex-1">
        <p className={`font-medium ${display.color}`}>{display.text}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {txHash}
        </p>
      </div>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
        title="View on Stellar Expert"
      >
        <FiExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </a>
    </div>
  );
}
