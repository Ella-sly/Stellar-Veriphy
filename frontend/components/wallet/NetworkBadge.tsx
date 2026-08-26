"use client";

import { useWallet } from "@/context/WalletContext";
import { cn } from "@/utils/cn";

export function NetworkBadge() {
  const { network } = useWallet();

  if (!network) return null;

  const getNetworkColor = (networkName: string) => {
    if (networkName.toLowerCase().includes("testnet")) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    }
    if (networkName.toLowerCase().includes("mainnet")) {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
    return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
        getNetworkColor(network.network)
      )}
    >
      {network.network}
    </span>
  );
}
