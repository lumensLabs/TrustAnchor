import type { LoanHistoryRow } from "../db/schema.types.js";

const BPS_DENOMINATOR = 10_000n;
const SECONDS_PER_YEAR = 31_536_000n;

export interface LoanAccrualObservation {
  principal: string | bigint;
  rateBps: number;
  elapsedSeconds: number | bigint;
  accruedInterest: string | bigint;
}

export interface LoanAccrualReconciliation {
  loanId: string;
  expectedFloor: string;
  observedInterest: string;
  rounding: "floor";
}

export class LoanAccrualDiscrepancyError extends Error {
  readonly loanId: string;
  readonly expectedFloor: string;
  readonly observedInterest: string;

  constructor(
    loanId: string,
    expectedFloor: bigint,
    observedInterest: bigint,
  ) {
    super(
      `Loan ${loanId} accrued-interest mismatch: expected floor ${expectedFloor}, observed ${observedInterest}`,
    );
    this.name = "LoanAccrualDiscrepancyError";
    this.loanId = loanId;
    this.expectedFloor = expectedFloor.toString();
    this.observedInterest = observedInterest.toString();
  }
}

function nonNegativeBigInt(value: string | number | bigint, field: string): bigint {
  let parsed: bigint;
  try {
    parsed = typeof value === "bigint" ? value : BigInt(value);
  } catch {
    throw new TypeError(`${field} must be an integer-compatible value`);
  }
  if (parsed < 0n) {
    throw new RangeError(`${field} must be non-negative`);
  }
  return parsed;
}

function nonNegativeRate(rateBps: number): bigint {
  if (!Number.isSafeInteger(rateBps) || rateBps < 0) {
    throw new RangeError("rateBps must be a non-negative safe integer");
  }
  return BigInt(rateBps);
}

export function expectedAccruedInterestFloor(
  principal: string | bigint,
  rateBps: number,
  elapsedSeconds: number | bigint,
): bigint {
  const principalUnits = nonNegativeBigInt(principal, "principal");
  const rate = nonNegativeRate(rateBps);
  const elapsed = nonNegativeBigInt(elapsedSeconds, "elapsedSeconds");

  if (principalUnits === 0n || rate === 0n || elapsed === 0n) {
    return 0n;
  }

  return (
    (principalUnits * rate * elapsed) /
    (BPS_DENOMINATOR * SECONDS_PER_YEAR)
  );
}

/**
 * Gate an on-chain accrual observation before it is accepted by loan-history
 * reconciliation/persistence.
 *
 * The contract policy is exact integer floor rounding. A legitimate tiny
 * fractional accrual may therefore be zero; only a zero that disagrees with
 * the mathematically expected floor is rejected.
 */
export function reconcileLoanAccrualBeforePersist(
  loan: Pick<LoanHistoryRow, "id" | "outstanding">,
  observation: LoanAccrualObservation,
): LoanAccrualReconciliation {
  const expected = expectedAccruedInterestFloor(
    observation.principal,
    observation.rateBps,
    observation.elapsedSeconds,
  );
  const observed = nonNegativeBigInt(
    observation.accruedInterest,
    "accruedInterest",
  );

  if (observed !== expected) {
    throw new LoanAccrualDiscrepancyError(loan.id, expected, observed);
  }

  // Parse outstanding here as part of the persistence gate as well, so malformed
  // monetary rows do not pass reconciliation simply because interest matched.
  nonNegativeBigInt(loan.outstanding, "outstanding");

  return {
    loanId: loan.id,
    expectedFloor: expected.toString(),
    observedInterest: observed.toString(),
    rounding: "floor",
  };
}
