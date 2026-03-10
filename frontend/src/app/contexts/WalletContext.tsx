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

      localStorage.setItem("wallet_connected", "true");
      localStorage.setItem("wallet_public_key", publicKey);
      localStorage.setItem("wallet_connector_id", freighterConnector.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect wallet";
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
      // Freighter doesn't have a disconnect method, just clear local state
      // User can disconnect from the extension itself
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

      localStorage.removeItem("wallet_connected");
      localStorage.removeItem("wallet_public_key");
      localStorage.removeItem("wallet_connector_id");
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Listen for wallet disconnection events
   * Stellar wallets emit events when user disconnects from extension
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
      localStorage.removeItem("wallet_connected");
      localStorage.removeItem("wallet_public_key");
      localStorage.removeItem("wallet_connector_id");
    };

    // Listen for wallet events
    window.addEventListener("wallet_disconnected", handleWalletDisconnect);

    return () => {
      window.removeEventListener("wallet_disconnected", handleWalletDisconnect);
    };
  }, []);

  /**
   * Restore wallet connection on mount if previously connected
   */
  useEffect(() => {
    const wasConnected = localStorage.getItem("wallet_connected") === "true";
    const savedPublicKey = localStorage.getItem("wallet_public_key");
    const connectorId = localStorage.getItem("wallet_connector_id");

    const clearPersistedWallet = () => {
      localStorage.removeItem("wallet_connected");
      localStorage.removeItem("wallet_public_key");
      localStorage.removeItem("wallet_connector_id");
    };

    if (!wasConnected || !savedPublicKey) {
      return;
    }

    if (connectorId && connectorId !== freighterConnector.id) {
      clearPersistedWallet();
      return;
    }

    freighterConnector
      .isConnected()
      .then((isConnected) => {
        if (!isConnected) {
          clearPersistedWallet();
          return;
        }

        return freighterConnector.getPublicKey().then((publicKey) => {
          if (publicKey !== savedPublicKey) {
            clearPersistedWallet();
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
      .catch(clearPersistedWallet);
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

/**
 * Hook to access wallet context
 * Throws error if used outside WalletProvider
 */
export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  
  return context;
}
