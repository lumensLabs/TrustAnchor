#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

mod events;

/// Core loan lifecycle states.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LoanStatus {
    Pending,
    Active,
    Defaulted,
    Repaid,
}

/// On-chain loan record tracked by the state machine.
#[contracttype]
#[derive(Clone)]
pub struct Loan {
    pub id: u64,
    pub borrower: Address,
    pub principal: i128,
    pub outstanding: i128,
    pub status: LoanStatus,
    pub created_at: u64,
    pub due_date: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    NftContract,
    Admin,
    LoanCounter,
    Loan(u64),
}

const DEFAULT_REPAYMENT_PERIOD_SECS: u64 = 30 * 24 * 60 * 60;

#[contract]
pub struct LoanManager;

#[contractimpl]
impl LoanManager {
    pub fn initialize(env: Env, admin: Address, nft_contract: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::NftContract, &nft_contract);
        env.storage().instance().set(&DataKey::LoanCounter, &0u64);
    }

    /// Create a loan request in the `Pending` state.
    pub fn request_loan(env: Env, borrower: Address, amount: i128) -> u64 {
        borrower.require_auth();

        let _nft_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::NftContract)
            .expect("not initialized");

        if amount <= 0 {
            panic!("loan amount must be positive");
        }

        let loan_id = next_loan_id(&env);
        let created_at = env.ledger().timestamp();
        let due_date = created_at.saturating_add(DEFAULT_REPAYMENT_PERIOD_SECS);

        let loan = Loan {
            id: loan_id,
            borrower: borrower.clone(),
            principal: amount,
            outstanding: amount,
            status: LoanStatus::Pending,
            created_at,
            due_date,
        };

        save_loan(&env, &loan);
        events::loan_requested(&env, loan_id, borrower, amount);

        loan_id
    }

    /// Transition a loan from `Pending` to `Active`.
    pub fn approve_loan(env: Env, loan_id: u64) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized");
        admin.require_auth();

        let mut loan = load_loan(&env, loan_id);
        transition(&mut loan, LoanStatus::Pending, LoanStatus::Active);
        save_loan(&env, &loan);

        events::loan_approved(&env, loan_id);
        events::loan_activated(&env, loan_id);
    }

    /// Apply a repayment while the loan is `Active`.
    /// Transitions to `Repaid` when the outstanding balance reaches zero.
    pub fn repay_loan(env: Env, loan_id: u64, amount: i128) {
        if amount <= 0 {
            panic!("repayment amount must be positive");
        }

        let mut loan = load_loan(&env, loan_id);
        loan.borrower.require_auth();

        if loan.status != LoanStatus::Active {
            panic!("loan must be active to accept repayment");
        }

        if amount > loan.outstanding {
            panic!("repayment exceeds outstanding balance");
        }

        loan.outstanding -= amount;
        if loan.outstanding == 0 {
            loan.status = LoanStatus::Repaid;
            events::loan_repaid(&env, loan_id, loan.borrower.clone(), amount);
        } else {
            events::loan_repayment(&env, loan_id, loan.borrower.clone(), amount);
        }

        save_loan(&env, &loan);
    }

    /// Transition an overdue or administratively flagged loan to `Defaulted`.
    pub fn default_loan(env: Env, loan_id: u64) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized");
        admin.require_auth();

        let mut loan = load_loan(&env, loan_id);
        if loan.status != LoanStatus::Active {
            panic!("only active loans can be defaulted");
        }

        loan.status = LoanStatus::Defaulted;
        save_loan(&env, &loan);
        events::loan_defaulted(&env, loan_id);
    }

    pub fn get_loan(env: Env, loan_id: u64) -> Loan {
        load_loan(&env, loan_id)
    }

    pub fn get_loan_status(env: Env, loan_id: u64) -> LoanStatus {
        load_loan(&env, loan_id).status
    }
}

fn next_loan_id(env: &Env) -> u64 {
    let counter: u64 = env
        .storage()
        .instance()
        .get(&DataKey::LoanCounter)
        .unwrap_or(0);
    let loan_id = counter + 1;
    env.storage()
        .instance()
        .set(&DataKey::LoanCounter, &loan_id);
    loan_id
}

fn load_loan(env: &Env, loan_id: u64) -> Loan {
    env.storage()
        .persistent()
        .get(&DataKey::Loan(loan_id))
        .unwrap_or_else(|| panic!("loan not found"))
}

fn save_loan(env: &Env, loan: &Loan) {
    env.storage()
        .persistent()
        .set(&DataKey::Loan(loan.id), loan);
}

fn transition(loan: &mut Loan, from: LoanStatus, to: LoanStatus) {
    if loan.status != from {
        panic!("invalid loan transition");
    }
    if loan.status == LoanStatus::Repaid || loan.status == LoanStatus::Defaulted {
        panic!("loan is in terminal state");
    }
    loan.status = to;
}

#[cfg(test)]
mod test;
