"use client";

/**
 * components/WalletButton.tsx
 *
 * Wallet connection button with disconnect functionality.
 * Shows connection status and handles user interactions.
 */

import { useState } from "react";
import { useWallet } from "@/app/contexts/WalletContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { Button } from "@/app/components/global_ui/Button";
import { isFreighterInstalled } from "@/app/lib/wallet/freighterConnector";

function ConnectWalletModal({
  isOpen,
  onClose,
  onConnect,
  isConnecting,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => Promise<void>;
  isConnecting: boolean;
  error: string | null;
}) {
  const installed = isFreighterInstalled();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Connect Stellar wallet"
        className="relative z-10 w-full max-w-md rounded-2xl border border-border/70 bg-surface p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Connect Wallet
            </h3>
            <p className="mt-1 text-sm text-foreground/70">
              To continue, install Freighter and connect your Stellar wallet.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-foreground/60 transition hover:bg-foreground/10 hover:text-foreground"
            aria-label="Close connect wallet modal"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div
            className={`rounded-xl border p-4 ${installed ? "border-emerald-500/30 bg-emerald-500/10" : "border-border/70 bg-surface-muted/50"}`}
          >
            <p className="text-sm font-medium text-foreground">
              1. Install Freighter
            </p>
            <p className="mt-1 text-sm text-foreground/70">
              {installed
                ? "Freighter detected in your browser."
                : "Freighter was not detected. Install the browser extension first."}
            </p>
            {!installed && (
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Open Freighter install page
              </a>
            )}
          </div>

          <div
            className={`rounded-xl border p-4 ${installed ? "border-border/70 bg-surface-muted/50" : "border-border/50 bg-surface-muted/30"}`}
          >
            <p className="text-sm font-medium text-foreground">
              2. Connect your wallet
            </p>
            <p className="mt-1 text-sm text-foreground/70">
              Authorize TrustAnchor in Freighter to proceed.
            </p>
            <div className="mt-3">
              <Button onClick={onConnect} disabled={isConnecting || !installed}>
                {isConnecting ? "Connecting..." : "Connect with Freighter"}
              </Button>
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

export function WalletButton() {
  const {
    isConnected,
    publicKey,
    isConnecting,
    error,
    connectorId,
    connect,
    disconnect,
    clearError,
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
