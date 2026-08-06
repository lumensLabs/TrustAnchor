import rateLimit from "express-rate-limit";

/**
 * Parses a positive-integer env var, falling back to `fallback` when unset,
 * empty, or not a positive integer — so a misconfigured deployment degrades
 * to a safe known limit instead of an unlimited or NaN window.
 */
const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
): number => {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Builds an express-rate-limit middleware.
 *
 * Keying:
 *   The default key generator is used, which keys requests by the client IP
 *   (`req.ip`). For that IP to be the real client (and not the proxy/load
 *   balancer) behind a proxy, the app MUST configure `trust proxy` so Express
 *   derives `req.ip` from the `X-Forwarded-For` header. See `app.ts`.
 *
 * Headers:
 *   `standardHeaders` emits the IETF draft `RateLimit-*` headers so clients can
 *   see their remaining quota; the deprecated `X-RateLimit-*` headers are
 *   disabled.
 *
 * Response body:
 *   Matches the app-wide error envelope (`{ success: false, message }`) used
 *   by `errorHandler.ts`, so a 429 looks like every other error response.
 *
 * Store:
 *   This uses express-rate-limit's default in-memory store. That store is
 *   per-process, so counters are NOT shared across multiple backend instances:
 *   each instance enforces its own limit. This is acceptable for a
 *   single-instance deployment. To enforce a single global limit across
 *   horizontally-scaled instances, pass a shared `store` (e.g. a Redis-backed
 *   store) via `options`. Selecting a specific provider is intentionally left
 *   to the deployment and is out of scope here.
 */
export const createRateLimiter = (
  max: number,
  windowMinutes: number = 15,
  options: Partial<Parameters<typeof rateLimit>[0]> = {},
) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests, please try again later.",
    },
    ...options,
  });

// Env-configurable so limits can be tuned per deployment without a code
// change; falls back to these known-safe defaults when unset or invalid.
const GLOBAL_MAX = parsePositiveInt(process.env.RATE_LIMIT_MAX, 100);
const GLOBAL_WINDOW_MINUTES = parsePositiveInt(
  process.env.RATE_LIMIT_WINDOW_MINUTES,
  15,
);
const STRICT_MAX = parsePositiveInt(process.env.STRICT_RATE_LIMIT_MAX, 10);
const STRICT_WINDOW_MINUTES = parsePositiveInt(
  process.env.STRICT_RATE_LIMIT_WINDOW_MINUTES,
  45,
);
const AUTH_MAX = parsePositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 10);
const AUTH_WINDOW_MINUTES = parsePositiveInt(
  process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES,
  15,
);

export const globalRateLimiter = createRateLimiter(
  GLOBAL_MAX,
  GLOBAL_WINDOW_MINUTES,
);
export const strictRateLimiter = createRateLimiter(
  STRICT_MAX,
  STRICT_WINDOW_MINUTES,
);

// Separate instances (not `strictRateLimiter`) so brute-force attempts against
// one auth endpoint can't exhaust the other's quota, and so registration and
// login are throttled independently of unrelated sensitive endpoints (score
// updates, simulations) that also use `strictRateLimiter`.
export const registerRateLimiter = createRateLimiter(
  AUTH_MAX,
  AUTH_WINDOW_MINUTES,
);
export const loginRateLimiter = createRateLimiter(
  AUTH_MAX,
  AUTH_WINDOW_MINUTES,
);
