"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface WalletState {
  publicKey: string | null;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
  publicKey: null,
  connected: false,
  connect: async () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const connect = useCallback(async () => {
    // Freighter wallet integration point
    if (typeof window === "undefined") return;
    try {
      const freighter = (window as Window & { freighter?: { getPublicKey: () => Promise<string> } }).freighter;
      if (!freighter) throw new Error("Freighter wallet not found");
      const key = await freighter.getPublicKey();
      setPublicKey(key);
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  }, []);

  const disconnect = useCallback(() => setPublicKey(null), []);

  return (
    <WalletContext.Provider
      value={{ publicKey, connected: !!publicKey, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
