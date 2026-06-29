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
    Pending,
    Active,
    Defaulted,
    Repaid,
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
pub enum DataKey {
    NftContract,
    LoanCount,
    Loan(u32),
}

#[contract]
pub struct LoanManager;

#[contractimpl]
impl LoanManager {
    fn assert_transition_allowed(from: &LoanStatus, to: &LoanStatus) {
        let valid = matches!(
            (from, to),
            (LoanStatus::Pending, LoanStatus::Active)
                | (LoanStatus::Active, LoanStatus::Defaulted)
                | (LoanStatus::Active, LoanStatus::Repaid)
        );

        if !valid {
            panic!("invalid loan status transition");
        }
    }

    pub fn initialize(env: Env, nft_contract: Address) {
        env.storage()
            .instance()
            .set(&DataKey::NftContract, &nft_contract);
    }

    pub fn request_loan(env: Env, borrower: Address, amount: i128) -> u32 {
        let nft_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::NftContract)
            .expect("not initialized");

        let score: u32 = env.invoke_contract(
            &nft_contract,
            &Symbol::new(&env, "get_score"),
            soroban_sdk::vec![&env, borrower.into_val(&env)],
        );

        if score < MIN_SCORE {
            panic!("borrower score below threshold");
        }

        if amount <= 0 {
            panic!("loan amount must be positive");
        }

        let loan_id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::LoanCount)
            .unwrap_or(0)
            + 1;

        // Lock the borrower's NFT as collateral
        env.invoke_contract::<()>(
            &nft_contract,
            &Symbol::new(&env, "lock_collateral"),
            soroban_sdk::vec![
                &env,
                borrower.into_val(&env),
                env.current_contract_address().into_val(&env)
            ],
        );

        let loan = Loan {
            borrower: borrower.clone(),
            principal: amount,
            interest_rate_bps: DEFAULT_INTEREST_RATE_BPS,
            penalty_rate_bps: DEFAULT_PENALTY_RATE_BPS,
            start_time: 0,
            due_time: 0,
            amount_repaid: 0,
            status: LoanStatus::Pending,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Loan(loan_id), &loan);
        env.storage().instance().set(&DataKey::LoanCount, &loan_id);

        events::loan_requested(&env, borrower.clone(), amount);
        events::collateral_locked(&env, borrower, loan_id);
        loan_id
    }

    pub fn approve_loan(env: Env, loan_id: u32) {
        let mut loan: Loan = env
            .storage()
            .persistent()
            .get(&DataKey::Loan(loan_id))
            .expect("loan not found");

        if loan.status != LoanStatus::Pending {
            panic!("loan not in pending state");
        }

        Self::assert_transition_allowed(&loan.status, &LoanStatus::Active);

        let now = env.ledger().timestamp();
        loan.start_time = now;
        loan.due_time = now + DEFAULT_LOAN_DURATION;
        loan.status = LoanStatus::Active;

        env.storage()
            .persistent()
            .set(&DataKey::Loan(loan_id), &loan);
        events::loan_approved(&env, loan_id);
    }

    pub fn repay(env: Env, borrower: Address, loan_id: u32, amount: i128) {
        borrower.require_auth();

        if amount <= 0 {
            panic!("repayment amount must be positive");
        }

        let mut loan: Loan = env
            .storage()
            .persistent()
            .get(&DataKey::Loan(loan_id))
            .expect("loan not found");

        if loan.borrower != borrower {
            panic!("not the loan borrower");
        }

        if loan.status != LoanStatus::Active {
            panic!("loan not active");
        }

        let now = env.ledger().timestamp();
        let outstanding = Self::_outstanding_balance(&loan, now);

        if amount > outstanding {
            panic!("repayment exceeds outstanding balance");
        }

        loan.amount_repaid += amount;

        let new_outstanding = Self::_outstanding_balance(&loan, now);
        if new_outstanding <= 0 {
            Self::assert_transition_allowed(&loan.status, &LoanStatus::Repaid);
            loan.status = LoanStatus::Repaid;

            // Unlock the borrower's NFT collateral
            let nft_contract: Address = env
                .storage()
                .instance()
                .get(&DataKey::NftContract)
                .expect("not initialized");

            env.invoke_contract::<()>(
                &nft_contract,
                &Symbol::new(&env, "unlock_collateral"),
                soroban_sdk::vec![
                    &env,
                    borrower.into_val(&env),
                    env.current_contract_address().into_val(&env)
                ],
            );

            events::collateral_unlocked(&env, borrower.clone(), loan_id);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Loan(loan_id), &loan);
        events::loan_repaid(&env, borrower, amount);
    }

    pub fn liquidate(env: Env, loan_id: u32) {
        let mut loan: Loan = env
            .storage()
            .persistent()
            .get(&DataKey::Loan(loan_id))
            .expect("loan not found");

        if loan.status != LoanStatus::Active {
            panic!("loan not active");
        }

        let now = env.ledger().timestamp();
        if now <= loan.due_time {
            panic!("loan not yet overdue");
        }

        Self::assert_transition_allowed(&loan.status, &LoanStatus::Defaulted);
        loan.status = LoanStatus::Defaulted;

        let nft_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::NftContract)
            .expect("not initialized");

        env.invoke_contract::<()>(
            &nft_contract,
            &Symbol::new(&env, "seize_collateral"),
            soroban_sdk::vec![
                &env,
                loan.borrower.clone().into_val(&env),
                env.current_contract_address().into_val(&env)
            ],
        );

        env.storage()
            .persistent()
            .set(&DataKey::Loan(loan_id), &loan);
        events::loan_defaulted(&env, loan_id);
    }

    pub fn get_loan(env: Env, loan_id: u32) -> Loan {
        env.storage()
            .persistent()
            .get(&DataKey::Loan(loan_id))
            .expect("loan not found")
    }

    pub fn get_outstanding_balance(env: Env, loan_id: u32) -> i128 {
        let loan: Loan = env
            .storage()
            .persistent()
            .get(&DataKey::Loan(loan_id))
            .expect("loan not found");

        if loan.status == LoanStatus::Repaid {
            return 0;
        }

        let now = env.ledger().timestamp();
        Self::_outstanding_balance(&loan, now)
    }

    pub fn get_accrued_interest(env: Env, loan_id: u32) -> i128 {
        let loan: Loan = env
            .storage()
            .persistent()
            .get(&DataKey::Loan(loan_id))
            .expect("loan not found");

        let now = env.ledger().timestamp();
        if now <= loan.start_time {
            return 0;
        }

        repayment::calculate_interest(
            loan.principal,
            loan.interest_rate_bps,
            now - loan.start_time,
        )
    }

    pub fn get_penalty(env: Env, loan_id: u32) -> i128 {
        let loan: Loan = env
            .storage()
            .persistent()
            .get(&DataKey::Loan(loan_id))
            .expect("loan not found");

        let now = env.ledger().timestamp();
        repayment::calculate_penalty(loan.principal, loan.penalty_rate_bps, loan.due_time, now)
    }

    fn _outstanding_balance(loan: &Loan, current_time: u64) -> i128 {
        let elapsed = current_time.saturating_sub(loan.start_time);
        let interest =
            repayment::calculate_interest(loan.principal, loan.interest_rate_bps, elapsed);
        let penalty = repayment::calculate_penalty(
            loan.principal,
            loan.penalty_rate_bps,
            loan.due_time,
            current_time,
        );
        let total_owed = loan.principal + interest + penalty;
        let balance = total_owed - loan.amount_repaid;
        if balance < 0 {
            0
        } else {
            balance
        }
    }
}

#[cfg(test)]
mod test;
