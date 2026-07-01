/**
 * hooks/useApi.ts
 *
 * Custom hooks for data fetching using TanStack Query.
 * Each hook wraps a specific API endpoint with caching,
 * loading states, and error handling built in.
 *
 * Base URL is read from NEXT_PUBLIC_API_URL environment variable.
 * All paths are prefixed with /api to match the Express backend mount.
 *
 * Backend endpoints (from backend/src/app.ts):
 *   GET  /api/score/:userId       — credit score lookup
 *   POST /api/score/update        — update score (requires API key)
 *   GET  /api/history/:userId     — remittance history
 *   POST /api/simulate            — simulate a payment
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Query key factory ────────────────────────────────────────────────────────

/**
 * Centralised query key factory.
 * Using structured keys makes targeted cache invalidation easy.
 */
export const queryKeys = {
  score: {
    detail: (userId: string) => ["score", userId] as const,
  },
  history: {
    detail: (userId: string) => ["history", userId] as const,
  },
} as const;

// ─── Base fetch helper ────────────────────────────────────────────────────────

/**
 * Thin fetch wrapper that:
 * - Prepends the API base URL
 * - Sets JSON Content-Type
 * - Throws a descriptive error on non-2xx responses
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      error.message ?? `Request failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreditScore {
  success: boolean;
  userId: string;
  score: number;
  band: string;
  factors: {
    repaymentHistory: string;
    latePaymentPenalty: string;
    range: string;
  };
}

export interface HistoryEntry {
  month: string;
  amount: number;
  status: string;
}

export interface RemittanceHistory {
  userId: string;
  score: number;
  streak: number;
  history: HistoryEntry[];
}

export interface SimulatePaymentInput {
  userId: string;
  amount: number;
}

export interface SimulatePaymentResult {
  success: boolean;
  message: string;
  newScore: number;
}

// ─── Score hooks ──────────────────────────────────────────────────────────────

/**
 * Fetches a user's credit score from /api/score/:userId.
 * Only runs when a valid userId is provided.
 */
export function useScore(
  userId: string | undefined,
  options?: Omit<UseQueryOptions<CreditScore>, "queryKey" | "queryFn">,
) {
  return useQuery<CreditScore>({
    queryKey: queryKeys.score.detail(userId ?? ""),
    queryFn: () => apiFetch<CreditScore>(`/api/score/${userId}`),
    enabled: !!userId,
    ...options,
  });
}

// ─── Remittance history hooks ─────────────────────────────────────────────────

/**
 * Fetches a user's remittance history from /api/history/:userId.
 * Returns history, credit score, and streak.
 */
export function useHistory(
  userId: string | undefined,
  options?: Omit<UseQueryOptions<RemittanceHistory>, "queryKey" | "queryFn">,
) {
  return useQuery<RemittanceHistory>({
    queryKey: queryKeys.history.detail(userId ?? ""),
    queryFn: () => apiFetch<RemittanceHistory>(`/api/history/${userId}`),
    enabled: !!userId,
    ...options,
  });
}

// ─── Simulation hooks ─────────────────────────────────────────────────────────

/**
 * Simulates a payment via POST /api/simulate.
 * Returns the simulated outcome and new score.
 */
export function useSimulatePayment(
  options?: UseMutationOptions<
    SimulatePaymentResult,
    Error,
    SimulatePaymentInput
  >,
) {
  const queryClient = useQueryClient();

  return useMutation<SimulatePaymentResult, Error, SimulatePaymentInput>({
    mutationFn: (data) =>
      apiFetch<SimulatePaymentResult>("/api/simulate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      // Invalidate the user's history and score caches after simulation
      queryClient.invalidateQueries({
        queryKey: queryKeys.history.detail(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.score.detail(variables.userId),
      });
    },
    ...options,
  });
}
