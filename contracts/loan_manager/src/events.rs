use soroban_sdk::{Address, Env, Symbol};

pub fn loan_requested(env: &Env, loan_id: u64, borrower: Address, amount: i128) {
    let topics = (Symbol::new(env, "LoanRequested"), loan_id, borrower);
    env.events().publish(topics, amount);
}

pub fn loan_approved(env: &Env, loan_id: u64) {
    let topics = (Symbol::new(env, "LoanApproved"), loan_id);
    env.events().publish(topics, ());
}

pub fn loan_activated(env: &Env, loan_id: u64) {
    let topics = (Symbol::new(env, "LoanActivated"), loan_id);
    env.events().publish(topics, ());
}

pub fn loan_repayment(env: &Env, loan_id: u64, borrower: Address, amount: i128) {
    let topics = (Symbol::new(env, "LoanRepayment"), loan_id, borrower);
    env.events().publish(topics, amount);
}

pub fn loan_repaid(env: &Env, loan_id: u64, borrower: Address, amount: i128) {
    let topics = (Symbol::new(env, "LoanRepaid"), loan_id, borrower);
    env.events().publish(topics, amount);
}

pub fn loan_defaulted(env: &Env, loan_id: u64) {
    let topics = (Symbol::new(env, "LoanDefaulted"), loan_id);
    env.events().publish(topics, ());
}
