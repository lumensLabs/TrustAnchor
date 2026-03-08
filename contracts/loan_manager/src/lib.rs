#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, Vec};

mod nft {
    soroban_sdk::contractimport!(
        file = "../target/wasm32-unknown-unknown/release/remittance_nft.wasm"
    );
}

mod events;

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum LoanStatus {
    Requested,
    Approved,
    Active,
    Repaid,
    Defaulted,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Loan {
    pub id: u32,
    pub borrower: Address,
    pub amount: i128,
    pub interest_rate: u32,
    pub status: LoanStatus,
    pub created_at: u64,
    pub approved_at: Option<u64>,
    pub repaid_at: Option<u64>,
    pub collateral_nft: Option<Address>,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    NftContract,
    LoanCounter,
    Loan(u32),
    UserLoans(Address),
}

#[contract]
pub struct LoanManager;

#[contractimpl]
impl LoanManager {
    pub fn initialize(env: Env, nft_contract: Address) {
        env.storage().instance().set(&DataKey::NftContract, &nft_contract);
        env.storage().instance().set(&DataKey::LoanCounter, &0u32);
        
        // Emit initialization event
        env.events().publish(
            (Symbol::new(&env, "ContractInitialized"), Symbol::new(&env, "LoanManager")),
            nft_contract
        );
    }

    pub fn request_loan(env: Env, borrower: Address, amount: i128) {
        let nft_contract: Address = env.storage().instance().get(&DataKey::NftContract).expect("not initialized");
        let nft_client = nft::Client::new(&env, &nft_contract);
        
        // Get borrower's credit score
        let score = nft_client.get_score(&borrower);
        if score < 500 {
            panic!("score too low for loan");
        }
        
        // Create new loan
        let loan_id = env.storage().instance().get::<DataKey, u32>(&DataKey::LoanCounter).unwrap_or(0) + 1;
        env.storage().instance().set(&DataKey::LoanCounter, &loan_id);
        
        // Calculate interest rate based on credit score
        let interest_rate = if score >= 750 { 5 } else if score >= 650 { 8 } else { 12 };
        
        let loan = Loan {
            id: loan_id,
            borrower: borrower.clone(),
            amount,
            interest_rate,
            status: LoanStatus::Requested,
            created_at: env.ledger().timestamp(),
            approved_at: None,
            repaid_at: None,
            collateral_nft: Some(nft_contract),
        };
        
        // Store loan
        env.storage().persistent().set(&DataKey::Loan(loan_id), &loan);
        
        // Add to user's loans
        let mut user_loans: Vec<u32> = env.storage().persistent().get(&DataKey::UserLoans(borrower.clone())).unwrap_or(Vec::new(&env));
        user_loans.push_back(loan_id);
        env.storage().persistent().set(&DataKey::UserLoans(borrower.clone()), &user_loans);
        
        // Emit events
        events::loan_requested(&env, borrower, amount, loan_id, score, interest_rate);
    }

    pub fn approve_loan(env: Env, loan_id: u32) {
        let mut loan: Loan = env.storage().persistent().get(&DataKey::Loan(loan_id))
            .expect("loan not found");
        
        if loan.status != LoanStatus::Requested {
            panic!("loan not in requested state");
        }
        
        // Update loan status
        loan.status = LoanStatus::Approved;
        loan.approved_at = Some(env.ledger().timestamp());
        
        // Store updated loan
        env.storage().persistent().set(&DataKey::Loan(loan_id), &loan);
        
        // Emit approval event
        events::loan_approved(&env, loan_id, loan.borrower, loan.amount, loan.interest_rate);
    }

    pub fn activate_loan(env: Env, loan_id: u32, lending_pool: Address) {
        let mut loan: Loan = env.storage().persistent().get(&DataKey::Loan(loan_id))
            .expect("loan not found");
        
        if loan.status != LoanStatus::Approved {
            panic!("loan not approved");
        }
        
        // Update loan status to active
        loan.status = LoanStatus::Active;
        
        // Store updated loan
        env.storage().persistent().set(&DataKey::Loan(loan_id), &loan);
        
        // Emit activation event
        events::loan_activated(&env, loan_id, loan.borrower, loan.amount, lending_pool);
    }
    
    pub fn repay(env: Env, borrower: Address, loan_id: u32, amount: i128) {
        borrower.require_auth();
        
        let mut loan: Loan = env.storage().persistent().get(&DataKey::Loan(loan_id))
            .expect("loan not found");
        
        if loan.borrower != borrower {
            panic!("not loan borrower");
        }
        
        if loan.status != LoanStatus::Active {
            panic!("loan not active");
        }
        
        // Update loan status if fully repaid
        let total_due = loan.amount + (loan.amount * loan.interest_rate as i128 / 100);
        let mut fully_repaid = false;
        
        if amount >= total_due {
            loan.status = LoanStatus::Repaid;
            loan.repaid_at = Some(env.ledger().timestamp());
            fully_repaid = true;
        }
        
        // Store updated loan
        env.storage().persistent().set(&DataKey::Loan(loan_id), &loan);
        
        // Update credit score through NFT contract
        let nft_contract: Address = env.storage().instance().get(&DataKey::NftContract).expect("not initialized");
        let nft_client = nft::Client::new(&env, &nft_contract);
        nft_client.update_score(&borrower, &amount, &None);
        
        // Emit repayment event
        events::loan_repaid(&env, borrower, loan_id, amount, fully_repaid);
    }
    
    pub fn get_loan(env: Env, loan_id: u32) -> Loan {
        env.storage().persistent().get(&DataKey::Loan(loan_id)).expect("loan not found")
    }
    
    pub fn get_loan_status(env: Env, loan_id: u32) -> LoanStatus {
        let loan: Loan = env.storage().persistent().get(&DataKey::Loan(loan_id)).expect("loan not found");
        loan.status
    }
    
    pub fn get_user_loans(env: Env, user: Address) -> Vec<u32> {
        env.storage().persistent().get(&DataKey::UserLoans(user)).unwrap_or(Vec::new(&env))
    }
}

#[cfg(test)]
mod test;
