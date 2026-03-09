"use client";

/**
 * app/dashboard/page.tsx
 *
 * Example protected dashboard page demonstrating wallet and auth integration.
 * This page is protected by AuthGuard and requires both wallet connection and authentication.
 */

import { AuthGuard } from "@/app/components/AuthGuard";
import { useSession } from "@/app/hooks/useSession";
import { WalletButton } from "@/app/components/WalletButton";

function DashboardContent() {
  const { wallet, auth, isFullyAuthenticated } = useSession();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            RemitLend Dashboard
          </h1>
          <WalletButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
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
                    {wallet.publicKey.slice(0, 8)}...{wallet.publicKey.slice(-8)}
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

          {/* Example protected content */}
          <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
              Your Loans
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              This section would display user-specific loan data.
              Access is protected by wallet connection and JWT authentication.
            </p>
          </div>
        </div>
      </main>
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
