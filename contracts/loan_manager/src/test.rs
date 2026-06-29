use crate::{LoanManager, LoanManagerClient, LoanStatus};
use soroban_sdk::{
    contract, contractimpl, contracttype,
    testutils::{Address as _, Ledger},
    Address, Env,
};

#[contracttype]
#[derive(Clone)]
enum MockDataKey {
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

    let loan = manager.get_loan(&loan_id);
    assert_eq!(loan.principal, 1000);
    assert_eq!(loan.status, LoanStatus::Requested);
}

#[test]
fn test_loan_request_locks_collateral() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    assert!(!nft_client.is_locked(&borrower));
    manager.request_loan(&borrower, &1000);
    assert!(nft_client.is_locked(&borrower));
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

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });

    let loan_id = manager.request_loan(&borrower, &10_000);
    manager.approve_loan(&loan_id);

    let loan = manager.get_loan(&loan_id);
    assert_eq!(loan.status, LoanStatus::Active);
    assert_eq!(loan.start_time, start_ts);
    assert_eq!(loan.due_time, start_ts + 31_536_000);
}

#[test]
#[should_panic(expected = "loan not in requested state")]
fn test_approve_already_active_loan() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let loan_id = manager.request_loan(&borrower, &10_000);
    manager.approve_loan(&loan_id);
    manager.approve_loan(&loan_id);
}

// ── Interest Calculation Tests ──

#[test]
fn test_interest_accrual_over_time() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });

    let loan_id = manager.request_loan(&borrower, &100_000);
    manager.approve_loan(&loan_id);

    let six_months: u64 = 31_536_000 / 2;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts + six_months;
    });

    let interest = manager.get_accrued_interest(&loan_id);
    assert_eq!(interest, 5000);
}

#[test]
fn test_interest_full_year() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });

    let loan_id = manager.request_loan(&borrower, &100_000);
    manager.approve_loan(&loan_id);

    env.ledger().with_mut(|li| {
        li.timestamp = start_ts + 31_536_000;
    });

    let interest = manager.get_accrued_interest(&loan_id);
    assert_eq!(interest, 10_000);
}

#[test]
fn test_no_interest_before_activation() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let loan_id = manager.request_loan(&borrower, &100_000);

    let interest = manager.get_accrued_interest(&loan_id);
    assert_eq!(interest, 0);
}

// ── Outstanding Balance Tests ──

#[test]
fn test_outstanding_balance_at_start() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });

    let loan_id = manager.request_loan(&borrower, &100_000);
    manager.approve_loan(&loan_id);

    let balance = manager.get_outstanding_balance(&loan_id);
    assert_eq!(balance, 100_000);
}

#[test]
fn test_outstanding_balance_with_interest() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });

    let loan_id = manager.request_loan(&borrower, &100_000);
    manager.approve_loan(&loan_id);

    env.ledger().with_mut(|li| {
        li.timestamp = start_ts + 31_536_000;
    });

    let balance = manager.get_outstanding_balance(&loan_id);
    assert_eq!(balance, 110_000);
}

// ── Penalty Tests ──

#[test]
fn test_no_penalty_before_due() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });

    let loan_id = manager.request_loan(&borrower, &100_000);
    manager.approve_loan(&loan_id);

    env.ledger().with_mut(|li| {
        li.timestamp = start_ts + 31_536_000 / 2;
    });

    let penalty = manager.get_penalty(&loan_id);
    assert_eq!(penalty, 0);
}

#[test]
fn test_penalty_after_due() {
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

    let penalty = manager.get_penalty(&loan_id);
    assert_eq!(penalty, 2500);
}

#[test]
fn test_outstanding_balance_includes_penalty() {
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
}

// ── Repayment Tests ──

#[test]
fn test_partial_repayment() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });

    let loan_id = manager.request_loan(&borrower, &100_000);
    manager.approve_loan(&loan_id);

    env.ledger().with_mut(|li| {
        li.timestamp = start_ts + 31_536_000 / 2;
    });

    manager.repay(&borrower, &loan_id, &50_000);

    let loan = manager.get_loan(&loan_id);
    assert_eq!(loan.amount_repaid, 50_000);
    assert_eq!(loan.status, LoanStatus::Active);

    let balance = manager.get_outstanding_balance(&loan_id);
    assert_eq!(balance, 55_000);
}

#[test]
fn test_partial_repayment_keeps_collateral_locked() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });

    let loan_id = manager.request_loan(&borrower, &100_000);
    manager.approve_loan(&loan_id);

    manager.repay(&borrower, &loan_id, &50_000);

    assert!(nft_client.is_locked(&borrower));
}

