"use client";

/**
 * contexts/WalletContext.tsx
 *
 * Manages Stellar wallet connection state and provides wallet operations.
 * Handles wallet disconnection events and clears state appropriately.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  freighterConnector,
  sorobanConnectors,
  type WalletConnector,
} from "@/app/lib/wallet/freighterConnector";

// ── Centralised storage keys ──────────────────────────────────────────────────
// Single source of truth for all wallet localStorage keys.
// Imported by apiClient.ts so the two can never drift apart.
export const WALLET_STORAGE_KEYS = {
  WALLET_CONNECTED:    "wallet_connected",
  WALLET_PUBLIC_KEY:   "wallet_public_key",
  WALLET_CONNECTOR_ID: "wallet_connector_id",
} as const;

/**
 * Removes every wallet key from localStorage in one call.
 * Exported so apiClient can delegate cleanup here instead of
 * maintaining its own (incomplete) list of keys.
 */
export function clearWalletStorage(): void {
  Object.values(WALLET_STORAGE_KEYS).forEach((key) =>
    localStorage.removeItem(key)
  );
}
// ─────────────────────────────────────────────────────────────────────────────

interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  isConnecting: boolean;
  error: string | null;
  connectorId: WalletConnector["id"] | null;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  clearError: () => void;
  availableWallets: readonly WalletConnector[];
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    publicKey: null,
    isConnecting: false,
    error: null,
    connectorId: null,
  });

  /**
   * Connect to Stellar wallet (Freighter, Albedo, etc.)
   */
  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const isAlreadyConnected = await freighterConnector.isConnected();
      const publicKey = isAlreadyConnected
        ? await freighterConnector.getPublicKey()
        : await freighterConnector.connect();

      setState({
        isConnected: true,
        publicKey,
        isConnecting: false,
        error: null,
        connectorId: freighterConnector.id,
      });

      // Use constants — never hardcode key strings
      localStorage.setItem(WALLET_STORAGE_KEYS.WALLET_CONNECTED,    "true");
      localStorage.setItem(WALLET_STORAGE_KEYS.WALLET_PUBLIC_KEY,   publicKey);
      localStorage.setItem(WALLET_STORAGE_KEYS.WALLET_CONNECTOR_ID, freighterConnector.id);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to connect wallet";
      setState({
        isConnected: false,
        publicKey: null,
        isConnecting: false,
        error: errorMessage,
        connectorId: null,
      });
    }
  }, []);

  /**
   * Disconnect wallet and clear all state
   */
  const disconnect = useCallback(async () => {
    try {
      // Freighter doesn't have a disconnect method, just clear local state.
      // User can disconnect from the extension itself.
    } catch (err) {
      console.error("Error disconnecting wallet:", err);
    } finally {
      setState({
        isConnected: false,
        publicKey: null,
        isConnecting: false,
        error: null,
        connectorId: null,
      });
      // Centralised helper — clears wallet_connected, wallet_public_key,
      // AND wallet_connector_id in one place
      clearWalletStorage();
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Listen for wallet disconnection events.
   * Stellar wallets emit events when user disconnects from extension.
   */
  useEffect(() => {
    const handleWalletDisconnect = () => {
      setState({
        isConnected: false,
        publicKey: null,
        isConnecting: false,
        error: "Wallet disconnected",
        connectorId: null,
      });
      // Centralised helper — all three keys cleared
      clearWalletStorage();
    };

    window.addEventListener("wallet_disconnected", handleWalletDisconnect);
    return () => {
      window.removeEventListener("wallet_disconnected", handleWalletDisconnect);
    };
  }, []);

  /**
   * Restore wallet connection on mount if previously connected
   */
  useEffect(() => {
    const wasConnected =
      localStorage.getItem(WALLET_STORAGE_KEYS.WALLET_CONNECTED) === "true";
    const savedPublicKey =
      localStorage.getItem(WALLET_STORAGE_KEYS.WALLET_PUBLIC_KEY);
    const connectorId =
      localStorage.getItem(WALLET_STORAGE_KEYS.WALLET_CONNECTOR_ID);

    if (!wasConnected || !savedPublicKey) return;

    if (connectorId && connectorId !== freighterConnector.id) {
      clearWalletStorage();
      return;
    }

    freighterConnector
      .isConnected()
      .then((isConnected) => {
        if (!isConnected) {
          clearWalletStorage();
          return;
        }
        return freighterConnector.getPublicKey().then((publicKey) => {
          if (publicKey !== savedPublicKey) {
            clearWalletStorage();
            return;
          }
          setState({
            isConnected: true,
            publicKey: savedPublicKey,
            isConnecting: false,
            error: null,
            connectorId: freighterConnector.id,
          });
        });
      })
      .catch(clearWalletStorage);
  }, []);

  const value: WalletContextValue = {
    ...state,
    connect,
    disconnect,
    clearError,
    availableWallets: sorobanConnectors,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}