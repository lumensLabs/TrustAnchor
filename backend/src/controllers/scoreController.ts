import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { query } from "../config/db.js";

// ---------------------------------------------------------------------------
// Score computation helpers
// ---------------------------------------------------------------------------

/** Credit bands matching typical lending tiers */
type CreditBand = "Excellent" | "Good" | "Fair" | "Poor";

function getCreditBand(score: number): CreditBand {
  if (score >= 750) return "Excellent";
  if (score >= 670) return "Good";
  if (score >= 580) return "Fair";
  return "Poor";
}

// ---------------------------------------------------------------------------
// Score delta constants (tunable)
// ---------------------------------------------------------------------------
/** Points awarded for an on-time repayment */
const ON_TIME_DELTA = 15;
/** Points deducted for a late / missed repayment */
const LATE_DELTA = -30;

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

/**
 * GET /api/score/:userId
 *
 * Returns the current credit score for a user along with their credit band
 * and the key factors that influence the score.  Intended to be called by
 * LoanManager and other contracts that need to make lending decisions.
 */
export const getScore = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string };

  let score = 500; // Default score

  // Query DB for existing score
  const { rows } = await query("SELECT current_score FROM scores WHERE user_id = $1", [userId]);
  if (rows.length > 0) {
    score = rows[0].current_score;
  } else {
    // Insert initial score
    await query("INSERT INTO scores (user_id, current_score) VALUES ($1, $2)", [userId, score]);
  }

  const band = getCreditBand(score);

  res.json({
    success: true,
    userId,
    score,
    band,
    factors: {
      repaymentHistory: "On-time payments increase score by 15 pts each",
      latePaymentPenalty: "Late payments decrease score by 30 pts each",
      range: "500 (Poor) – 850 (Excellent)",
    },
  });
});

/**
 * POST /api/score/update
 *
 * Updates a user's credit score based on a single repayment event.
 * Protected by the `requireApiKey` middleware — only authorised internal
 * services (e.g. LoanManager workers) may call this endpoint.
 *
 * Body: { userId: string, repaymentAmount: number, onTime: boolean }
 */
export const updateScore = asyncHandler(async (req: Request, res: Response) => {
  const { userId, repaymentAmount, onTime } = req.body as {
    userId: string;
    repaymentAmount: number;
    onTime: boolean;
  };

  let oldScore = 500;
  const { rows: existingRows } = await query("SELECT current_score FROM scores WHERE user_id = $1", [userId]);
  if (existingRows.length > 0) {
    oldScore = existingRows[0].current_score;
  }

  const delta = onTime ? ON_TIME_DELTA : LATE_DELTA;

  // Clamp new score within the valid credit-score window [300, 850]
  const newScore = Math.min(850, Math.max(300, oldScore + delta));
  const band = getCreditBand(newScore);

  // Upsert the new score
  await query(
    `INSERT INTO scores (user_id, current_score, updated_at) 
     VALUES ($1, $2, NOW()) 
     ON CONFLICT (user_id) 
     DO UPDATE SET current_score = EXCLUDED.current_score, updated_at = NOW()`,
    [userId, newScore]
  );

  res.json({
    success: true,
    userId,
    repaymentAmount,
    onTime,
    oldScore,
    delta,
    newScore,
    band,
  });
});
