use crate::{LoanManager, LoanManagerClient, LoanStatus};
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup(env: &Env) -> (LoanManagerClient<'_>, Address, Address) {
    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(env, &loan_manager_id);

    let admin = Address::generate(env);
    let nft_contract = Address::generate(env);
    manager.initialize(&admin, &nft_contract);

    (manager, admin, nft_contract)
}

#[test]
fn test_loan_request_creates_pending_loan() {
    let env = Env::default();
    env.mock_all_auths();

    let (manager, _, _) = setup(&env);
    let borrower = Address::generate(&env);

    let loan_id = manager.request_loan(&borrower, &1000);

    assert_eq!(loan_id, 1);
    let loan = manager.get_loan(&loan_id);
    assert_eq!(loan.status, LoanStatus::Pending);
    assert_eq!(loan.principal, 1000);
    assert_eq!(loan.outstanding, 1000);
    assert_eq!(manager.get_loan_status(&loan_id), LoanStatus::Pending);
}

#[test]
#[should_panic(expected = "loan amount must be positive")]
fn test_loan_request_negative_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let (manager, _, _) = setup(&env);
    let borrower = Address::generate(&env);

    manager.request_loan(&borrower, &-100);
}

#[test]
fn test_approve_loan_transitions_to_active() {
    let env = Env::default();
    env.mock_all_auths();

    let (manager, _, _) = setup(&env);
    let borrower = Address::generate(&env);

    let loan_id = manager.request_loan(&borrower, &1000);
    manager.approve_loan(&loan_id);

    assert_eq!(manager.get_loan_status(&loan_id), LoanStatus::Active);
}

#[test]
#[should_panic(expected = "invalid loan transition")]
fn test_approve_loan_rejects_non_pending() {
    let env = Env::default();
    env.mock_all_auths();

    let (manager, _, _) = setup(&env);
    let borrower = Address::generate(&env);

    let loan_id = manager.request_loan(&borrower, &1000);
    manager.approve_loan(&loan_id);
    manager.approve_loan(&loan_id);
}

#[test]
fn test_repay_loan_partial_and_full() {
    let env = Env::default();
    env.mock_all_auths();

    let (manager, _, _) = setup(&env);
    let borrower = Address::generate(&env);

    let loan_id = manager.request_loan(&borrower, &1000);
    manager.approve_loan(&loan_id);

    manager.repay_loan(&loan_id, &400);
    assert_eq!(manager.get_loan_status(&loan_id), LoanStatus::Active);
    assert_eq!(manager.get_loan(&loan_id).outstanding, 600);

    manager.repay_loan(&loan_id, &600);
    assert_eq!(manager.get_loan_status(&loan_id), LoanStatus::Repaid);
    assert_eq!(manager.get_loan(&loan_id).outstanding, 0);
}

#[test]
#[should_panic(expected = "repayment amount must be positive")]
fn test_repayment_negative_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let (manager, _, _) = setup(&env);
    let borrower = Address::generate(&env);

    let loan_id = manager.request_loan(&borrower, &1000);
    manager.approve_loan(&loan_id);
    manager.repay_loan(&loan_id, &-100);
}

#[test]
#[should_panic(expected = "loan must be active to accept repayment")]
fn test_repay_loan_rejects_pending() {
    let env = Env::default();
    env.mock_all_auths();

    let (manager, _, _) = setup(&env);
    let borrower = Address::generate(&env);

    let loan_id = manager.request_loan(&borrower, &1000);
    manager.repay_loan(&loan_id, &500);
}

#[test]
#[should_panic(expected = "repayment exceeds outstanding balance")]
fn test_repay_loan_rejects_overpayment() {
    let env = Env::default();
    env.mock_all_auths();

    let (manager, _, _) = setup(&env);
    let borrower = Address::generate(&env);

    let loan_id = manager.request_loan(&borrower, &1000);
    manager.approve_loan(&loan_id);
    manager.repay_loan(&loan_id, &1500);
}

#[test]
fn test_default_loan_transitions_to_defaulted() {
    let env = Env::default();
    env.mock_all_auths();

    let (manager, _, _) = setup(&env);
    let borrower = Address::generate(&env);

    let loan_id = manager.request_loan(&borrower, &1000);
    manager.approve_loan(&loan_id);
    manager.default_loan(&loan_id);

    assert_eq!(manager.get_loan_status(&loan_id), LoanStatus::Defaulted);
}

#[test]
#[should_panic(expected = "only active loans can be defaulted")]
fn test_default_loan_rejects_repaid() {
    let env = Env::default();
    env.mock_all_auths();

    let (manager, _, _) = setup(&env);
    let borrower = Address::generate(&env);

    let loan_id = manager.request_loan(&borrower, &1000);
    manager.approve_loan(&loan_id);
    manager.repay_loan(&loan_id, &1000);
    manager.default_loan(&loan_id);
}

#[test]
#[should_panic]
fn test_access_controls_unauthorized_repay() {
    let env = Env::default();

    let (manager, _, _) = setup(&env);
    let borrower = Address::generate(&env);

    env.mock_all_auths();
    let loan_id = manager.request_loan(&borrower, &1000);
    manager.approve_loan(&loan_id);

    env.mock_auths(&[]);

    manager.repay_loan(&loan_id, &500);
}
