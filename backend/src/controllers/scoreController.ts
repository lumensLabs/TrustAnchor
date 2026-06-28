import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getUserScore, updateUserScore } from "../services/scoreService.js";

/**
 * GET /api/score/:userId
 *
 * Returns the current credit score for a user along with their credit band
 * and the key factors that influence the score.
 */
export const getScore = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string };
  const result = getUserScore(userId);

  res.json({
    success: true,
    ...result,
  });
});

/**
 * POST /api/score/update
 *
 * Updates a user's credit score based on a single repayment event.
 * Protected by the `requireApiKey` middleware.
 */
export const updateScore = asyncHandler(async (req: Request, res: Response) => {
  const { userId, repaymentAmount, onTime } = req.body as {
    userId: string;
    repaymentAmount: number;
    onTime: boolean;
  };

  const result = updateUserScore(userId, repaymentAmount, onTime);

  res.json({
    success: true,
    ...result,
  });
});
