import express from "express";
import request from "supertest";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { parseTrustProxy } from "../config/trustProxy.js";

/**
 * Builds a minimal app with a low rate limit so the limiter can be exercised in
 * a few requests. `trustProxy` mirrors what `app.set("trust proxy", ...)` does
 * in the real app, letting us assert how client IPs are derived behind a proxy.
 */
const buildApp = (trustProxy: boolean | number, max: number) => {
  const app = express();
  app.set("trust proxy", trustProxy);
  app.use(
    createRateLimiter(max, 15, {
      // Silence validation noise from sending X-Forwarded-For in tests; the
      // behaviour under test is the keying, which we assert via status codes.
      validate: false,
    }),
  );
  app.get("/", (_req, res) => res.status(200).json({ ok: true }));
  return app;
};

describe("rateLimiter", () => {
  describe("per-client keying behind a proxy", () => {
    it("gives each forwarded client IP its own bucket when trust proxy is set", async () => {
      const app = buildApp(1, 2); // trust 1 hop, allow 2 requests per IP

      // Client A exhausts its bucket.
      await request(app).get("/").set("X-Forwarded-For", "1.1.1.1").expect(200);
      await request(app).get("/").set("X-Forwarded-For", "1.1.1.1").expect(200);
      await request(app).get("/").set("X-Forwarded-For", "1.1.1.1").expect(429);

      // Client B is unaffected — it has its own bucket, proving limits apply
      // per client rather than globally behind the proxy.
      await request(app).get("/").set("X-Forwarded-For", "2.2.2.2").expect(200);
      await request(app).get("/").set("X-Forwarded-For", "2.2.2.2").expect(200);
      await request(app).get("/").set("X-Forwarded-For", "2.2.2.2").expect(429);
    });

    it("lumps all forwarded clients into one bucket when trust proxy is off", async () => {
      const app = buildApp(false, 2); // do not trust the proxy

      // Without trust proxy, req.ip is the (shared) socket address, so distinct
      // forwarded clients drain the SAME bucket — the broken behaviour we fix.
      await request(app).get("/").set("X-Forwarded-For", "1.1.1.1").expect(200);
      await request(app).get("/").set("X-Forwarded-For", "2.2.2.2").expect(200);
      await request(app).get("/").set("X-Forwarded-For", "3.3.3.3").expect(429);
    });
  });

  describe("standard headers", () => {
    it("emits draft RateLimit-* headers and omits legacy X-RateLimit-* headers", async () => {
      const app = buildApp(1, 5);

      const res = await request(app)
        .get("/")
        .set("X-Forwarded-For", "9.9.9.9")
        .expect(200);

      expect(res.headers).toHaveProperty("ratelimit-limit");
      expect(res.headers).toHaveProperty("ratelimit-remaining");
      expect(res.headers).not.toHaveProperty("x-ratelimit-limit");
    });
  });

  describe("parseTrustProxy", () => {
    it("defaults to false when unset or empty", () => {
      expect(parseTrustProxy(undefined)).toBe(false);
      expect(parseTrustProxy("")).toBe(false);
      expect(parseTrustProxy("   ")).toBe(false);
    });

    it("parses booleans case-insensitively", () => {
      expect(parseTrustProxy("true")).toBe(true);
      expect(parseTrustProxy("TRUE")).toBe(true);
      expect(parseTrustProxy("false")).toBe(false);
    });

    it("parses a non-negative integer hop count", () => {
      expect(parseTrustProxy("1")).toBe(1);
      expect(parseTrustProxy("0")).toBe(0);
    });

    it("passes through subnet/preset strings verbatim", () => {
      expect(parseTrustProxy("loopback, 10.0.0.0/8")).toBe(
        "loopback, 10.0.0.0/8",
      );
    });
  });
});
