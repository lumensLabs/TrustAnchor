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
