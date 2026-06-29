"use client";

/**
 * components/WalletButton.tsx
 *
 * Wallet connection button with disconnect functionality.
 * Shows connection status and handles user interactions.
 */

import { useWallet } from "@/app/contexts/WalletContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { Button } from "@/app/components/global_ui/Button";

export function WalletButton() {
  const {
    isConnected,
    publicKey,
    isConnecting,
    error,
    connectorId,
    connect,
    disconnect,
  } = useWallet();
  const { login, logout } = useAuth();

  const handleDisconnect = async () => {
    await disconnect();
    await logout();
  };

  const handleConnect = async () => {
    await connect();

    const connectedPublicKey = localStorage.getItem("wallet_public_key");
    if (!connectedPublicKey) {
      return;
    }

    const sessionToken = `wallet:${connectedPublicKey}:${Date.now()}`;
    login(sessionToken, 60 * 60);
  };

  if (isConnected && publicKey) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-foreground/70">
          {publicKey.slice(0, 6)}...{publicKey.slice(-4)}
        </span>
        {connectorId && (
          <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary sm:inline">
            {connectorId}
          </span>
        )}
        <Button
          onClick={handleDisconnect}
          variant="secondary"
          size="sm"
          aria-label="Disconnect wallet"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        aria-label="Connect wallet"
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
