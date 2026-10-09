import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { LoanHistoryRow } from "../db/schema.types.js";
import {
  LoanAccrualDiscrepancyError,
  expectedAccruedInterestFloor,
  reconcileLoanAccrualBeforePersist,
} from "../services/loanReconciliationService.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(
  here,
  "../../../fixtures/interest-boundaries.csv",
);

function fixtureRows() {
  return fs
    .readFileSync(fixturePath, "utf8")
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [name, principal, rateBps, elapsedSeconds, expectedFloor] =
        line.split(",");
      if (
        name === undefined ||
        principal === undefined ||
        rateBps === undefined ||
        elapsedSeconds === undefined ||
        expectedFloor === undefined
      ) {
        throw new Error(`Malformed interest boundary fixture: ${line}`);
      }
      return {
        name,
        principal,
        rateBps: Number(rateBps),
        elapsedSeconds: BigInt(elapsedSeconds),
        expectedFloor,
      };
    });
}

function row(outstanding = "10000"): Pick<LoanHistoryRow, "id" | "outstanding"> {
  return { id: "loan-boundary", outstanding };
}

describe("loan accrual reconciliation", () => {
  it("shares the contract boundary vectors and floor-rounding policy", () => {
    for (const fixture of fixtureRows()) {
      expect(
        expectedAccruedInterestFloor(
          fixture.principal,
          fixture.rateBps,
          fixture.elapsedSeconds,
        ).toString(),
      ).toBe(fixture.expectedFloor);
    }
  });

  it("accepts a true zero caused only by the documented floor rounding", () => {
    const result = reconcileLoanAccrualBeforePersist(row("1"), {
      principal: "10000",
      rateBps: 500,
      elapsedSeconds: 1,
      accruedInterest: "0",
    });

    expect(result.expectedFloor).toBe("0");
    expect(result.rounding).toBe("floor");
  });

  it("rejects silent zero accrual when the mathematical floor is nonzero", () => {
    expect(() =>
      reconcileLoanAccrualBeforePersist(row(), {
        principal: "10000",
        rateBps: 500,
        elapsedSeconds: 31_536_000,
        accruedInterest: "0",
      }),
    ).toThrow(LoanAccrualDiscrepancyError);
  });

  it("rejects any nonzero reconciliation mismatch before persistence", () => {
    expect(() =>
      reconcileLoanAccrualBeforePersist(row(), {
        principal: "10000",
        rateBps: 500,
        elapsedSeconds: 31_536_000,
        accruedInterest: "499",
      }),
    ).toThrow(/expected floor 500, observed 499/);
  });
});
