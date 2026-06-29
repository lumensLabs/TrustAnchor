#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, IntoVal, Symbol};

mod events;
pub mod repayment;

const MIN_SCORE: u32 = 50;
const DEFAULT_INTEREST_RATE_BPS: u32 = 1000; // 10% annual
const DEFAULT_PENALTY_RATE_BPS: u32 = 500; // 5% annual penalty
const DEFAULT_LOAN_DURATION: u64 = 31_536_000; // 1 year in seconds

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum LoanStatus {
    Requested,
    Active,
    Repaid,
    Defaulted,
}

#[contracttype]
#[derive(Clone)]
pub struct Loan {
    pub borrower: Address,
    pub principal: i128,
    pub interest_rate_bps: u32,
    pub penalty_rate_bps: u32,
    pub start_time: u64,
    pub due_time: u64,
    pub amount_repaid: i128,
    pub status: LoanStatus,
}

#[contracttype]
#[derive(Clone)]
pub struct LoanRecord {
    pub id: u64,
    pub borrower: Address,
    pub amount: i128,
    pub outstanding: i128,
    pub interest_rate: u32,
    pub status: LoanStatus,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum LoanStatus {
    Requested,
    Approved,
    Active,
    Repaid,
    Defaulted,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    NftContract,
    NextLoanId,
    Loan(u64),
}

#[contract]
pub struct LoanManager;

#[contractimpl]
impl LoanManager {
    pub fn initialize(env: Env, nft_contract: Address) {
        env.storage()
            .instance()
            .set(&DataKey::NftContract, &nft_contract);
        env.storage().instance().set(&DataKey::NextLoanId, &1u64);
    }

    pub fn request_loan(env: Env, borrower: Address, amount: i128) -> u64 {
        borrower.require_auth();

        let nft_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::NftContract)
            .expect("not initialized");

        let score: u32 = env.invoke_contract(
            &nft_contract,
            &Symbol::new(&env, "get_score"),
            soroban_sdk::vec![&env, borrower.clone().into_val(&env)],
        );

        if score < MIN_SCORE {
            panic!("borrower score below threshold");
        }

        if amount <= 0 {
            panic!("loan amount must be positive");
        }

        // Get and increment next loan ID
        let loan_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextLoanId)
            .unwrap_or(1);

        // Lock collateral in NFT contract
        let _: () = env.invoke_contract(
            &nft_contract,
            &Symbol::new(&env, "lock_collateral"),
            soroban_sdk::vec![
                &env,
                borrower.clone().into_val(&env),
                loan_id.into_val(&env),
                env.current_contract_address().into_val(&env),
            ],
        );

        // Create loan record
        let loan = LoanRecord {
            id: loan_id,
            borrower: borrower.clone(),
            amount,
            outstanding: amount,
            interest_rate: 500, // 5% default
            status: LoanStatus::Requested,
            created_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Loan(loan_id), &loan);

        env.storage()
            .instance()
            .set(&DataKey::NextLoanId, &(loan_id + 1));

        events::loan_requested(&env, borrower, amount);
        loan_id
    }

    pub fn approve_loan(env: Env, loan_id: u64) {
        let loan_key = DataKey::Loan(loan_id);
        let mut loan: LoanRecord = env
            .storage()
            .persistent()
            .get(&loan_key)
            .expect("loan not found");

        if loan.status != LoanStatus::Requested {
            panic!("loan must be in Requested status");
        }

        loan.status = LoanStatus::Active;
        env.storage().persistent().set(&loan_key, &loan);

        events::loan_approved(&env, loan_id);
    }

    pub fn repay(env: Env, borrower: Address, loan_id: u32, amount: i128) {
        borrower.require_auth();

        if amount <= 0 {
            panic!("repayment amount must be positive");
        }

        // Find active loan for borrower
        // Note: This is a simplified version. In production, you'd iterate or use a better index
        let next_loan_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextLoanId)
            .unwrap_or(1);

        let mut found_loan = None;
        for i in 1..next_loan_id {
            if let Some(loan) = env
                .storage()
                .persistent()
                .get::<DataKey, LoanRecord>(&DataKey::Loan(i))
            {
                if loan.borrower == borrower && loan.status == LoanStatus::Active {
                    found_loan = Some((i, loan));
                    break;
                }
            }
        }

        let (loan_id, mut loan) = found_loan.expect("no active loan found");

        if amount > loan.outstanding {
            panic!("repayment exceeds outstanding amount");
        }

        loan.outstanding -= amount;

        // If fully repaid, unlock collateral
        if loan.outstanding <= 0 {
            loan.status = LoanStatus::Repaid;

            let nft_contract: Address = env
                .storage()
                .instance()
                .get(&DataKey::NftContract)
                .expect("not initialized");

            let _: () = env.invoke_contract(
                &nft_contract,
                &Symbol::new(&env, "unlock_collateral"),
                soroban_sdk::vec![
                    &env,
                    borrower.clone().into_val(&env),
                    loan_id.into_val(&env),
                    env.current_contract_address().into_val(&env),
                ],
            );
        }

        env.storage()
            .persistent()
            .set(&DataKey::Loan(loan_id), &loan);

        events::loan_repaid(&env, borrower, amount);
    }

    pub fn default_loan(env: Env, loan_id: u64) {
        let loan_key = DataKey::Loan(loan_id);
        let mut loan: LoanRecord = env
            .storage()
            .persistent()
            .get(&loan_key)
            .expect("loan not found");

        if loan.status != LoanStatus::Active {
            panic!("loan must be Active to default");
        }

        loan.status = LoanStatus::Defaulted;
        env.storage().persistent().set(&loan_key, &loan);

        // Liquidate collateral
        let nft_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::NftContract)
            .expect("not initialized");

        let _: () = env.invoke_contract(
            &nft_contract,
            &Symbol::new(&env, "liquidate_collateral"),
            soroban_sdk::vec![
                &env,
                loan.borrower.clone().into_val(&env),
                loan_id.into_val(&env),
                env.current_contract_address().into_val(&env),
            ],
        );

        events::loan_defaulted(&env, loan_id);
    }

    pub fn get_loan(env: Env, loan_id: u64) -> Option<LoanRecord> {
        env.storage()
            .persistent()
            .get::<DataKey, LoanRecord>(&DataKey::Loan(loan_id))
    }
}

#[cfg(test)]
mod test;
