import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getHealthReport } from '../services/healthService.js';

/**
 * GET /health
 *
 * Returns service health including database connectivity and Horizon API status.
 */
export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  const report = await getHealthReport();
  res.status(report.status === 'ok' ? 200 : 503).json(report);
});
