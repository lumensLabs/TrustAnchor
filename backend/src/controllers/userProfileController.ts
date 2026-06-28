import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createUserProfile } from '../services/userProfileService.js';

/**
 * POST /api/user/profile
 *
 * Registers a new user and stores their KYC/profile data.
 * KYC verification is pending until reviewed (kycVerified defaults to false).
 */
export const createProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = createUserProfile(req.body);

  res.status(201).json({
    success: true,
    profile: {
      id: profile.id,
      email: profile.email,
      walletAddress: profile.walletAddress,
      firstName: profile.firstName,
      lastName: profile.lastName,
      dateOfBirth: profile.dateOfBirth,
      country: profile.country,
      phoneNumber: profile.phoneNumber,
      kycVerified: profile.kycVerified,
      createdAt: profile.createdAt,
    },
  });
});
