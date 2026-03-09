/**
 * contexts/__tests__/WalletContext.test.tsx
 *
 * Tests for wallet connection and disconnection handling
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { WalletProvider, useWallet } from "../WalletContext";

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

// Mock wallet
const mockFreighter = {
  isConnected: jest.fn(),
  requestAccess: jest.fn(),
  getPublicKey: jest.fn(),
};

describe("WalletContext", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    (window as Window & { freighter?: typeof mockFreighter }).freighter = mockFreighter;
  });

  afterEach(() => {
    delete (window as Window & { freighter?: typeof mockFreighter }).freighter;
  });

  it("should initialize with disconnected state", () => {
    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
    expect(result.current.isConnecting).toBe(false);
  });

  it("should connect wallet successfully", async () => {
    mockFreighter.isConnected.mockResolvedValue(false);
    mockFreighter.requestAccess.mockResolvedValue("GTEST123");

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.publicKey).toBe("GTEST123");
    expect(localStorageMock.getItem("wallet_connected")).toBe("true");
    expect(localStorageMock.getItem("wallet_public_key")).toBe("GTEST123");
  });

  it("should handle wallet connection error", async () => {
    mockFreighter.isConnected.mockResolvedValue(false);
    mockFreighter.requestAccess.mockRejectedValue(new Error("User rejected"));

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe("User rejected");
  });

  it("should disconnect wallet and clear state", async () => {
    mockFreighter.isConnected.mockResolvedValue(false);
    mockFreighter.requestAccess.mockResolvedValue("GTEST123");

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    // Connect first
    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);

    // Disconnect
    await act(async () => {
      await result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
    expect(localStorageMock.getItem("wallet_connected")).toBeNull();
    expect(localStorageMock.getItem("wallet_public_key")).toBeNull();
  });

  it("should handle wallet disconnection event", async () => {
    mockFreighter.isConnected.mockResolvedValue(false);
    mockFreighter.requestAccess.mockResolvedValue("GTEST123");

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    // Connect first
    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);

    // Simulate wallet disconnection event
    act(() => {
      window.dispatchEvent(new Event("wallet_disconnected"));
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
      expect(result.current.publicKey).toBeNull();
    });
  });

  it("should restore connection from localStorage", async () => {
    localStorageMock.setItem("wallet_connected", "true");
    localStorageMock.setItem("wallet_public_key", "GTEST123");
    mockFreighter.isConnected.mockResolvedValue(true);
    mockFreighter.getPublicKey.mockResolvedValue("GTEST123");

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.publicKey).toBe("GTEST123");
    });
  });

  it("should clear localStorage if wallet is no longer connected", async () => {
    localStorageMock.setItem("wallet_connected", "true");
    localStorageMock.setItem("wallet_public_key", "GTEST123");
    mockFreighter.isConnected.mockResolvedValue(false);

    renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    await waitFor(() => {
      expect(localStorageMock.getItem("wallet_connected")).toBeNull();
    });
  });
});
