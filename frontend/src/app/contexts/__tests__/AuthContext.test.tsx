/**
 * contexts/__tests__/AuthContext.test.tsx
 *
 * Tests for JWT authentication and session expiry handling
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import { WalletProvider } from "../WalletContext";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WalletProvider>
    <AuthProvider>{children}</AuthProvider>
  </WalletProvider>
);

describe("AuthContext", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  it("should initialize with unauthenticated state", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
  });

  it("should login and store token", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login("test-token", 3600);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe("test-token");
    expect(localStorageMock.getItem("auth_token")).toBe("test-token");
  });

  it("should logout and clear state", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Login first
    act(() => {
      result.current.login("test-token", 3600);
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Logout
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
    expect(localStorageMock.getItem("auth_token")).toBeNull();
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("should detect expired token", () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Login with token that expires in 1 second
    act(() => {
      result.current.login("test-token", 1);
    });

    expect(result.current.isTokenExpired()).toBe(false);

    // Wait for expiration
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.isTokenExpired()).toBe(true);
    
    jest.useRealTimers();
  });

  it("should restore auth state from localStorage", () => {
    const expiresAt = Date.now() + 3600000;
    localStorageMock.setItem("auth_token", "stored-token");
    localStorageMock.setItem("auth_expires_at", expiresAt.toString());

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe("stored-token");
  });

  it("should not restore expired token from localStorage", () => {
    const expiresAt = Date.now() - 1000; // Expired
    localStorageMock.setItem("auth_token", "expired-token");
    localStorageMock.setItem("auth_expires_at", expiresAt.toString());

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorageMock.getItem("auth_token")).toBeNull();
  });

  it("should refresh token successfully", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ token: "new-token", expiresIn: 3600 }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login("old-token", 3600);
    });

    let refreshResult: boolean = false;
    await act(async () => {
      refreshResult = await result.current.refreshToken();
    });

    expect(refreshResult).toBe(true);
    expect(result.current.token).toBe("new-token");
  });

  it("should logout on failed token refresh", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login("old-token", 3600);
    });

    let refreshResult: boolean = true;
    await act(async () => {
      refreshResult = await result.current.refreshToken();
    });

    expect(refreshResult).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("should handle session expiry event", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login("test-token", 3600);
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Dispatch session expired event
    await act(async () => {
      window.dispatchEvent(new CustomEvent("auth_session_expired"));
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });
});
