import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { query } from "../config/db.js";

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
    
    // Fetch real history from DB
    const { rows: history } = await query(
      "SELECT amount, month, status FROM remittance_history WHERE user_id = $1 ORDER BY created_at DESC", 
      [userId]
    );

    // Fetch current score
    let score = 500;
    const { rows: scoreRows } = await query("SELECT current_score FROM scores WHERE user_id = $1", [userId]);
    if (scoreRows.length > 0) {
      score = scoreRows[0].current_score;
    }

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
      streak: history.length, // simple proxy for streak
      history,
    });
  },
);

export const simulatePayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, amount } = req.body;
    
    // Insert into remittance_history
    const month = new Date().toLocaleString('default', { month: 'long' });
    await query(
      "INSERT INTO remittance_history (user_id, amount, month, status) VALUES ($1, $2, $3, $4)",
      [userId, amount, month, "Completed"]
    );

    // Simulate score update
    let oldScore = 500;
    const { rows: scoreRows } = await query("SELECT current_score FROM scores WHERE user_id = $1", [userId]);
    if (scoreRows.length > 0) {
      oldScore = scoreRows[0].current_score;
    }
    const newScore = Math.min(850, oldScore + 10);
    await query(
      `INSERT INTO scores (user_id, current_score, updated_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (user_id) 
       DO UPDATE SET current_score = EXCLUDED.current_score, updated_at = NOW()`,
      [userId, newScore]
    );

    res.json({
      success: true,
      message: `Payment of ${amount} for user ${userId} simulated.`,
      newScore,
    });
  },
);