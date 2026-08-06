import { jest } from "@jest/globals";
import request from "supertest";
import app from "../app.js";
import { getPool } from "../config/database.js";

describe("GET /api/remittance/:userId/verified", () => {
  let mockQuery: jest.SpyInstance;

  beforeAll(() => {
    // Force a fake connection string so getPool() returns a Pool instance
    process.env.DATABASE_URL = "postgres://fake:fake@localhost:5432/fake";
    const pool = getPool();
    // Spy on the real pool's query method to avoid DB connections
    mockQuery = jest.spyOn(pool!, "query") as unknown as jest.SpyInstance;
  });

  beforeEach(() => {
    mockQuery.mockReset();
  });

  afterAll(() => {
    mockQuery.mockRestore();
  });

  it("should return a list of verified remittance records for a valid user", async () => {
    const mockRecords = [
      { id: 1, amount: 500, month: "January", status: "Verified", created_at: "2023-01-01" },
      { id: 2, amount: 300, month: "February", status: "Verified", created_at: "2023-02-01" }
    ];

    mockQuery.mockResolvedValueOnce({ rows: mockRecords });

    const response = await request(app).get("/api/remittance/user123/verified");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.userId).toBe("user123");
    expect(response.body.count).toBe(2);
    expect(response.body.history).toEqual(mockRecords);
    
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE user_id = $1 AND status = 'Verified'"),
      ["user123"]
    );
  });

  it("should return an empty list if no verified records exist for the user", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const response = await request(app).get("/api/remittance/user456/verified");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.userId).toBe("user456");
    expect(response.body.count).toBe(0);
    expect(response.body.history).toEqual([]);
  });

  it("should return 400 or 404 for a badly formatted or missing userId", async () => {
    const response = await request(app).get("/api/remittance//verified");
    expect(response.status).toBe(404);
  });
});

