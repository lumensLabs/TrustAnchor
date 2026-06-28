"use client";

/**
 * contexts/AuthContext.tsx
 *
 * Manages JWT authentication state and handles session expiry.
 * Automatically clears state and redirects on token expiration.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "./WalletContext";

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  expiresAt: number | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string, expiresIn: number) => void;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  isTokenExpired: () => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const TOKEN_KEY = "auth_token";
const EXPIRES_AT_KEY = "auth_expires_at";

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const { disconnect: disconnectWallet } = useWallet();

  const [state, setState] = useState<AuthState>(() => {
    if (typeof window === "undefined") {
      return {
        token: null,
        isAuthenticated: false,
        expiresAt: null,
      };
    }

    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedExpiresAt = localStorage.getItem(EXPIRES_AT_KEY);

    if (storedToken && storedExpiresAt) {
      const expiresAt = parseInt(storedExpiresAt, 10);
      if (Date.now() < expiresAt) {
        return {
          token: storedToken,
          isAuthenticated: true,
          expiresAt,
        };
      }

      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRES_AT_KEY);
    }

    return {
      token: null,
      isAuthenticated: false,
      expiresAt: null,
    };
  });

  /**
   * Check if current token is expired
   */
  const isTokenExpired = useCallback((): boolean => {
    if (!state.expiresAt) return true;
    return Date.now() >= state.expiresAt;
  }, [state.expiresAt]);

  /**
   * Store JWT token and expiration time
   */
  const login = useCallback((token: string, expiresIn: number) => {
    const expiresAt = Date.now() + expiresIn * 1000;

    setState({
      token,
      isAuthenticated: true,
      expiresAt,
    });

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EXPIRES_AT_KEY, expiresAt.toString());
  }, []);

  /**
   * Clear authentication state and redirect to home
   */
  const logout = useCallback(async () => {
    // Clear auth state
    setState({
      token: null,
      isAuthenticated: false,
      expiresAt: null,
    });

    // Clear localStorage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);

    // Disconnect wallet
    await disconnectWallet();

    // Redirect to home page
    router.push("/");
  }, [disconnectWallet, router]);

  /**
   * Attempt to refresh the JWT token
   * Returns true if successful, false otherwise
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!state.token || isTokenExpired()) {
      await logout();
      return false;
    }

    return true;
  }, [state.token, isTokenExpired, logout]);

  /**
   * Monitor token expiration and logout when expired.
   * No refresh call is attempted because backend refresh endpoint is not implemented.
   */
  useEffect(() => {
    if (!state.isAuthenticated || !state.expiresAt) return;

    const checkExpiration = () => {
      if (Date.now() >= state.expiresAt!) {
        logout();
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 60 * 1000);

    return () => clearInterval(interval);
  }, [state.isAuthenticated, state.expiresAt, logout]);

  /**
   * Listen for storage events (logout in another tab)
   */
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && !e.newValue) {
        // Token was removed in another tab, logout here too
        setState({
          token: null,
          isAuthenticated: false,
          expiresAt: null,
        });
        disconnectWallet();
        router.push("/");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [disconnectWallet, router]);

  /**
   * Listen for session expiry events from API client
   */
  useEffect(() => {
    const handleSessionExpired = () => {
      logout();
    };

    window.addEventListener("auth_session_expired", handleSessionExpired);
    return () =>
      window.removeEventListener("auth_session_expired", handleSessionExpired);
  }, [logout]);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    refreshToken,
    isTokenExpired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 * Throws error if used outside AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
