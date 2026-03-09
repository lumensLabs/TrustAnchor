#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

mod events;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    NftContract,
}

#[contract]
pub struct LoanManager;

#[contractimpl]
impl LoanManager {
    pub fn initialize(env: Env, nft_contract: Address) {
        env.storage()
            .instance()
            .set(&DataKey::NftContract, &nft_contract);
    }

    pub fn request_loan(env: Env, borrower: Address, amount: i128) {
        let _nft_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::NftContract)
            .expect("not initialized");

        // For now, just assume all borrowers have sufficient score
        // In a real implementation, you'd call the NFT contract to get the score

        if amount <= 0 {
            panic!("loan amount must be positive");
        }

        // Loan request logic (placeholder)
        events::loan_requested(&env, borrower, amount);
    }

    pub fn approve_loan(env: Env, loan_id: u32) {
        // Approval logic (placeholder)
        events::loan_approved(&env, loan_id);
    }

    pub fn repay(env: Env, borrower: Address, amount: i128) {
        borrower.require_auth();

        if amount <= 0 {
            panic!("repayment amount must be positive");
        }

        // Repayment logic (placeholder)
        events::loan_repaid(&env, borrower, amount);
    }
}

#[cfg(test)]
mod test;
