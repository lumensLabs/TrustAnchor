use crate::{LoanManager, LoanManagerClient, LoanStatus};
use soroban_sdk::{contract, contractimpl, contracttype, testutils::Address as _, Address, Env};

#[contracttype]
#[derive(Clone)]
pub enum MockDataKey {
    Score(Address),
    Locked(Address),
}

#[contract]
pub struct MockNftContract;

#[contractimpl]
impl MockNftContract {
    pub fn get_score(env: Env, user: Address) -> u32 {
        env.storage()
            .instance()
            .get(&MockDataKey::Score(user))
            .unwrap_or(0)
    }

    pub fn set_score(env: Env, user: Address, score: u32) {
        env.storage()
            .instance()
            .set(&MockDataKey::Score(user), &score);
    }

    pub fn lock_collateral(env: Env, user: Address, _loan_id: u64, _locker: Address) {
        let key = MockDataKey::Locked(user);
        if env.storage().persistent().has(&key) {
            panic!("collateral already locked");
        }
        env.storage().persistent().set(&key, &true);
    }

    pub fn unlock_collateral(env: Env, user: Address, _loan_id: u64, _locker: Address) {
        let key = MockDataKey::Locked(user);
        env.storage().persistent().remove(&key);
    }

    pub fn liquidate_collateral(env: Env, user: Address, _loan_id: u64, _liquidator: Address) {
        env.storage()
            .persistent()
            .remove(&MockDataKey::Locked(user.clone()));
        env.storage().instance().remove(&MockDataKey::Score(user));
    }

    pub fn is_locked(env: Env, user: Address) -> bool {
        env.storage().persistent().has(&MockDataKey::Locked(user))
    }
}

fn setup_env() -> (
    Env,
    LoanManagerClient<'static>,
    MockNftContractClient<'static>,
    Address,
) {
    let env = Env::default();
    env.mock_all_auths();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = env.register(MockNftContract, ());
    let nft_client = MockNftContractClient::new(&env, &nft_contract);
    manager.initialize(&nft_contract);

    (env, manager, nft_client, nft_contract)
}

// ── Loan Request Tests ──

#[test]
fn test_loan_request_success() {
    let (env, manager, nft_client, _) = setup_env();

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
#[should_panic(expected = "collateral already locked")]
fn test_cannot_request_second_loan_while_locked() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    manager.request_loan(&borrower, &1000);
    manager.request_loan(&borrower, &2000);
}

#[test]
fn test_sequential_loan_ids() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower1 = Address::generate(&env);
    let borrower2 = Address::generate(&env);
    nft_client.set_score(&borrower1, &100);
    nft_client.set_score(&borrower2, &100);

    let id1 = manager.request_loan(&borrower1, &1000);
    let id2 = manager.request_loan(&borrower2, &2000);
    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
}

#[test]
#[should_panic(expected = "borrower score below threshold")]
fn test_loan_request_rejected_low_score() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &40);

    manager.request_loan(&borrower, &1000);
}

#[test]
#[should_panic(expected = "loan amount must be positive")]
fn test_loan_request_negative_amount() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    manager.request_loan(&borrower, &-100);
}

// ── Loan Approval Tests ──

#[test]
fn test_approve_loan_flow() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let loan_id = manager.request_loan(&borrower, &1000);
    manager.approve_loan(&loan_id);

    let loan = manager.get_loan(&loan_id).unwrap();
    assert_eq!(loan.status, LoanStatus::Active);
}

// ── Repayment Tests ──

#[test]
fn test_partial_repayment_reduces_outstanding() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let loan_id = manager.request_loan(&borrower, &1000);
    manager.approve_loan(&loan_id);

    manager.repay(&borrower, &0, &500);

    let loan = manager.get_loan(&loan_id).unwrap();
    assert_eq!(loan.outstanding, 500);
    assert_eq!(loan.status, LoanStatus::Active);
}

#[test]
fn test_loan_full_repayment_unlocks_collateral() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let loan_id = manager.request_loan(&borrower, &1000);
    manager.approve_loan(&loan_id);
    assert!(nft_client.is_locked(&borrower));

    manager.repay(&borrower, &0, &1000);

    let loan = manager.get_loan(&loan_id).unwrap();
    assert_eq!(loan.status, LoanStatus::Repaid);
    assert_eq!(loan.outstanding, 0);
    assert!(!nft_client.is_locked(&borrower));
}

#[test]
#[should_panic(expected = "repayment amount must be positive")]
fn test_repayment_negative_amount() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let loan_id = manager.request_loan(&borrower, &1000);
    manager.approve_loan(&loan_id);

    manager.repay(&borrower, &0, &-100);
}

#[test]
#[should_panic(expected = "repayment exceeds outstanding amount")]
fn test_repayment_exceeds_outstanding() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let loan_id = manager.request_loan(&borrower, &1000);
    manager.approve_loan(&loan_id);

    manager.repay(&borrower, &0, &2000);
}

// ── Default / Liquidation Tests ──

#[test]
fn test_loan_default_liquidates_collateral() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let loan_id = manager.request_loan(&borrower, &1000);
    manager.approve_loan(&loan_id);

    manager.default_loan(&loan_id);

    let loan = manager.get_loan(&loan_id).unwrap();
    assert_eq!(loan.status, LoanStatus::Defaulted);

    // NFT should be seized (score gone, not locked)
    assert_eq!(nft_client.get_score(&borrower), 0);
    assert!(!nft_client.is_locked(&borrower));
}

#[test]
#[should_panic(expected = "loan must be Active to default")]
fn test_cannot_default_requested_loan() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let loan_id = manager.request_loan(&borrower, &1000);

    manager.default_loan(&loan_id);
}
