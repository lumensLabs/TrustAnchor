/** Credit bands matching typical lending tiers */
export type CreditBand = "Excellent" | "Good" | "Fair" | "Poor";

/** Points awarded for an on-time repayment */
const ON_TIME_DELTA = 15;
/** Points deducted for a late / missed repayment */
const LATE_DELTA = -30;

export function getCreditBand(score: number): CreditBand {
  if (score >= 750) return "Excellent";
  if (score >= 670) return "Good";
  if (score >= 580) return "Fair";
  return "Poor";
}

/**
 * Derive a deterministic base score from a userId so that every call for the
 * same user returns consistent data without a database. Range: 500–850.
 */
export function baseScore(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return 500 + (hash % 351);
}

export function getUserScore(userId: string) {
  const score = baseScore(userId);
  const band = getCreditBand(score);

  return {
    userId,
    score,
    band,
    factors: {
      repaymentHistory: "On-time payments increase score by 15 pts each",
      latePaymentPenalty: "Late payments decrease score by 30 pts each",
      range: "500 (Poor) – 850 (Excellent)",
    },
  };
}

export function updateUserScore(
  userId: string,
  repaymentAmount: number,
  onTime: boolean,
) {
  const oldScore = baseScore(userId);
  const delta = onTime ? ON_TIME_DELTA : LATE_DELTA;
  const newScore = Math.min(850, Math.max(300, oldScore + delta));
  const band = getCreditBand(newScore);

  return {
    userId,
    repaymentAmount,
    onTime,
    oldScore,
    delta,
    newScore,
    band,
  };
}
