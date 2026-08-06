import { Router } from "express";
import { getVerifiedRemittances } from "../controllers/remittanceController.js";
import { validate } from "../middleware/validation.js";
import { getVerifiedRemittancesSchema } from "../schemas/remittanceSchemas.js";
import { strictRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

/**
 * @swagger
 * /{userId}/verified:
 *   get:
 *     summary: Get verified remittance records for a user
 *     description: Retrieve all remittance records for a specific user where the status is verified.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved verified remittance records.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 userId:
 *                   type: string
 *                 count:
 *                   type: integer
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid input data.
 *       404:
 *         description: User not found or no verified remittance history available.
 */
router.get(
  "/:userId/verified",
  strictRateLimiter,
  validate(getVerifiedRemittancesSchema),
  getVerifiedRemittances
);

export default router;
