"use client";

/**
 * app/dashboard/page.tsx
 *
 * Example protected dashboard page demonstrating wallet and auth integration.
 * This page is protected by AuthGuard and requires both wallet connection and authentication.
 */

import { AuthGuard } from "@/app/components/AuthGuard";
import { useSession } from "@/app/hooks/useSession";

function DashboardContent() {
  const { wallet, auth, isFullyAuthenticated } = useSession();

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 font-heading text-3xl font-semibold tracking-tight">
          RemitLend Dashboard
        </h1>
        <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
              Session Information
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Wallet Status:
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {wallet.isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>

              {wallet.publicKey && (
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Public Key:
                  </span>
                  <span className="font-mono text-xs text-zinc-900 dark:text-zinc-50">
                    {wallet.publicKey.slice(0, 8)}...
                    {wallet.publicKey.slice(-8)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Authentication:
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {auth.isAuthenticated ? "Authenticated" : "Not Authenticated"}
                </span>
              </div>

              {auth.expiresAt && (
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Session Expires:
                  </span>
                  <span className="text-xs text-zinc-900 dark:text-zinc-50">
                    {new Date(auth.expiresAt).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Full Access:
                </span>
                <span
                  className={`font-medium ${
                    isFullyAuthenticated
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {isFullyAuthenticated ? "Granted" : "Denied"}
                </span>
              </div>
            </div>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Your Loans
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            This section would display user-specific loan data. Access is
            protected by wallet connection and JWT authentication.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard requireWallet={true}>
      <DashboardContent />
    </AuthGuard>
  );
}
