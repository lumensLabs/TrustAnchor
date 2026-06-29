/**
 * TypeScript shapes mirroring PostgreSQL tables from node-pg-migrate.
 * Used by future repository/service layers; not wired to runtime yet.
 */

export type LoanStatus = "pending" | "active" | "repaid" | "defaulted";

export interface UserProfileRow {
  id: string;
  email: string;
  wallet_address: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  country: string;
  phone_number: string | null;
  national_id: string | null;
  kyc_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LoanHistoryRow {
  id: string;
  user_id: string | null;
  borrower_wallet: string;
  on_chain_loan_id: string | null;
  amount: string;
  currency: string;
  interest_rate_bps: number;
  term_days: number;
  outstanding: string;
  status: LoanStatus;
  contract_address: string | null;
  nft_score_at_request: number | null;
  due_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ContractEventRow {
  id: number;
  contract_name: string;
  contract_address: string;
  event_name: string;
  tx_hash: string | null;
  ledger_sequence: string | null;
  topics: Record<string, unknown>;
  payload: Record<string, unknown>;
  occurred_at: Date;
  indexed_at: Date;
}

/** Known Soroban event names indexed into contract_events. */
export const CONTRACT_EVENT_NAMES = [
  "LoanRequested",
  "LoanApproved",
  "LoanActivated",
  "LoanRepayment",
  "LoanRepaid",
  "LoanDefaulted",
  "NftIssued",
] as const;

export type ContractEventName = (typeof CONTRACT_EVENT_NAMES)[number];
