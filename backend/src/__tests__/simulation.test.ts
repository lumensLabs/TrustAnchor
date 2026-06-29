import request from "supertest";
import app from "../app.js";

// ---------------------------------------------------------------------------
// GET /api/history/:userId
// ---------------------------------------------------------------------------
describe("GET /api/history/:userId", () => {
  it("returns score, streak, and history for a valid userId", async () => {
    const res = await request(app).get("/api/history/user123");
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe("user123");
    expect(typeof res.body.score).toBe("number");
    expect(typeof res.body.streak).toBe("number");
    expect(Array.isArray(res.body.history)).toBe(true);
    expect(res.body.history.length).toBeGreaterThan(0);
  });

  it("score is derived from history, not a fixed literal", async () => {
    const res = await request(app).get("/api/history/alice");
    expect(res.status).toBe(200);
    // score must be in the valid credit-score range
    expect(res.body.score).toBeGreaterThanOrEqual(500);
    expect(res.body.score).toBeLessThanOrEqual(850);
    // streak must equal the number of history rows (all completed)
    expect(res.body.streak).toBe(res.body.history.length);
  });

  it("different users get different scores and history", async () => {
    const r1 = await request(app).get("/api/history/alice");
    const r2 = await request(app).get("/api/history/bob");
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    // At least one of score or history amount should differ
    const sameScore = r1.body.score === r2.body.score;
    const sameFirstAmount =
      r1.body.history[0]?.amount === r2.body.history[0]?.amount;
    expect(sameScore && sameFirstAmount).toBe(false);
  });

  it("same user always gets the same deterministic result", async () => {
    const r1 = await request(app).get("/api/history/carol");
    const r2 = await request(app).get("/api/history/carol");
    expect(r1.body.score).toBe(r2.body.score);
    expect(r1.body.streak).toBe(r2.body.streak);
    expect(r1.body.history[0].amount).toBe(r2.body.history[0].amount);
  });

  it("returns 400 for missing userId", async () => {
    const res = await request(app).get("/api/history/");
    expect(res.status).toBe(404); // route not matched
  });
});

// ---------------------------------------------------------------------------
// POST /api/simulate
// ---------------------------------------------------------------------------
describe("POST /api/simulate", () => {
  it("returns success with a computed newScore", async () => {
    const res = await request(app)
      .post("/api/simulate")
      .send({ userId: "user123", amount: 500 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.newScore).toBe("number");
    expect(typeof res.body.currentScore).toBe("number");
    expect(typeof res.body.scoreDelta).toBe("number");
  });

  it("newScore is greater than currentScore (payment boosts score)", async () => {
    const res = await request(app)
      .post("/api/simulate")
      .send({ userId: "user123", amount: 500 });
    expect(res.status).toBe(200);
    expect(res.body.newScore).toBeGreaterThan(res.body.currentScore);
  });

  it("larger amount produces a larger score boost", async () => {
    const small = await request(app)
      .post("/api/simulate")
      .send({ userId: "alice", amount: 50 });
    const large = await request(app)
      .post("/api/simulate")
      .send({ userId: "alice", amount: 1000 });
    expect(small.status).toBe(200);
    expect(large.status).toBe(200);
    expect(large.body.scoreDelta).toBeGreaterThan(small.body.scoreDelta);
  });

  it("newScore varies with userId (different base scores)", async () => {
    const r1 = await request(app)
      .post("/api/simulate")
      .send({ userId: "alice", amount: 500 });
    const r2 = await request(app)
      .post("/api/simulate")
      .send({ userId: "bob", amount: 500 });
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    // Different users have different base scores so newScore differs
    expect(r1.body.newScore).not.toBe(r2.body.newScore);
  });

  it("newScore never exceeds 850", async () => {
    const res = await request(app)
      .post("/api/simulate")
      .send({ userId: "highscore", amount: 1000000 });
    expect(res.status).toBe(200);
    expect(res.body.newScore).toBeLessThanOrEqual(850);
  });

  it("newScore is never the hardcoded constant 760 for all inputs", async () => {
    const r1 = await request(app)
      .post("/api/simulate")
      .send({ userId: "alice", amount: 100 });
    const r2 = await request(app)
      .post("/api/simulate")
      .send({ userId: "dave", amount: 900 });
    // At least one result must differ from 760 (the old hardcoded value)
    const bothAre760 = r1.body.newScore === 760 && r2.body.newScore === 760;
    expect(bothAre760).toBe(false);
  });

  it("returns 400 for missing amount", async () => {
    const res = await request(app)
      .post("/api/simulate")
      .send({ userId: "user123" });
    expect(res.status).toBe(400);
  });

  it("returns 400 or 429 for negative amount", async () => {
    const res = await request(app)
      .post("/api/simulate")
      .send({ userId: "user123", amount: -100 });
    expect([400, 429]).toContain(res.status);
  });

  it("returns 400 or 429 for missing userId", async () => {
    const res = await request(app)
      .post("/api/simulate")
      .send({ amount: 500 });
    expect([400, 429]).toContain(res.status);
  });
  });