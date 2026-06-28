import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  getRemittanceHistoryForUser,
  simulatePaymentForUser,
} from "../services/simulationService.js";

export const getRemittanceHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params as { userId: string };
    res.json(getRemittanceHistoryForUser(userId));
  },
);

export const simulatePayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, amount } = req.body;
    res.json(simulatePaymentForUser(userId, amount));
  },
);
