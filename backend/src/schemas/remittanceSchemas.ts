import { z } from "zod";

// Schema for GET /:userId/verified
export const getVerifiedRemittancesSchema = z.object({
  params: z.object({
    userId: z
      .string()
      .min(1, "User ID is required")
      .max(100, "User ID is too long"),
  }),
});

export type GetVerifiedRemittancesInput = z.infer<
  typeof getVerifiedRemittancesSchema
>;
