use crate::{LoanManager, LoanManagerClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_loan_request_success() {
    let env = Env::default();
    env.mock_all_auths();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = Address::generate(&env);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);

    // Should succeed without panicking
    manager.request_loan(&borrower, &1000);
}

#[test]
#[should_panic(expected = "loan amount must be positive")]
fn test_loan_request_negative_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = Address::generate(&env);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);

    // Should panic due to negative amount
    manager.request_loan(&borrower, &-100);
}

#[test]
fn test_approve_loan_flow() {
    let env = Env::default();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    // Currently approve_loan is a placeholder logic doing nothing
    // Verify it accepts requests cleanly.
    manager.approve_loan(&1);
}

#[test]
fn test_repayment_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = Address::generate(&env);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);

    // Should succeed without panicking
    manager.repay(&borrower, &500);
}

#[test]
#[should_panic(expected = "repayment amount must be positive")]
fn test_repayment_negative_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = Address::generate(&env);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);

    // Should panic due to negative amount
    manager.repay(&borrower, &-100);
}

#[test]
#[should_panic]
fn test_access_controls_unauthorized_repay() {
    let env = Env::default();
    // NOT using mock_all_auths() to enforce actual signatures

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = Address::generate(&env);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);

    // Attempting to repay without proper Authorization scope should panic natively.
    manager.repay(&borrower, &500);
}

#[test]
fn test_repayment_updates_loan_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = Address::generate(&env);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);

    // Create a loan by manually setting it in storage
    let loan = Loan {
        id: 1,
        borrower: borrower.clone(),
        original_amount: 1000,
        balance: 1000,
    };

    // This would require exposing storage or a create_loan method
    // For now, this test serves as a placeholder showing the expected behavior
    manager.repay(&borrower, &200);

    // The balance should decrease to 800 after repay
    // Verification would require a get_loan method or exposing storage
}

#[test]
#[should_panic(expected = "repayment amount exceeds loan balance")]
fn test_repayment_cannot_exceed_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = Address::generate(&env);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);

    // Attempt to repay more than the balance
    manager.repay(&borrower, &2000);
}

#[test]
#[should_panic(expected = "no active loan found for borrower")]
fn test_repayment_requires_existing_loan() {
    let env = Env::default();
    env.mock_all_auths();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = Address::generate(&env);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);

    // Attempt to repay when no loan exists
    manager.repay(&borrower, &100);
}
