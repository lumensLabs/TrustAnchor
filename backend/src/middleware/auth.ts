import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError.js";

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string };
}

/**
 * Middleware that validates a Bearer JWT from the Authorization header and
 * attaches the decoded payload to `req.user` for downstream handlers.
 */
export const requireAuth = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(AppError.unauthorized("Missing or malformed Authorization header"));
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw AppError.internal("Server misconfiguration: JWT_SECRET is not set");
  }

  try {
    const payload = jwt.verify(token, secret) as { sub: string; email: string };
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(AppError.unauthorized("Invalid or expired token"));
  }
};

/**
 * Middleware that enforces API-key access control.
 *
 * Callers must provide the `x-api-key` header whose value matches the
 * `INTERNAL_API_KEY` environment variable.  This gate is applied to
 * mutating score endpoints so that only trusted services (e.g. LoanManager
 * off-chain workers) can update credit scores.
 */
export const requireApiKey = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const providedKey = req.headers["x-api-key"];
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) {
    throw AppError.internal(
      "Server misconfiguration: INTERNAL_API_KEY is not set",
    );
  }

  if (!providedKey || providedKey !== expectedKey) {
    throw AppError.unauthorized("Unauthorised: invalid or missing API key");
  }

  next();
};
