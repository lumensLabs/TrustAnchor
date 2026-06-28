import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useScore,
  useHistory,
  useSimulatePayment,
  queryKeys,
  type CreditScore,
  type RemittanceHistory,
  type SimulatePaymentResult,
} from "../hooks/useApi";

// ─── Test setup ───────────────────────────────────────────────────────────────

const API_URL = "http://localhost:3001";
const mockUserId = "user-123";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── Query key factory ────────────────────────────────────────────────────────

describe("queryKeys", () => {
  it("score.detail returns correct key", () => {
    expect(queryKeys.score.detail("abc")).toEqual(["score", "abc"]);
  });

  it("history.detail returns correct key", () => {
    expect(queryKeys.history.detail("abc")).toEqual(["history", "abc"]);
  });
});

// ─── useScore ─────────────────────────────────────────────────────────────────

describe("useScore", () => {
  const mockResponse: CreditScore = {
    success: true,
    userId: mockUserId,
    score: 720,
    band: "Good",
    factors: {
      repaymentHistory: "On-time payments increase score by 15 pts each",
      latePaymentPenalty: "Late payments decrease score by 30 pts each",
      range: "500 (Poor) – 850 (Excellent)",
    },
  };

  it("fetches score when userId is provided", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useScore(mockUserId), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}/api/score/${mockUserId}`,
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
  });

  it("does not fetch when userId is undefined", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useScore(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns error on non-ok response", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: "User not found" }),
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useScore(mockUserId), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("User not found");
  });
});

// ─── useHistory ───────────────────────────────────────────────────────────────

describe("useHistory", () => {
  const mockResponse: RemittanceHistory = {
    userId: mockUserId,
    score: 750,
    streak: 3,
    history: [
      { month: "January", amount: 500, status: "Completed" },
      { month: "February", amount: 500, status: "Completed" },
      { month: "March", amount: 500, status: "Completed" },
    ],
  };

  it("fetches history when userId is provided", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useHistory(mockUserId), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}/api/history/${mockUserId}`,
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
  });

  it("does not fetch when userId is undefined", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useHistory(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("handles empty history array", async () => {
    const emptyResponse: RemittanceHistory = {
      userId: mockUserId,
      score: 600,
      streak: 0,
      history: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => emptyResponse,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useHistory(mockUserId), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.history).toEqual([]);
    expect(result.current.data?.streak).toBe(0);
  });
});

// ─── useSimulatePayment ──────────────────────────────────────────────────────

describe("useSimulatePayment", () => {
  const mockResponse: SimulatePaymentResult = {
    success: true,
    message: "Payment of 500 for user user-123 simulated.",
    newScore: 760,
  };

  it("sends POST to /api/simulate with correct body", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSimulatePayment(), { wrapper });

    await act(async () => {
      result.current.mutate({ userId: mockUserId, amount: 500 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}/api/simulate`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userId: mockUserId, amount: 500 }),
      }),
    );
  });

  it("returns error on failed simulation", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: "Invalid input" }),
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSimulatePayment(), { wrapper });

    await act(async () => {
      result.current.mutate({ userId: mockUserId, amount: -100 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Invalid input");
  });
});
