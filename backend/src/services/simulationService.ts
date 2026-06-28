export interface RemittanceRecord {
  month: string;
  amount: number;
  status: string;
}

export function getRemittanceHistoryForUser(userId: string) {
  const history: RemittanceRecord[] = [
    { month: "January", amount: 500, status: "Completed" },
    { month: "February", amount: 500, status: "Completed" },
    { month: "March", amount: 500, status: "Completed" },
  ];

  return {
    userId,
    score: 750,
    streak: 3,
    history,
  };
}

export function simulatePaymentForUser(userId: string, amount: number) {
  return {
    success: true,
    message: `Payment of ${amount} for user ${userId} simulated.`,
    newScore: 760,
  };
}
