#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, IntoVal};

mod events;

#[contracttype]
#[derive(Clone)]
pub struct Loan {
    pub id: u32,
    pub borrower: Address,
    pub original_amount: i128,
    pub balance: i128,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    NftContract,
    Loan(u32),
    NextLoanId,
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

        let nft_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::NftContract)
            .expect("not initialized");

        // Find the borrower's active loan
        // For now, assuming there's a single active loan per borrower
        // In a full implementation, we'd need a more sophisticated lookup
        let loan_key = DataKey::Loan(1); // Placeholder: would need loan_id tracking

        if !env.storage().instance().has(&loan_key) {
            panic!("no active loan found for borrower");
        }

        let mut loan: Loan = env
            .storage()
            .instance()
            .get(&loan_key)
            .expect("loan not found");

        // Verify this loan belongs to the borrower
        if loan.borrower != borrower {
            panic!("loan does not belong to borrower");
        }

        // Ensure we don't overpay
        if amount > loan.balance {
            panic!("repayment amount exceeds loan balance");
        }

        // Update loan balance
        loan.balance -= amount;
        env.storage().instance().set(&loan_key, &loan);

        // Call remittance_nft contract to update the borrower's score
        // Using the soroban SDK to invoke cross-contract calls
        use soroban_sdk::InvokeContractOptions;

        // Invoke: nft_contract.update_score(borrower, amount, Some(env.current_contract_address()))
        let _: () = env.invoke_contract(
            &nft_contract,
            &soroban_sdk::Symbol::new(&env, "update_score"),
            soroban_sdk::vec![
                &env,
                borrower.into_val(&env),
                amount.into_val(&env),
                soroban_sdk::Option::<Address>::Some(env.current_contract_address()).into_val(&env),
            ],
        );

        // Emit repayment event
        events::loan_repaid(&env, borrower, amount);
    }
}

#[cfg(test)]
mod test;
