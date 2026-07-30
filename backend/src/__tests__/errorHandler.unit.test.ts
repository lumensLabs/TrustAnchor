import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Request, Response } from "express";
import { errorHandler } from "../middleware/errorHandler.js";
import { AppError } from "../errors/AppError.js";

function createMockResponse() {
  const res: Partial<Response> & { statusCode?: number; body?: unknown } = {};
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res as Response;
  }) as unknown as Response["status"];
  res.json = jest.fn((payload: unknown) => {
    res.body = payload;
    return res as Response;
  }) as unknown as Response["json"];
  return res as Response & { statusCode?: number; body?: unknown };
}

describe("errorHandler - stack trace leak hygiene", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("never includes a stack field when NODE_ENV is unset (fail-closed default)", () => {
    delete process.env.NODE_ENV;

    const res = createMockResponse();
    const err = new Error("boom - internal file path /app/src/x.ts");
    errorHandler(err, {} as Request, res, jest.fn() as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).not.toHaveProperty("stack");
    expect(res.body).toEqual({
      success: false,
      message: "Internal server error",
    });
  });

  it("never includes a stack field when NODE_ENV is set to something other than 'production'", () => {
    process.env.NODE_ENV = "staging";

    const res = createMockResponse();
    const err = new Error("boom");
    errorHandler(err, {} as Request, res, jest.fn() as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).not.toHaveProperty("stack");
  });

  it("never includes a stack field when NODE_ENV is explicitly 'production'", () => {
    process.env.NODE_ENV = "production";

    const res = createMockResponse();
    const err = new Error("boom");
    errorHandler(err, {} as Request, res, jest.fn() as never);

    expect(res.body).not.toHaveProperty("stack");
  });

  it("logs the real error server-side even though it is withheld from the response", () => {
    delete process.env.NODE_ENV;

    const res = createMockResponse();
    const err = new Error("boom");
    errorHandler(err, {} as Request, res, jest.fn() as never);

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("still passes through operational AppError client-safe messages unchanged", () => {
    delete process.env.NODE_ENV;

    const res = createMockResponse();
    const err = AppError.notFound("Resource not found");
    errorHandler(err, {} as Request, res, jest.fn() as never);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "Resource not found",
    });
    expect(res.body).not.toHaveProperty("stack");
  });
});
