use crate::{LoanManager, LoanManagerClient, LoanStatus};
use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Env};

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

    pub fn lock_collateral(env: Env, user: Address, _locker: Address) {
        let key = MockDataKey::Locked(user);
        if env.storage().persistent().has(&key) {
            panic!("collateral already locked");
        }
        env.storage().persistent().set(&key, &true);
    }

    pub fn unlock_collateral(env: Env, user: Address, _locker: Address) {
        let key = MockDataKey::Locked(user);
        if !env.storage().persistent().has(&key) {
            panic!("collateral not locked");
        }
        env.storage().persistent().remove(&key);
    }

    pub fn is_locked(env: Env, user: Address) -> bool {
        env.storage().persistent().has(&MockDataKey::Locked(user))
    }

    pub fn seize_collateral(env: Env, user: Address, _locker: Address) {
        env.storage()
            .persistent()
            .remove(&MockDataKey::Locked(user.clone()));
        env.storage().instance().remove(&MockDataKey::Score(user));
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
fn test_approve_loan() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    manager.request_loan(&borrower, &-100);
}

#[test]
fn test_approve_loan_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

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

// ── Interest Calculation Tests ──

#[test]
fn test_interest_accrual_over_time() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

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
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let nft_contract = env.register(MockNftContract, ());
    let _nft_client = MockNftContractClient::new(&env, &nft_contract);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);
    manager.repay(&borrower, &-100);
}

#[test]
#[should_panic]
fn test_repayment_unauthorized() {
    let env = Env::default();

    let loan_manager_id = env.register(LoanManager, ());
    let manager = LoanManagerClient::new(&env, &loan_manager_id);

    let nft_contract = env.register(MockNftContract, ());
    let nft_client = MockNftContractClient::new(&env, &nft_contract);
    manager.initialize(&nft_contract);

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    env.mock_all_auths();
    let loan_id = manager.request_loan(&borrower, &10_000);

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });
    manager.approve_loan(&loan_id);

    env.mock_auths(&[]);
    manager.repay(&borrower, &loan_id, &5_000);
}

#[test]
fn test_repayment_with_penalty_full_payoff() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });

    let loan_id = manager.request_loan(&borrower, &100_000);
    manager.approve_loan(&loan_id);

    let one_and_half_years: u64 = 31_536_000 + 31_536_000 / 2;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts + one_and_half_years;
    });

    let balance = manager.get_outstanding_balance(&loan_id);
    assert_eq!(balance, 117_500);

    manager.repay(&borrower, &loan_id, &117_500);

    let loan = manager.get_loan(&loan_id);
    assert_eq!(loan.status, LoanStatus::Repaid);
    assert!(!nft_client.is_locked(&borrower));
}

// ── Liquidation Tests ──

#[test]
fn test_liquidate_overdue_loan() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });

    let loan_id = manager.request_loan(&borrower, &100_000);
    manager.approve_loan(&loan_id);

    // Advance past due date
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts + 31_536_000 + 1;
    });

    manager.liquidate(&loan_id);

    let loan = manager.get_loan(&loan_id);
    assert_eq!(loan.status, LoanStatus::Defaulted);

    // NFT should be seized (score gone, not locked)
    assert_eq!(nft_client.get_score(&borrower), 0);
    assert!(!nft_client.is_locked(&borrower));
}

#[test]
#[should_panic(expected = "loan not yet overdue")]
fn test_cannot_liquidate_before_due() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });

    let loan_id = manager.request_loan(&borrower, &100_000);
    manager.approve_loan(&loan_id);

    // Still within loan duration
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts + 31_536_000 / 2;
    });

    manager.liquidate(&loan_id);
}

#[test]
#[should_panic(expected = "loan not active")]
fn test_cannot_liquidate_repaid_loan() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });

    let loan_id = manager.request_loan(&borrower, &10_000);
    manager.approve_loan(&loan_id);

    manager.repay(&borrower, &loan_id, &10_000);

    env.ledger().with_mut(|li| {
        li.timestamp = start_ts + 31_536_000 + 1;
    });

    manager.liquidate(&loan_id);
}

#[test]
#[should_panic(expected = "loan not active")]
fn test_cannot_liquidate_requested_loan() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let loan_id = manager.request_loan(&borrower, &10_000);

    manager.liquidate(&loan_id);
}

#[test]
#[should_panic(expected = "loan not active")]
fn test_cannot_double_liquidate() {
    let (env, manager, nft_client, _) = setup_env();

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
