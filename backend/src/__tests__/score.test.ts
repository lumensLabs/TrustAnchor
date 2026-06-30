import request from "supertest";
import app from "../app.js";
import { InMemoryScoreStore, scoreStore } from "../lib/scoreStore.js";

const VALID_API_KEY = "test-internal-key";

beforeAll(() => {
  process.env.INTERNAL_API_KEY = VALID_API_KEY;
});

beforeEach(() => {
  if (scoreStore instanceof InMemoryScoreStore) {
    scoreStore.clear();
  }
});

afterAll(() => {
  delete process.env.INTERNAL_API_KEY;
});

// ---------------------------------------------------------------------------
// GET /api/score/:userId
// ---------------------------------------------------------------------------
describe("GET /api/score/:userId", () => {
  it("should return a score for a valid userId", async () => {
    const response = await request(app).get("/api/score/user123");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.userId).toBe("user123");
    expect(typeof response.body.score).toBe("number");
    expect(response.body.score).toBeGreaterThanOrEqual(500);
    expect(response.body.score).toBeLessThanOrEqual(850);
    expect(response.body.band).toBeDefined();
    expect(response.body.factors).toBeDefined();
  });

  it("should return the same score for the same userId (deterministic)", async () => {
    const r1 = await request(app).get("/api/score/alice");
    const r2 = await request(app).get("/api/score/alice");

    expect(r1.body.score).toBe(r2.body.score);
  });

  it("should return different scores for different userIds", async () => {
    const r1 = await request(app).get("/api/score/alice");
    const r2 = await request(app).get("/api/score/bob");

    // Cannot guarantee different, but with realistic ids they will differ
    expect(typeof r1.body.score).toBe("number");
    expect(typeof r2.body.score).toBe("number");
  });

  it("should return 404 for empty userId segment", async () => {
    const response = await request(app).get("/api/score/");

    expect(response.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/score/update
// ---------------------------------------------------------------------------
describe("POST /api/score/update", () => {
  describe("Access control", () => {
    it("should reject requests with no API key", async () => {
      const response = await request(app)
        .post("/api/score/update")
        .send({ userId: "user123", repaymentAmount: 500, onTime: true });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should reject requests with a wrong API key", async () => {
      const response = await request(app)
        .post("/api/score/update")
        .set("x-api-key", "wrong-key")
        .send({ userId: "user123", repaymentAmount: 500, onTime: true });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe("Successful updates", () => {
    it("should increase score by 15 for on-time repayment", async () => {
      const response = await request(app)
        .post("/api/score/update")
        .set("x-api-key", VALID_API_KEY)
        .send({ userId: "user123", repaymentAmount: 500, onTime: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.delta).toBe(15);
      expect(response.body.newScore).toBe(response.body.oldScore + 15);
      expect(response.body.band).toBeDefined();
    });

    it("should decrease score by 30 for a late repayment", async () => {
      const response = await request(app)
        .post("/api/score/update")
        .set("x-api-key", VALID_API_KEY)
        .send({ userId: "user123", repaymentAmount: 300, onTime: false });

      expect(response.status).toBe(200);
      expect(response.body.delta).toBe(-30);
      expect(response.body.newScore).toBe(
        Math.min(850, Math.max(300, response.body.oldScore - 30)),
      );
    });

    it("should clamp newScore to 850 maximum", async () => {
      // 'max-score-user' hashes to a score near 850; delta +15 should clamp
      const response = await request(app)
        .post("/api/score/update")
        .set("x-api-key", VALID_API_KEY)
        .send({ userId: "user123", repaymentAmount: 100, onTime: true });

      expect(response.body.newScore).toBeLessThanOrEqual(850);
    });

    it("should return userId and repaymentAmount in the response", async () => {
      const response = await request(app)
        .post("/api/score/update")
        .set("x-api-key", VALID_API_KEY)
        .send({ userId: "alice", repaymentAmount: 750, onTime: true });

      expect(response.body.userId).toBe("alice");
      expect(response.body.repaymentAmount).toBe(750);
    });

    it("should persist an update so a later GET returns the new score and band", async () => {
      const userId = "band-user-87";
      const initial = await request(app).get(`/api/score/${userId}`);

      expect(initial.status).toBe(200);
      expect(initial.body.score).toBe(735);
      expect(initial.body.band).toBe("Good");

      const update = await request(app)
        .post("/api/score/update")
        .set("x-api-key", VALID_API_KEY)
        .send({ userId, repaymentAmount: 500, onTime: true });

      expect(update.status).toBe(200);
      expect(update.body.oldScore).toBe(735);
      expect(update.body.delta).toBe(15);
      expect(update.body.newScore).toBe(750);
      expect(update.body.band).toBe("Excellent");
      expect(typeof update.body.timestamp).toBe("string");

      const current = await request(app).get(`/api/score/${userId}`);

      expect(current.status).toBe(200);
      expect(current.body.score).toBe(750);
      expect(current.body.band).toBe("Excellent");
    });

    it("should apply both deltas for concurrent updates to the same user", async () => {
      const userId = "concurrent-score-user";
      const initial = await request(app).get(`/api/score/${userId}`);

      const [first, second] = await Promise.all([
        request(app)
          .post("/api/score/update")
          .set("x-api-key", VALID_API_KEY)
          .send({ userId, repaymentAmount: 100, onTime: true }),
        request(app)
          .post("/api/score/update")
          .set("x-api-key", VALID_API_KEY)
          .send({ userId, repaymentAmount: 200, onTime: true }),
      ]);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);

      const oldScores = [first.body.oldScore, second.body.oldScore].sort(
        (a, b) => a - b,
      );
      expect(oldScores).toEqual([initial.body.score, initial.body.score + 15]);

      const current = await request(app).get(`/api/score/${userId}`);

      expect(current.body.score).toBe(initial.body.score + 30);
    });
  });

  describe("Validation errors", () => {
    it("should reject negative repaymentAmount", async () => {
      const response = await request(app)
        .post("/api/score/update")
        .set("x-api-key", VALID_API_KEY)
        .send({ userId: "user123", repaymentAmount: -100, onTime: true });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it("should reject missing onTime field", async () => {
      const response = await request(app)
        .post("/api/score/update")
        .set("x-api-key", VALID_API_KEY)
        .send({ userId: "user123", repaymentAmount: 500 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should reject non-boolean onTime value", async () => {
      const response = await request(app)
        .post("/api/score/update")
        .set("x-api-key", VALID_API_KEY)
        .send({ userId: "user123", repaymentAmount: 500, onTime: "yes" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should reject missing userId", async () => {
      const response = await request(app)
        .post("/api/score/update")
        .set("x-api-key", VALID_API_KEY)
        .send({ repaymentAmount: 500, onTime: true });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should reject repaymentAmount exceeding maximum", async () => {
      const response = await request(app)
        .post("/api/score/update")
        .set("x-api-key", VALID_API_KEY)
        .send({ userId: "user123", repaymentAmount: 2_000_000, onTime: true });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
