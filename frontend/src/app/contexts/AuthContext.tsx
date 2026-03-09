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
const REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh 5 minutes before expiry

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const { disconnect: disconnectWallet } = useWallet();
  
  const [state, setState] = useState<AuthState>({
    token: null,
    isAuthenticated: false,
    expiresAt: null,
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
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${state.token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const data = await response.json();
      login(data.token, data.expiresIn);
      return true;
    } catch (err) {
      console.error("Failed to refresh token:", err);
      await logout();
      return false;
    }
  }, [state.token, login, logout]);

  /**
   * Restore auth state from localStorage on mount
   */
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedExpiresAt = localStorage.getItem(EXPIRES_AT_KEY);

    if (storedToken && storedExpiresAt) {
      const expiresAt = parseInt(storedExpiresAt, 10);
      
      // Check if token is still valid
      if (Date.now() < expiresAt) {
        setState({
          token: storedToken,
          isAuthenticated: true,
          expiresAt,
        });
      } else {
        // Token expired, clear storage
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EXPIRES_AT_KEY);
      }
    }
  }, []);

  /**
   * Monitor token expiration and auto-refresh or logout
   */
  useEffect(() => {
    if (!state.isAuthenticated || !state.expiresAt) return;

    const checkExpiration = () => {
      const timeUntilExpiry = state.expiresAt! - Date.now();

      if (timeUntilExpiry <= 0) {
        // Token expired, logout immediately
        logout();
      } else if (timeUntilExpiry <= REFRESH_THRESHOLD) {
        // Token expiring soon, attempt refresh
        refreshToken();
      }
    };

    // Check immediately
    checkExpiration();

    // Check every minute
    const interval = setInterval(checkExpiration, 60 * 1000);

    return () => clearInterval(interval);
  }, [state.isAuthenticated, state.expiresAt, logout, refreshToken]);

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
    return () => window.removeEventListener("auth_session_expired", handleSessionExpired);
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
