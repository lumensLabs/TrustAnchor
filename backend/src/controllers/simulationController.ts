import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";

// ── Score computation helpers ────────────────────────────────────────────────

/**
 * Derive a deterministic base score from a userId string.
 * Uses the same simple hash approach as the existing score controller so
 * the simulation is consistent with what a user would see on their profile.
 * Range: 500–850 (standard credit-score band).
 */
function baseScoreForUser(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return 500 + (hash % 351); // 500–850
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

// ── Controllers ──────────────────────────────────────────────────────────────

export const getRemittanceHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    // Generate a deterministic history based on userId so the same user
    // always gets the same mock history (consistent with the score endpoint).
    const base = baseScoreForUser(userId);
    const amounts = [200, 350, 500, 750, 1000];
    const months = [
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

    // Derive 3 history rows from the userId hash so the data varies per user.
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
    }

    const history = [0, 1, 2].map((offset) => ({
      month: months[(hash + offset) % 12],
      amount: amounts[(hash + offset) % amounts.length],
      status: "Completed",
    }));

    // Derive score and streak from the history rather than fixed literals.
    const streak = history.length; // all completed
    const totalPaid = history.reduce((sum, row) => sum + row.amount, 0);
    const score = Math.min(850, base + Math.floor(totalPaid / 100));

    res.json({
      userId,
      score,
      streak,
      history,
    });
  },
);

export const simulatePayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, amount } = req.body;

    const currentScore = baseScoreForUser(userId);
    const delta = computeScoreDelta(amount);
    const newScore = Math.min(850, currentScore + delta);

    res.json({
      success: true,
      message: `Payment of ${amount} for user ${userId} simulated.`,
      currentScore,
      newScore,
      scoreDelta: delta,
    });
  },
);