/**
 * contexts/__tests__/AuthContext.test.tsx
 *
 * Tests for JWT authentication and session expiry handling
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import { WalletProvider, WALLET_STORAGE_KEYS } from "../WalletContext";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:    (key: string) => store[key] ?? null,
    setItem:    (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear:      () => { store = {}; },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

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

  // ── Existing tests ────────────────────────────────────────────────────────

  it("should initialize with unauthenticated state", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
  });

  it("should login and store token", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => { result.current.login("test-token", 3600); });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe("test-token");
    expect(localStorageMock.getItem("auth_token")).toBe("test-token");
  });

  it("should logout and clear state", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => { result.current.login("test-token", 3600); });
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => { await result.current.logout(); });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
    expect(localStorageMock.getItem("auth_token")).toBeNull();
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("should detect expired token", () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => { result.current.login("test-token", 1); });
    expect(result.current.isTokenExpired()).toBe(false);

    act(() => { jest.advanceTimersByTime(2000); });
    expect(result.current.isTokenExpired()).toBe(true);

    jest.useRealTimers();
  });

  it("should restore auth state from localStorage", () => {
    const expiresAt = Date.now() + 3600000;
    localStorageMock.setItem("auth_token",      "stored-token");
    localStorageMock.setItem("auth_expires_at", expiresAt.toString());

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe("stored-token");
  });

  it("should not restore expired token from localStorage", () => {
    const expiresAt = Date.now() - 1000;
    localStorageMock.setItem("auth_token",      "expired-token");
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

    act(() => { result.current.login("old-token", 3600); });

    let refreshResult = false;
    await act(async () => { refreshResult = await result.current.refreshToken(); });

    expect(refreshResult).toBe(true);
    expect(result.current.token).toBe("new-token");
  });

  it("should logout on failed token refresh", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => { result.current.login("old-token", 3600); });

    let refreshResult = true;
    await act(async () => { refreshResult = await result.current.refreshToken(); });

    expect(refreshResult).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("should handle session expiry event and clear ALL wallet keys including wallet_connector_id", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => { result.current.login("test-token", 3600); });

    // Seed all wallet keys — simulates state after a normal wallet connect
    localStorageMock.setItem(WALLET_STORAGE_KEYS.WALLET_CONNECTED,    "true");
    localStorageMock.setItem(WALLET_STORAGE_KEYS.WALLET_PUBLIC_KEY,   "GFAKE123");
    localStorageMock.setItem(WALLET_STORAGE_KEYS.WALLET_CONNECTOR_ID, "freighter");

    expect(result.current.isAuthenticated).toBe(true);

    // apiClient dispatches this on 401
    await act(async () => {
      window.dispatchEvent(new CustomEvent("auth_session_expired"));
    });

    await waitFor(() => {
      // Auth cleared
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockPush).toHaveBeenCalledWith("/");

      // All wallet keys cleared — wallet_connector_id must not survive
      expect(localStorageMock.getItem(WALLET_STORAGE_KEYS.WALLET_CONNECTED)).toBeNull();
      expect(localStorageMock.getItem(WALLET_STORAGE_KEYS.WALLET_PUBLIC_KEY)).toBeNull();
      expect(localStorageMock.getItem(WALLET_STORAGE_KEYS.WALLET_CONNECTOR_ID)).toBeNull();
    });
  });
});