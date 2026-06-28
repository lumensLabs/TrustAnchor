import { Router } from 'express';
import { createProfile } from '../controllers/userProfileController.js';
import { validate } from '../middleware/validation.js';
import { createUserProfileSchema } from '../schemas/userProfileSchemas.js';
import { strictRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/**
 * @swagger
 * /user/profile:
 *   post:
 *     summary: Register a user and create a KYC profile
 *     description: >
 *       Creates a new user profile with registration and KYC data.
 *       Profiles start with `kycVerified: false` until KYC is reviewed.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - firstName
 *               - lastName
 *               - dateOfBirth
 *               - country
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               walletAddress:
 *                 type: string
 *                 description: Stellar public key (optional)
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-15"
 *               country:
 *                 type: string
 *                 example: "NG"
 *               phoneNumber:
 *                 type: string
 *               nationalId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Profile created successfully.
 *       400:
 *         description: Validation error.
 *       409:
 *         description: A profile with this email already exists.
 */
router.post(
  '/profile',
  strictRateLimiter,
  validate(createUserProfileSchema),
  createProfile,
);

export default router;
