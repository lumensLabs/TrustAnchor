import { describe, expect, it } from "@jest/globals";
import {
  CONTRACT_EVENT_NAMES,
  type LoanStatus,
} from "../db/schema.types.js";

describe("database schema types", () => {
  it("should define loan statuses aligned with the frontend and Soroban contract", () => {
    const statuses: LoanStatus[] = [
      "pending",
      "active",
      "repaid",
      "defaulted",
    ];

    expect(statuses).toHaveLength(4);
  });

  it("should list contract events to cache from smart contracts", () => {
    expect(CONTRACT_EVENT_NAMES).toEqual(
      expect.arrayContaining([
        "LoanRequested",
        "LoanApproved",
        "LoanRepaid",
        "NftIssued",
      ]),
    );
  });
});
