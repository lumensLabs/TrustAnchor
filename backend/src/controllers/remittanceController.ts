import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getPool } from "../config/database.js";

/**
 * Retrieves the verified remittance records for a given user.
 */
export const getVerifiedRemittances = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.params.userId);
    
    // Fetch verified history from DB
    // Assuming status='Verified' indicates verified remittance records
    const pool = getPool();
    if (!pool) {
      res.status(500).json({ success: false, error: "Database not configured" });
      return;
    }

    const { rows: history } = await pool.query(
      "SELECT id, amount, month, status, created_at FROM remittance_history WHERE user_id = $1 AND status = 'Verified' ORDER BY created_at DESC", 
      [userId]
    );

    res.json({
      success: true,
      userId,
      count: history.length,
      history,
    });
  },
);
