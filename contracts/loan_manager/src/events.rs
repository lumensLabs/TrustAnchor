use soroban_sdk::{Address, Env, Symbol};

pub fn loan_requested(env: &Env, borrower: Address, amount: i128, loan_id: u32, credit_score: u32, interest_rate: u32) {
    let topics = (Symbol::new(env, "LoanRequested"), borrower);
    let data = (amount, loan_id, credit_score, interest_rate);
    env.events().publish(topics, data);
}

pub fn loan_approved(env: &Env, loan_id: u32, borrower: Address, amount: i128, interest_rate: u32) {
    let topics = (Symbol::new(env, "LoanApproved"), loan_id);
    let data = (borrower, amount, interest_rate);
    env.events().publish(topics, data);
}

pub fn loan_activated(env: &Env, loan_id: u32, borrower: Address, amount: i128, lending_pool: Address) {
    let topics = (Symbol::new(env, "LoanActivated"), loan_id);
    let data = (borrower, amount, lending_pool);
    env.events().publish(topics, data);
}

pub fn loan_repaid(env: &Env, borrower: Address, loan_id: u32, amount: i128, fully_repaid: bool) {
    let topics = (Symbol::new(env, "LoanRepaid"), borrower);
    let data = (loan_id, amount, fully_repaid);
    env.events().publish(topics, data);
}

pub fn loan_defaulted(env: &Env, loan_id: u32, borrower: Address, amount: i128) {
    let topics = (Symbol::new(env, "LoanDefaulted"), loan_id);
    let data = (borrower, amount);
    env.events().publish(topics, data);
}