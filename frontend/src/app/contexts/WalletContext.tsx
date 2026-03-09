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

interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  isConnecting: boolean;
  error: string | null;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  clearError: () => void;
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
  });

  /**
   * Connect to Stellar wallet (Freighter, Albedo, etc.)
   */
  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Check for Freighter wallet
      const freighter = (window as Window & { freighter?: { isConnected: () => Promise<boolean>; requestAccess: () => Promise<string>; getPublicKey: () => Promise<string> } }).freighter;
      
      if (!freighter) {
        throw new Error("No Stellar wallet found. Please install Freighter wallet extension.");
      }

      // Check if Freighter is available
      const isFreighterAvailable = await freighter.isConnected();
      
      if (!isFreighterAvailable) {
        // Request connection
        const publicKey = await freighter.requestAccess();
        
        if (!publicKey) {
          throw new Error("Wallet connection was rejected");
        }

        setState({
          isConnected: true,
          publicKey,
          isConnecting: false,
          error: null,
        });

        // Store connection state in localStorage for persistence
        localStorage.setItem("wallet_connected", "true");
        localStorage.setItem("wallet_public_key", publicKey);
      } else {
        // Already connected, get public key
        const publicKey = await freighter.getPublicKey();
        
        setState({
          isConnected: true,
          publicKey,
          isConnecting: false,
          error: null,
        });

        localStorage.setItem("wallet_connected", "true");
        localStorage.setItem("wallet_public_key", publicKey);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect wallet";
      setState({
        isConnected: false,
        publicKey: null,
        isConnecting: false,
        error: errorMessage,
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
      // Always clear state
      setState({
        isConnected: false,
        publicKey: null,
        isConnecting: false,
        error: null,
      });

      // Clear localStorage
      localStorage.removeItem("wallet_connected");
      localStorage.removeItem("wallet_public_key");
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
      });
      localStorage.removeItem("wallet_connected");
      localStorage.removeItem("wallet_public_key");
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

    if (wasConnected && savedPublicKey) {
      const freighter = (window as Window & { freighter?: { isConnected: () => Promise<boolean>; requestAccess: () => Promise<string>; getPublicKey: () => Promise<string> } }).freighter;
      
      if (freighter) {
        // Verify wallet is still connected
        freighter.isConnected().then((isConnected: boolean) => {
          if (isConnected) {
            freighter.getPublicKey().then((publicKey: string) => {
              if (publicKey === savedPublicKey) {
                setState({
                  isConnected: true,
                  publicKey: savedPublicKey,
                  isConnecting: false,
                  error: null,
                });
              } else {
                // Different wallet connected, clear state
                localStorage.removeItem("wallet_connected");
                localStorage.removeItem("wallet_public_key");
              }
            }).catch(() => {
              // Error getting public key, clear state
              localStorage.removeItem("wallet_connected");
              localStorage.removeItem("wallet_public_key");
            });
          } else {
            // Wallet was disconnected externally, clear state
            localStorage.removeItem("wallet_connected");
            localStorage.removeItem("wallet_public_key");
          }
        }).catch(() => {
          // Error checking connection, clear state
          localStorage.removeItem("wallet_connected");
          localStorage.removeItem("wallet_public_key");
        });
      } else {
        // Freighter not available, clear state
        localStorage.removeItem("wallet_connected");
        localStorage.removeItem("wallet_public_key");
      }
    }
  }, []);

  const value: WalletContextValue = {
    ...state,
    connect,
    disconnect,
    clearError,
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
