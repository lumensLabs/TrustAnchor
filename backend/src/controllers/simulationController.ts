import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { query } from "../config/db.js";

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
