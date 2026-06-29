import request from "supertest";
import app from "../app.js";

describe("GET /health", () => {
  it("should return 200 OK with status ok", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: "ok",
        uptime: expect.any(Number),
        timestamp: expect.any(Number),
      }),
    );
  });

  it("should return uptime as a non-negative number", async () => {
    const response = await request(app).get("/health");

    expect(response.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it("should return a recent timestamp", async () => {
    const before = Date.now();
    const response = await request(app).get("/health");
    const after = Date.now();

    expect(response.body.timestamp).toBeGreaterThanOrEqual(before);
    expect(response.body.timestamp).toBeLessThanOrEqual(after);
  });
});
