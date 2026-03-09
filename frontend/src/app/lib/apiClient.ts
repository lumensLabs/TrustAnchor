/**
 * lib/apiClient.ts
 *
 * Enhanced API client with automatic JWT handling and 401 error interception.
 * Automatically logs out users when tokens expire or become invalid.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
}

/**
 * Enhanced fetch wrapper with auth token injection and error handling
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { requiresAuth = false, headers, ...restOptions } = options;

  // Build headers
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Merge provided headers
  if (headers) {
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        requestHeaders[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        requestHeaders[key] = value;
      });
    } else {
      Object.entries(headers).forEach(([key, value]) => {
        requestHeaders[key] = value;
      });
    }
  }

  // Add auth token if required
  if (requiresAuth) {
    const token = localStorage.getItem("auth_token");
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
    });

    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      // Clear auth state
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_expires_at");
      localStorage.removeItem("wallet_connected");
      localStorage.removeItem("wallet_public_key");

      // Dispatch custom event for auth context to handle
      window.dispatchEvent(new CustomEvent("auth_session_expired"));

      throw new Error("Session expired. Please log in again.");
    }

    // Handle other error responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Request failed with status ${response.status}`
      );
    }

    // Parse and return response
    return await response.json();
  } catch (error) {
    // Re-throw for caller to handle
    throw error;
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T = unknown>(endpoint: string, options?: FetchOptions) =>
    apiClient<T>(endpoint, { ...options, method: "GET" }),

  post: <T = unknown>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = unknown>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = unknown>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = unknown>(endpoint: string, options?: FetchOptions) =>
    apiClient<T>(endpoint, { ...options, method: "DELETE" }),
};
