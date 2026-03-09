/**
 * hooks/useSession.ts
 *
 * Combined hook for wallet and authentication state.
 * Provides a unified interface for session management.
 */

import { useWallet } from "@/app/contexts/WalletContext";
import { useAuth } from "@/app/contexts/AuthContext";

export function useSession() {
  const wallet = useWallet();
  const auth = useAuth();

  const isFullyAuthenticated = wallet.isConnected && auth.isAuthenticated;

  const handleFullLogout = async () => {
    await wallet.disconnect();
    await auth.logout();
  };

  return {
    // Wallet state
    wallet: {
      isConnected: wallet.isConnected,
      publicKey: wallet.publicKey,
      isConnecting: wallet.isConnecting,
      error: wallet.error,
      connect: wallet.connect,
      disconnect: wallet.disconnect,
      clearError: wallet.clearError,
    },
    // Auth state
    auth: {
      token: auth.token,
      isAuthenticated: auth.isAuthenticated,
      expiresAt: auth.expiresAt,
      login: auth.login,
      logout: auth.logout,
      refreshToken: auth.refreshToken,
      isTokenExpired: auth.isTokenExpired,
    },
    // Combined state
    isFullyAuthenticated,
    logout: handleFullLogout,
  };
}
