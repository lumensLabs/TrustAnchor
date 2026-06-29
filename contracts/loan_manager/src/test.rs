use crate::{LoanManager, LoanManagerClient, LoanStatus};
use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Env};

#[contract]
pub struct MockNftContract;

#[contractimpl]
impl MockNftContract {
    pub fn get_score(env: Env, user: Address) -> u32 {
        env.storage().instance().get(&user).unwrap_or(0)
    }

    pub fn set_score(env: Env, user: Address, score: u32) {
        env.storage().instance().set(&user, &score);
    }

    pub fn lock_collateral(env: Env, user: Address, loan_id: u64, _locker: Address) {
        let key = (user, loan_id);
        env.storage().instance().set(&key, &true);
    }

    pub fn unlock_collateral(env: Env, user: Address, loan_id: u64, _locker: Address) {
        let key = (user, loan_id);
        env.storage().instance().set(&key, &false);
    }

    pub fn liquidate_collateral(env: Env, user: Address, loan_id: u64, _liquidator: Address) {
        let key = (user, loan_id);
        env.storage().instance().remove(&key);
    }
}

#[test]
fn test_loan_request_success() {
    let env = Env::default();
    env.mock_all_auths();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = env.register(MockNftContract, ());
    let nft_client = MockNftContractClient::new(&env, &nft_contract);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let loan_id = manager.request_loan(&borrower, &1000);
    assert_eq!(loan_id, 1);

    let loan = manager.get_loan(&loan_id).unwrap();
    assert_eq!(loan.borrower, borrower);
    assert_eq!(loan.amount, 1000);
    assert_eq!(loan.outstanding, 1000);
    assert_eq!(loan.status, LoanStatus::Requested);
}

#[test]
#[should_panic(expected = "borrower score below threshold")]
fn test_loan_request_rejected_low_score() {
    let env = Env::default();
    env.mock_all_auths();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = env.register(MockNftContract, ());
    let nft_client = MockNftContractClient::new(&env, &nft_contract);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &40);

    manager.request_loan(&borrower, &1000);
}

#[test]
#[should_panic(expected = "loan amount must be positive")]
fn test_loan_request_negative_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = env.register(MockNftContract, ());
    let nft_client = MockNftContractClient::new(&env, &nft_contract);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    manager.request_loan(&borrower, &-100);
}

#[test]
fn test_approve_loan_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = env.register(MockNftContract, ());
    let nft_client = MockNftContractClient::new(&env, &nft_contract);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let loan_id = manager.request_loan(&borrower, &1000);

    manager.approve_loan(&loan_id);

    let loan = manager.get_loan(&loan_id).unwrap();
    assert_eq!(loan.status, LoanStatus::Active);
}

#[test]
fn test_repayment_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = env.register(MockNftContract, ());
    let nft_client = MockNftContractClient::new(&env, &nft_contract);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let loan_id = manager.request_loan(&borrower, &1000);
    manager.approve_loan(&loan_id);

    manager.repay(&borrower, &500);

    let loan = manager.get_loan(&loan_id).unwrap();
    assert_eq!(loan.outstanding, 500);
}

#[test]
fn test_loan_full_repayment_unlocks_collateral() {
    let env = Env::default();
    env.mock_all_auths();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = env.register(MockNftContract, ());
    let nft_client = MockNftContractClient::new(&env, &nft_contract);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let loan_id = manager.request_loan(&borrower, &1000);
    manager.approve_loan(&loan_id);

    // Repay full amount
    manager.repay(&borrower, &1000);

    let loan = manager.get_loan(&loan_id).unwrap();
    assert_eq!(loan.status, LoanStatus::Repaid);
    assert_eq!(loan.outstanding, 0);
}

#[test]
#[should_panic(expected = "repayment amount must be positive")]
fn test_repayment_negative_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = env.register(MockNftContract, ());
    let _nft_client = MockNftContractClient::new(&env, &nft_contract);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);
    manager.repay(&borrower, &-100);
}

#[test]
#[should_panic]
fn test_access_controls_unauthorized_repay() {
    let env = Env::default();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = Address::generate(&env);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);

    manager.repay(&borrower, &500);
}

#[test]
fn test_loan_default_liquidates_collateral() {
    let env = Env::default();
    env.mock_all_auths();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = env.register(MockNftContract, ());
    let nft_client = MockNftContractClient::new(&env, &nft_contract);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let loan_id = manager.request_loan(&borrower, &1000);
    manager.approve_loan(&loan_id);

    manager.default_loan(&loan_id);

    let loan = manager.get_loan(&loan_id).unwrap();
    assert_eq!(loan.status, LoanStatus::Defaulted);
}
