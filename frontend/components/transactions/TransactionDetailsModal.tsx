"use client";

/**
 * TransactionDetailsModal.tsx
 *
 * Modal component displaying detailed information about a specific transaction.
 */

import { X, ExternalLink, Copy, CheckCircle, AlertCircle, Clock } from "lucide-react";
import type { Transaction } from "@/types/transaction.types";
import { useState } from "react";

interface TransactionDetailsModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  network?: "testnet" | "mainnet" | "futurenet";
}

export function TransactionDetailsModal({
  transaction,
  isOpen,
  onClose,
  network = "testnet",
}: TransactionDetailsModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen || !transaction) return null;

  const explorerUrl = `https://stellar.expert/explorer/${network}/tx/${transaction.stellarTxHash}`;
  const horizonUrl = `https://horizon-${network}.stellar.org/transactions/${transaction.stellarTxHash}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const statusIcon = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    failed: <AlertCircle className="w-5 h-5 text-red-500" />,
    pending: <Clock className="w-5 h-5 text-yellow-500" />,
  };

  const statusColor = {
    success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Transaction Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center gap-3">
              {statusIcon[transaction.status]}
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor[transaction.status]}`}
              >
                {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
              </span>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Description
              </h3>
              <p className="text-base text-gray-900 dark:text-white">{transaction.description}</p>
            </div>

            {/* Transaction Hash */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Transaction Hash
              </h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-gray-900 dark:text-white break-all">
                  {transaction.stellarTxHash}
                </code>
                <button
                  onClick={() => copyToClipboard(transaction.stellarTxHash, "hash")}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Copy hash"
                >
                  {copied === "hash" ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Date */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Date & Time
              </h3>
              <p className="text-base text-gray-900 dark:text-white">
                {formatDate(transaction.timestamp)}
              </p>
            </div>

            {/* Type */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Transaction Type
              </h3>
              <p className="text-base text-gray-900 dark:text-white capitalize">
                {transaction.type.replace(/_/g, " ")}
              </p>
            </div>

            {/* Certificate ID */}
            {transaction.certificateId && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Certificate ID
                </h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-gray-900 dark:text-white">
                    {transaction.certificateId}
                  </code>
                  <button
                    onClick={() => copyToClipboard(transaction.certificateId!, "cert")}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="Copy certificate ID"
                  >
                    {copied === "cert" ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Amount */}
            {transaction.amount && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Amount
                </h3>
                <p className="text-base text-gray-900 dark:text-white font-mono">
                  {transaction.amount} XLM
                </p>
              </div>
            )}

            {/* Fee */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Network Fee
              </h3>
              <p className="text-base text-gray-900 dark:text-white font-mono">
                {transaction.fee} stroops ({(transaction.fee / 10000000).toFixed(7)} XLM)
              </p>
            </div>

            {/* Ledger */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Ledger</h3>
              <p className="text-base text-gray-900 dark:text-white font-mono">
                {transaction.ledger}
              </p>
            </div>

            {/* Source Account */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Source Account
              </h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-gray-900 dark:text-white break-all">
                  {transaction.sourceAccount}
                </code>
                <button
                  onClick={() => copyToClipboard(transaction.sourceAccount, "account")}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Copy account"
                >
                  {copied === "account" ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Metadata */}
            {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Additional Data
                </h3>
                <pre className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-gray-900 dark:text-white overflow-x-auto">
                  {JSON.stringify(transaction.metadata, null, 2)}
                </pre>
              </div>
            )}

            {/* External Links */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                View on Explorer
              </h3>
              <div className="flex flex-col gap-2">
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Stellar Expert
                </a>
                <a
                  href={horizonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Horizon API
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
