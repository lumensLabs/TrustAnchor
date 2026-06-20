/**
 * contexts/__tests__/WalletContext.test.tsx
 *
 * Tests for wallet connection and disconnection handling
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import {
  WalletProvider,
  useWallet,
  WALLET_STORAGE_KEYS,
  clearWalletStorage,
} from "../WalletContext";

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

// Mock wallet
const mockFreighter = {
  isConnected:   jest.fn(),
  requestAccess: jest.fn(),
  getPublicKey:  jest.fn(),
};

describe("WalletContext", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    (window as Window & { freighter?: typeof mockFreighter }).freighter =
      mockFreighter;
  });

  afterEach(() => {
    delete (window as Window & { freighter?: typeof mockFreighter }).freighter;
  });

  // ── Existing tests ────────────────────────────────────────────────────────

  it("should initialize with disconnected state", () => {
    const { result } = renderHook(() => useWallet(), { wrapper: WalletProvider });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
    expect(result.current.isConnecting).toBe(false);
  });

  it("should connect wallet successfully", async () => {
    mockFreighter.isConnected.mockResolvedValue(false);
    mockFreighter.requestAccess.mockResolvedValue("GTEST123");

    const { result } = renderHook(() => useWallet(), { wrapper: WalletProvider });

    await act(async () => { await result.current.connect(); });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.publicKey).toBe("GTEST123");
    expect(localStorageMock.getItem(WALLET_STORAGE_KEYS.WALLET_CONNECTED)).toBe("true");
    expect(localStorageMock.getItem(WALLET_STORAGE_KEYS.WALLET_PUBLIC_KEY)).toBe("GTEST123");
    // connector_id written on connect
    expect(localStorageMock.getItem(WALLET_STORAGE_KEYS.WALLET_CONNECTOR_ID)).toBeTruthy();
  });

  it("should handle wallet connection error", async () => {
    mockFreighter.isConnected.mockResolvedValue(false);
    mockFreighter.requestAccess.mockRejectedValue(new Error("User rejected"));

    const { result } = renderHook(() => useWallet(), { wrapper: WalletProvider });

    await act(async () => { await result.current.connect(); });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe("User rejected");
  });

  it("should disconnect wallet and clear ALL wallet keys including wallet_connector_id", async () => {
    mockFreighter.isConnected.mockResolvedValue(false);
    mockFreighter.requestAccess.mockResolvedValue("GTEST123");

    const { result } = renderHook(() => useWallet(), { wrapper: WalletProvider });

    await act(async () => { await result.current.connect(); });
    expect(result.current.isConnected).toBe(true);

    await act(async () => { await result.current.disconnect(); });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
    // All three wallet keys must be gone
    expect(localStorageMock.getItem(WALLET_STORAGE_KEYS.WALLET_CONNECTED)).toBeNull();
    expect(localStorageMock.getItem(WALLET_STORAGE_KEYS.WALLET_PUBLIC_KEY)).toBeNull();
    expect(localStorageMock.getItem(WALLET_STORAGE_KEYS.WALLET_CONNECTOR_ID)).toBeNull();
  });

  it("should handle wallet disconnection event and clear ALL wallet keys", async () => {
    mockFreighter.isConnected.mockResolvedValue(false);
    mockFreighter.requestAccess.mockResolvedValue("GTEST123");

    const { result } = renderHook(() => useWallet(), { wrapper: WalletProvider });

    await act(async () => { await result.current.connect(); });
    expect(result.current.isConnected).toBe(true);

    act(() => { window.dispatchEvent(new Event("wallet_disconnected")); });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
      expect(result.current.publicKey).toBeNull();
      // wallet_connector_id must also be cleared by the event handler
      expect(localStorageMock.getItem(WALLET_STORAGE_KEYS.WALLET_CONNECTOR_ID)).toBeNull();
    });
  });

  it("should restore connection from localStorage including connector_id", async () => {
    localStorageMock.setItem(WALLET_STORAGE_KEYS.WALLET_CONNECTED,    "true");
    localStorageMock.setItem(WALLET_STORAGE_KEYS.WALLET_PUBLIC_KEY,   "GTEST123");
    localStorageMock.setItem(WALLET_STORAGE_KEYS.WALLET_CONNECTOR_ID, "freighter");
    mockFreighter.isConnected.mockResolvedValue(true);
    mockFreighter.getPublicKey.mockResolvedValue("GTEST123");

    const { result } = renderHook(() => useWallet(), { wrapper: WalletProvider });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.publicKey).toBe("GTEST123");
    });
  });

  it("should clear ALL wallet keys if wallet is no longer connected on mount", async () => {
    localStorageMock.setItem(WALLET_STORAGE_KEYS.WALLET_CONNECTED,    "true");
    localStorageMock.setItem(WALLET_STORAGE_KEYS.WALLET_PUBLIC_KEY,   "GTEST123");
    localStorageMock.setItem(WALLET_STORAGE_KEYS.WALLET_CONNECTOR_ID, "freighter");
    mockFreighter.isConnected.mockResolvedValue(false);

    renderHook(() => useWallet(), { wrapper: WalletProvider });

    await waitFor(() => {
      expect(localStorageMock.getItem(WALLET_STORAGE_KEYS.WALLET_CONNECTED)).toBeNull();
      expect(localStorageMock.getItem(WALLET_STORAGE_KEYS.WALLET_PUBLIC_KEY)).toBeNull();
      expect(localStorageMock.getItem(WALLET_STORAGE_KEYS.WALLET_CONNECTOR_ID)).toBeNull();
    });
  });

  // ── New tests for issue #99 ───────────────────────────────────────────────

  describe("WALLET_STORAGE_KEYS", () => {
    it("contains exactly the three expected key strings", () => {
      expect(WALLET_STORAGE_KEYS.WALLET_CONNECTED).toBe("wallet_connected");
      expect(WALLET_STORAGE_KEYS.WALLET_PUBLIC_KEY).toBe("wallet_public_key");
      expect(WALLET_STORAGE_KEYS.WALLET_CONNECTOR_ID).toBe("wallet_connector_id");
    });
  });

  describe("clearWalletStorage (issue #99)", () => {
    it("removes all three wallet_ keys in one call", () => {
      localStorageMock.setItem(WALLET_STORAGE_KEYS.WALLET_CONNECTED,    "true");
      localStorageMock.setItem(WALLET_STORAGE_KEYS.WALLET_PUBLIC_KEY,   "GFAKE");
      localStorageMock.setItem(WALLET_STORAGE_KEYS.WALLET_CONNECTOR_ID, "freighter");

      clearWalletStorage();

      Object.values(WALLET_STORAGE_KEYS).forEach((key) => {
        expect(localStorageMock.getItem(key)).toBeNull();
      });
    });

    it("does not touch non-wallet keys like auth_token", () => {
      localStorageMock.setItem("auth_token",      "tok_abc");
      localStorageMock.setItem("auth_expires_at", "9999");
      localStorageMock.setItem(WALLET_STORAGE_KEYS.WALLET_CONNECTOR_ID, "freighter");

      clearWalletStorage();

      expect(localStorageMock.getItem("auth_token")).toBe("tok_abc");
      expect(localStorageMock.getItem("auth_expires_at")).toBe("9999");
      expect(localStorageMock.getItem(WALLET_STORAGE_KEYS.WALLET_CONNECTOR_ID)).toBeNull();
    });

    it("is safe to call when keys are already absent (idempotent)", () => {
      expect(() => clearWalletStorage()).not.toThrow();
      Object.values(WALLET_STORAGE_KEYS).forEach((key) => {
        expect(localStorageMock.getItem(key)).toBeNull();
      });
    });
  });
});