import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = "7d";

// In-memory user store (replace with DB queries once users table is migrated)
const users = new Map<string, { id: string; email: string; passwordHash: string }>();
let userIdCounter = 1;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw AppError.internal("Server misconfiguration: JWT_SECRET is not set");
  }
  return secret;
}

export const me = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    return next(AppError.unauthorized("Not authenticated"));
  }
  res.status(200).json({ success: true, user: req.user });
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (users.has(email)) {
      return next(AppError.conflict("An account with this email already exists"));
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = String(userIdCounter++);
    users.set(email, { id, email, passwordHash });

    const token = jwt.sign({ sub: id, email }, getJwtSecret(), {
      expiresIn: TOKEN_EXPIRY,
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: { id, email },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = users.get(email);
    if (!user) {
      return next(AppError.unauthorized("Invalid email or password"));
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return next(AppError.unauthorized("Invalid email or password"));
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, getJwtSecret(), {
      expiresIn: TOKEN_EXPIRY,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    next(err);
  }
};