#[test]
fn test_full_repayment_unlocks_collateral() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });

    let loan_id = manager.request_loan(&borrower, &100_000);
    manager.approve_loan(&loan_id);

    env.ledger().with_mut(|li| {
        li.timestamp = start_ts + 31_536_000;
    });

    assert!(nft_client.is_locked(&borrower));
    manager.repay(&borrower, &loan_id, &110_000);

    let loan = manager.get_loan(&loan_id);
    assert_eq!(loan.status, LoanStatus::Repaid);
    assert!(!nft_client.is_locked(&borrower));
}

#[test]
fn test_can_request_new_loan_after_repayment() {
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

    let new_loan_id = manager.request_loan(&borrower, &20_000);
    assert_eq!(new_loan_id, 2);
}

#[test]
#[should_panic(expected = "repayment amount must be positive")]
fn test_repayment_negative_amount() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });

    let loan_id = manager.request_loan(&borrower, &100_000);
    manager.approve_loan(&loan_id);

    manager.repay(&borrower, &loan_id, &-100);
}

#[test]
#[should_panic(expected = "repayment exceeds outstanding balance")]
fn test_repayment_exceeds_balance() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });

    let loan_id = manager.request_loan(&borrower, &10_000);
    manager.approve_loan(&loan_id);

    manager.repay(&borrower, &loan_id, &20_000);
}

#[test]
#[should_panic(expected = "not the loan borrower")]
fn test_repayment_wrong_borrower() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    let other = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });

    let loan_id = manager.request_loan(&borrower, &10_000);
    manager.approve_loan(&loan_id);

    manager.repay(&other, &loan_id, &5_000);
}

#[test]
#[should_panic(expected = "loan not active")]
fn test_repayment_on_requested_loan() {
    let (env, manager, nft_client, _) = setup_env();

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let loan_id = manager.request_loan(&borrower, &10_000);

    manager.repay(&borrower, &loan_id, &5_000);
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

    let borrower = Address::generate(&env);
    nft_client.set_score(&borrower, &100);

    let start_ts: u64 = 1_000_000;
    env.ledger().with_mut(|li| {
        li.timestamp = start_ts;
    });

    let loan_id = manager.request_loan(&borrower, &100_000);
    manager.approve_loan(&loan_id);

    env.ledger().with_mut(|li| {
        li.timestamp = start_ts + 31_536_000 + 1;
    });

    manager.liquidate(&loan_id);
    manager.liquidate(&loan_id);
}

// ── Pure Math Function Tests ──

#[test]
fn test_calculate_interest_zero_principal() {
    let interest = crate::repayment::calculate_interest(0, 1000, 31_536_000);
    assert_eq!(interest, 0);
}

#[test]
fn test_calculate_interest_zero_rate() {
    let interest = crate::repayment::calculate_interest(100_000, 0, 31_536_000);
    assert_eq!(interest, 0);
}

#[test]
fn test_calculate_interest_zero_time() {
    let interest = crate::repayment::calculate_interest(100_000, 1000, 0);
    assert_eq!(interest, 0);
}

#[test]
fn test_calculate_interest_one_year() {
    let interest = crate::repayment::calculate_interest(100_000, 1000, 31_536_000);
    assert_eq!(interest, 10_000);
}

#[test]
fn test_calculate_interest_quarter_year() {
    let interest = crate::repayment::calculate_interest(100_000, 1000, 31_536_000 / 4);
    assert_eq!(interest, 2_500);
}

#[test]
fn test_calculate_outstanding_balance_no_repayment() {
    let balance = crate::repayment::calculate_outstanding_balance(100_000, 1000, 0, 31_536_000, 0);
    assert_eq!(balance, 110_000);
}

#[test]
fn test_calculate_outstanding_balance_with_repayment() {
    let balance =
        crate::repayment::calculate_outstanding_balance(100_000, 1000, 0, 31_536_000, 60_000);
    assert_eq!(balance, 50_000);
}

#[test]
fn test_calculate_outstanding_balance_overpaid_returns_zero() {
    let balance =
        crate::repayment::calculate_outstanding_balance(100_000, 1000, 0, 31_536_000, 200_000);
    assert_eq!(balance, 0);
}

#[test]
fn test_calculate_penalty_before_due() {
    let penalty = crate::repayment::calculate_penalty(100_000, 500, 31_536_000, 0);
    assert_eq!(penalty, 0);
}

#[test]
fn test_calculate_penalty_at_due() {
    let penalty = crate::repayment::calculate_penalty(100_000, 500, 31_536_000, 31_536_000);
    assert_eq!(penalty, 0);
}

#[test]
fn test_calculate_penalty_one_year_overdue() {
    let penalty = crate::repayment::calculate_penalty(100_000, 500, 0, 31_536_000);
    assert_eq!(penalty, 5_000);
}
