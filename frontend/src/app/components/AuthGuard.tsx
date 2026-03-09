"use client";

/**
 * components/AuthGuard.tsx
 *
 * Route protection component that redirects unauthenticated users.
 * Wrap protected pages with this component to enforce authentication.
 */

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { useWallet } from "@/app/contexts/WalletContext";
import { Spinner } from "@/app/components/global_ui/Spinner";

interface AuthGuardProps {
  children: ReactNode;
  requireWallet?: boolean;
}

export function AuthGuard({ children, requireWallet = true }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isTokenExpired } = useAuth();
  const { isConnected } = useWallet();

  useEffect(() => {
    // Check if token is expired
    if (isAuthenticated && isTokenExpired()) {
      router.push("/");
      return;
    }

    // Check if authentication is required
    if (!isAuthenticated) {
      router.push("/");
      return;
    }

    // Check if wallet connection is required
    if (requireWallet && !isConnected) {
      router.push("/");
      return;
    }
  }, [isAuthenticated, isConnected, requireWallet, isTokenExpired, router]);

  // Show loading state while checking auth
  if (!isAuthenticated || (requireWallet && !isConnected)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner type="spin" />
      </div>
    );
  }

  return <>{children}</>;
}
