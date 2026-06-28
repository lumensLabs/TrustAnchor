import { z } from 'zod';

const stellarAddressRegex = /^G[A-Z2-7]{55}$/;

export const createUserProfileSchema = z.object({
  body: z.object({
    email: z.string().email('A valid email address is required'),
    walletAddress: z
      .string()
      .regex(stellarAddressRegex, 'Wallet address must be a valid Stellar public key')
      .optional(),
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format'),
    country: z
      .string()
      .length(2, 'Country must be a 2-letter ISO code')
      .toUpperCase(),
    phoneNumber: z
      .string()
      .min(7, 'Phone number is too short')
      .max(20, 'Phone number is too long')
      .optional(),
    nationalId: z.string().min(3).max(50).optional(),
  }),
});

export type CreateUserProfileInput = z.infer<typeof createUserProfileSchema>;
