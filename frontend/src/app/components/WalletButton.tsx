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
  const { isConnected, publicKey, isConnecting, error, connect, disconnect } =
    useWallet();
  const { logout } = useAuth();

  const handleDisconnect = async () => {
    await disconnect();
    await logout();
  };

  if (isConnected && publicKey) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {publicKey.slice(0, 6)}...{publicKey.slice(-4)}
        </span>
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
        onClick={connect}
        disabled={isConnecting}
        aria-label="Connect wallet"
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
      {error && (
        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
