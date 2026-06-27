/**
 * Parses the `TRUST_PROXY` environment variable into a value accepted by
 * Express's `app.set("trust proxy", ...)`.
 *
 * Why this matters:
 *   Behind a reverse proxy / load balancer (e.g. the Docker proxy or a cloud
 *   LB), the socket address Express sees is the proxy's, not the client's. With
 *   `trust proxy` configured, Express derives `req.ip` from the
 *   `X-Forwarded-For` header instead, so per-IP rate limiting keys on the real
 *   client rather than putting every client into one shared bucket.
 *
 * Accepted values (case-insensitive):
 *   - unset / empty  -> `false` (no proxy trusted; the safe default for direct,
 *                        non-proxied deployments)
 *   - "true"         -> `true`  (trust all proxies — convenient but permissive;
 *                        prefer a hop count instead)
 *   - "false"        -> `false`
 *   - a number, e.g. "1"   -> trust that many hops closest to the app. This is
 *                        the recommended setting behind a single proxy/LB.
 *   - anything else, e.g. "loopback, 10.0.0.0/8" -> passed through verbatim so
 *                        Express can interpret it as a subnet / preset list.
 */
export const parseTrustProxy = (
  value: string | undefined,
): boolean | number | string => {
  if (value === undefined) return false;

  const trimmed = value.trim();
  if (trimmed === "") return false;

  const lower = trimmed.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;

  const asNumber = Number(trimmed);
  if (Number.isInteger(asNumber) && asNumber >= 0) return asNumber;

  return trimmed;
};
