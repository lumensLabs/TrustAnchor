import rateLimit from "express-rate-limit";

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
    message: { error: "Too many requests, please try again later." },
    ...options,
  });

export const globalRateLimiter = createRateLimiter(100);
export const strictRateLimiter = createRateLimiter(10, 45);
