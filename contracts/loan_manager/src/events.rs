use soroban_sdk::{Address, Env, Symbol};

pub fn loan_requested(env: &Env, borrower: Address, amount: i128) {
    let topics = (Symbol::new(env, "LoanRequested"), borrower);
    env.events().publish(topics, amount);
}

pub fn loan_approved(env: &Env, loan_id: u32) {
    let topics = (Symbol::new(env, "LoanApproved"), loan_id);
    env.events().publish(topics, ());
}

pub fn loan_repaid(env: &Env, borrower: Address, amount: i128) {
    let topics = (Symbol::new(env, "LoanRepaid"), borrower);
    env.events().publish(topics, amount);
}

pub fn collateral_locked(env: &Env, borrower: Address, loan_id: u32) {
    let topics = (Symbol::new(env, "CollateralLocked"), borrower);
    env.events().publish(topics, loan_id);
}

pub fn collateral_unlocked(env: &Env, borrower: Address, loan_id: u32) {
    let topics = (Symbol::new(env, "CollateralUnlocked"), borrower);
    env.events().publish(topics, loan_id);
}

pub fn loan_defaulted(env: &Env, loan_id: u32) {
    let topics = (Symbol::new(env, "LoanDefaulted"), loan_id);
    env.events().publish(topics, ());
}
