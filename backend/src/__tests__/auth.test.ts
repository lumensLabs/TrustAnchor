import request from "supertest";
import app from "../app.js";

beforeAll(() => {
  process.env.JWT_SECRET = "test-jwt-secret-for-unit-tests";
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
describe("POST /api/auth/register", () => {
  it("should create a new user and return a JWT", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "newuser@example.com",
      password: "securePass1",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user.email).toBe("newuser@example.com");
    expect(res.body.user.id).toBeDefined();
  });

  it("should reject duplicate email registration", async () => {
    const payload = { email: "dup@example.com", password: "securePass1" };
    await request(app).post("/api/auth/register").send(payload);
    const res = await request(app).post("/api/auth/register").send(payload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("should reject an invalid email", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "securePass1",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it("should reject a password shorter than 8 characters", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "short@example.com",
      password: "abc",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject missing email", async () => {
    const res = await request(app).post("/api/auth/register").send({
      password: "securePass1",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject missing password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "nopass@example.com",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
describe("POST /api/auth/login", () => {
  const credentials = { email: "logintest@example.com", password: "securePass2" };

  beforeAll(async () => {
    await request(app).post("/api/auth/register").send(credentials);
  });

  it("should return a JWT for valid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send(credentials);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user.email).toBe(credentials.email);
  });

  it("should reject a wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: credentials.email,
      password: "wrongPassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should reject an unregistered email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@example.com",
      password: "securePass2",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should reject missing credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// requireAuth middleware (via a protected route — uses score update as proxy)
// ---------------------------------------------------------------------------
describe("requireAuth middleware", () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "authtest@example.com",
      password: "securePass3",
    });
    token = res.body.token as string;
  });

  it("should return 401 when no Authorization header is provided", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("should return 401 for a malformed token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not.a.valid.token");
    expect(res.status).toBe(401);
  });

  it("should return 200 and user info for a valid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe("authtest@example.com");
  });
});
