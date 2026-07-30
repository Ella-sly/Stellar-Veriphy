"use client";

import { useWallet } from "@/context/WalletContext";
import { useState } from "react";

export function WrongNetworkWarning() {
  const { network } = useWallet();
  const [dismissed, setDismissed] = useState(false);

  if (!network || dismissed) return null;

  const isTestnet = network.network.toLowerCase().includes("testnet");

  if (isTestnet) return null;

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className="text-red-600 dark:text-red-400 mt-0.5">
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-red-800 dark:text-red-200">
            Wrong Network
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            You are connected to {network.network}. Please switch to testnet for
            development.
          </p>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 flex-shrink-0"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
