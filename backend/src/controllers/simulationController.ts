import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";

// ── Score computation helpers ────────────────────────────────────────────────

/**
 * Derive a deterministic base score from a userId string.
 * Uses a simple hash so the simulation is consistent with what a user would
 * see on their profile. Range: 500–850 (standard credit-score band).
 */
function baseScoreForUser(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return 500 + (hash % 351); // 500–850
}

/**
 * Deterministic hash for a userId, reused for deriving history rows.
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Compute the score delta from a single payment simulation.
 *
 * Rules (all capped so the result stays within 500–850):
 *  - Every payment adds a base +5 points (on-time payment boost).
 *  - An additional +1 point per $100 paid, up to +15 (larger payments
 *    signal stronger repayment capacity, but with diminishing returns).
 *  - Total max boost per simulation: +20 points.
 */
function computeScoreDelta(amount: number): number {
  const baseBoost = 5;
  const amountBoost = Math.min(15, Math.floor(amount / 100));
  return baseBoost + amountBoost;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const AMOUNTS = [100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500];

// ── Controllers ──────────────────────────────────────────────────────────────

export const getRemittanceHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (typeof userId !== "string" || userId.length === 0) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    // Derive deterministic history rows from the userId hash so the data
    // varies per user but is stable across requests.
    const hash = hashUserId(userId);
    const history = [0, 1, 2].map((offset) => ({
      month: MONTHS[(hash + offset) % MONTHS.length] ?? "January",
      amount: AMOUNTS[(hash + offset) % AMOUNTS.length] ?? 100,
      status: "Completed",
    }));

    // Derive the score from the base plus the paid history (all completed).
    const base = baseScoreForUser(userId);
    const totalPaid = history.reduce((sum, row) => sum + row.amount, 0);
    const score = Math.min(850, base + Math.floor(totalPaid / 100));

    res.json({
      userId,
      score,
      streak: history.length, // all completed
      history,
    });
  },
);

export const simulatePayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, amount } = req.body as { userId: string; amount: number };

    const currentScore = baseScoreForUser(userId);
    const scoreDelta = computeScoreDelta(amount);
    const newScore = Math.min(850, currentScore + scoreDelta);

    res.json({
      success: true,
      message: `Payment of ${amount} for user ${userId} simulated.`,
      currentScore,
      scoreDelta,
      newScore,
    });
  },
);
