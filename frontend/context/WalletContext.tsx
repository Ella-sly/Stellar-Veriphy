"use client";

/**
 * WalletContext.tsx
 *
 * Multi-wallet aware context that wraps any WalletAdapter implementation.
 * Supports Freighter, Albedo, xBull, and Rabet.
 *
 * Persistence strategy
 * --------------------
 * - Selected wallet type  → localStorage key "sv_wallet_type"
 * - Connected public key  → localStorage key "sv_wallet_key"
 *
 * On mount the context auto-reconnects if both keys are present and the
 * adapter reports it is still available.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ALL_ADAPTERS,
  getAdapter,
  type WalletAdapter,
  type WalletNetworkDetails,
  type WalletType,
} from "@/services/walletAdapters";

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------
const STORAGE_KEY_TYPE = "sv_wallet_type";
const STORAGE_KEY_KEY  = "sv_wallet_key";
const POLL_INTERVAL    = 4_000; // ms

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface WalletContextValue {
  /** Currently active public key, or null when disconnected. */
  publicKey: string | null;
  /** Active network details reported by the wallet. */
  network: WalletNetworkDetails | null;
  /** True when a wallet is connected. */
  connected: boolean;
  /** The type of the currently connected wallet, or null. */
  walletType: WalletType | null;
  /** The adapter instance for the currently connected wallet, or null. */
  adapter: WalletAdapter | null;
  /** All registered adapters (for building the selector UI). */
  adapters: WalletAdapter[];
  /** Last error message, or null. */
  error: string | null;
  /** Connect using the given wallet type. */
  connect: (type: WalletType) => Promise<void>;
  /** Disconnect the current wallet. */
  disconnect: () => void;
  /** Switch to a different wallet type (disconnects first). */
  switchWallet: (type: WalletType) => Promise<void>;
  /** Sign a transaction XDR with the active wallet. */
  signTx: (xdr: string) => Promise<string>;
  /** Clear the current error. */
  clearError: () => void;
  /** Re-fetch network details from the active wallet. */
  refreshNetwork: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue>({
  publicKey:     null,
  network:       null,
  connected:     false,
  walletType:    null,
  adapter:       null,
  adapters:      ALL_ADAPTERS,
  error:         null,
  connect:       async () => {},
  disconnect:    () => {},
  switchWallet:  async () => {},
  signTx:        async () => "",
  clearError:    () => {},
  refreshNetwork: async () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey,  setPublicKey]  = useState<string | null>(null);
  const [network,    setNetwork]    = useState<WalletNetworkDetails | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived: the active adapter instance
  const adapter: WalletAdapter | null = walletType ? getAdapter(walletType) : null;

  // ── Network polling ────────────────────────────────────────────────────────

  const refreshNetwork = useCallback(async () => {
    if (!adapter) return;
    try {
      const details = await adapter.getNetwork();
      setNetwork(details);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch network");
    }
  }, [adapter]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(refreshNetwork, POLL_INTERVAL);
  }, [refreshNetwork]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ── Auto-reconnect on mount ────────────────────────────────────────────────

  useEffect(() => {
    const savedType = localStorage.getItem(STORAGE_KEY_TYPE) as WalletType | null;
    const savedKey  = localStorage.getItem(STORAGE_KEY_KEY);
    if (!savedType || !savedKey) return;

    const tryReconnect = async () => {
      try {
        const adpt = getAdapter(savedType);
        const available = await adpt.isAvailable();
        if (!available) {
          localStorage.removeItem(STORAGE_KEY_TYPE);
          localStorage.removeItem(STORAGE_KEY_KEY);
          return;
        }
        setWalletType(savedType);
        setPublicKey(savedKey);
        const details = await adpt.getNetwork();
        setNetwork(details);
        startPolling();
      } catch {
        localStorage.removeItem(STORAGE_KEY_TYPE);
        localStorage.removeItem(STORAGE_KEY_KEY);
      }
    };

    tryReconnect();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restart polling whenever adapter changes
  useEffect(() => {
    if (adapter && publicKey) {
      stopPolling();
      startPolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  // ── Connect ────────────────────────────────────────────────────────────────

  const connect = useCallback(async (type: WalletType) => {
    try {
      const adpt = getAdapter(type);
      const available = await adpt.isAvailable();
      if (!available) {
        throw new Error(
          `${adpt.name} is not installed. Install it from: ${adpt.installUrl}`
        );
      }
      const address = await adpt.connect();
      const details = await adpt.getNetwork();

      localStorage.setItem(STORAGE_KEY_TYPE, type);
      localStorage.setItem(STORAGE_KEY_KEY,  address);

      setWalletType(type);
      setPublicKey(address);
      setNetwork(details);
      setError(null);
      startPolling();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect wallet");
    }
  }, [startPolling]);

  // ── Disconnect ─────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TYPE);
    localStorage.removeItem(STORAGE_KEY_KEY);
    setPublicKey(null);
    setNetwork(null);
    setWalletType(null);
    setError(null);
    stopPolling();
  }, [stopPolling]);

  // ── Switch wallet ──────────────────────────────────────────────────────────

  const switchWallet = useCallback(async (type: WalletType) => {
    disconnect();
    await connect(type);
  }, [connect, disconnect]);

  // ── Sign transaction ───────────────────────────────────────────────────────

  const signTx = useCallback(async (xdr: string): Promise<string> => {
    if (!adapter || !publicKey) throw new Error("Wallet not connected");
    return adapter.signTransaction(
      xdr,
      network?.networkPassphrase ?? "",
      publicKey
    );
  }, [adapter, publicKey, network]);

  // ── Clear error ────────────────────────────────────────────────────────────

  const clearError = useCallback(() => setError(null), []);

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        network,
        connected:  !!publicKey,
        walletType,
        adapter,
        adapters:   ALL_ADAPTERS,
        error,
        connect,
        disconnect,
        switchWallet,
        signTx,
        clearError,
        refreshNetwork,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
