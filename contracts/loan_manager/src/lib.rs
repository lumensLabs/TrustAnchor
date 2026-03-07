#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

use remittance_nft::RemittanceNFTClient;

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
        let nft_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::NftContract)
            .expect("not initialized");

        let nft_client = RemittanceNFTClient::new(&env, &nft_contract);

        let score = nft_client.get_score(&borrower);

        if score < 500 {
            panic!("score too low for loan");
        }

        // Loan request logic
        events::loan_requested(&env, borrower, amount);
    }

    pub fn approve_loan(env: Env, loan_id: u32) {
        // Approval logic
        events::loan_approved(&env, loan_id);
    }

    pub fn repay(env: Env, borrower: Address, amount: i128) {
        borrower.require_auth();

        // Repayment logic placeholder

        // Update score
        let nft_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::NftContract)
            .expect("not initialized");

        let nft_client = RemittanceNFTClient::new(&env, &nft_contract);

        nft_client.update_score(&borrower, &amount, &None);

        events::loan_repaid(&env, borrower, amount);
    }
}

#[cfg(test)]
mod test;
