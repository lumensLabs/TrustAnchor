//! End-to-end integration tests that wire together the real `remittance_nft`,
//! `lending_pool`, and `loan_manager` contracts (no mocks) to validate a
//! complete borrower journey: NFT issuance, collateralization, loan
//! disbursement from pool liquidity, interest accrual over time, and
//! repayment/liquidation.

use lending_pool::{LendingPool, LendingPoolClient};
use loan_manager::repayment;
use loan_manager::{LoanManager, LoanManagerClient, LoanStatus};
use remittance_nft::{RemittanceNFT, RemittanceNFTClient};
use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient};
use soroban_sdk::{Address, BytesN, Env};

const SECONDS_PER_DAY: u64 = 86_400;

struct Contracts<'a> {
    nft: RemittanceNFTClient<'a>,
    pool: LendingPoolClient<'a>,
    pool_id: Address,
    loans: LoanManagerClient<'a>,
    token: TokenClient<'a>,
    asset_admin: StellarAssetClient<'a>,
}

fn deploy(env: &Env) -> Contracts<'_> {
    let admin = Address::generate(env);

    // Settlement asset backing the lending pool.
    let token_contract = env.register_stellar_asset_contract_v2(admin.clone());
    let token_id = token_contract.address();
    let token = TokenClient::new(env, &token_id);
    let asset_admin = StellarAssetClient::new(env, &token_id);

    // Remittance history NFT / reputation contract.
    let nft_id = env.register(RemittanceNFT, ());
    let nft = RemittanceNFTClient::new(env, &nft_id);
    nft.initialize(&admin);

    // Loan manager wired to the real remittance NFT contract.
    let loans_id = env.register(LoanManager, ());
    let loans = LoanManagerClient::new(env, &loans_id);
    loans.initialize(&nft_id);

    // Loan manager must be authorized to lock/unlock/liquidate collateral.
    nft.authorize_minter(&loans_id);

    // Liquidity pool that capitalizes issued loans.
    let pool_id = env.register(LendingPool, ());
    let pool = LendingPoolClient::new(env, &pool_id);
    pool.initialize(&token_id);

    Contracts {
        nft,
        pool,
        pool_id,
        loans,
        token,
        asset_admin,
    }
}

fn history_hash(env: &Env, seed: u8) -> BytesN<32> {
    let mut bytes = [0u8; 32];
    bytes[0] = seed;
    BytesN::from_array(env, &bytes)
}

#[test]
fn test_full_loan_lifecycle_happy_path() {
    let env = Env::default();
    env.mock_all_auths();

    let c = deploy(&env);

    let liquidity_provider = Address::generate(&env);
    let borrower = Address::generate(&env);

    // 1. Mint a remittance history NFT recording the borrower's reputation.
    let initial_score = 600u32;
    c.nft
        .mint(&borrower, &initial_score, &history_hash(&env, 1), &None);
    assert_eq!(c.nft.get_score(&borrower), initial_score);
    assert!(!c.nft.is_collateral_locked(&borrower));

    // 2. Capitalize the pool with liquidity that will fund the loan.
    c.asset_admin.mint(&liquidity_provider, &50_000);
    c.pool.deposit(&liquidity_provider, &50_000);
    assert_eq!(c.pool.get_total_deposits(), 50_000);
    assert_eq!(c.token.balance(&c.pool_id), 50_000);

    // 3. Borrower requests a loan; this locks their NFT as collateral via a
    //    real cross-contract call into remittance_nft.
    let loan_amount = 10_000i128;
    let loan_id = c.loans.request_loan(&borrower, &loan_amount);
    let loan = c.loans.get_loan(&loan_id).unwrap();
    assert_eq!(loan.status, LoanStatus::Requested);
    assert_eq!(loan.outstanding, loan_amount);
    assert!(c.nft.is_collateral_locked(&borrower));
    assert_eq!(c.nft.get_collateral_loan(&borrower), Some(loan_id));

    // 4. Approve the loan.
    c.loans.approve_loan(&loan_id);
    assert_eq!(
        c.loans.get_loan(&loan_id).unwrap().status,
        LoanStatus::Active
    );

    // 5. Disburse tokens from pool liquidity to the borrower. The pool draws
    //    down the liquidity provider's deposit, which is then forwarded to
    //    the borrower (loan_manager and lending_pool are not yet wired
    //    on-chain, so the transfer is modeled explicitly here).
    c.pool.withdraw(&liquidity_provider, &loan_amount);
    c.token
        .transfer(&liquidity_provider, &borrower, &loan_amount);
    assert_eq!(c.token.balance(&borrower), loan_amount);
    assert_eq!(c.pool.get_total_deposits(), 50_000 - loan_amount);
    assert_eq!(c.token.balance(&c.pool_id), 50_000 - loan_amount);

    // 6. Simulate the passage of time via ledger modification and confirm
    //    interest / penalty accrual math for the loan's terms.
    let created_at = c.loans.get_loan(&loan_id).unwrap().created_at;
    let elapsed = SECONDS_PER_DAY * 180;
    env.ledger().with_mut(|li| {
        li.timestamp = created_at + elapsed;
    });
    let current_time = env.ledger().timestamp();

    let accrued_interest = repayment::calculate_interest(loan_amount, loan.interest_rate, elapsed);
    assert!(accrued_interest > 0);

    let outstanding_with_interest = repayment::calculate_outstanding_balance(
        loan_amount,
        loan.interest_rate,
        created_at,
        current_time,
        0,
    );
    assert_eq!(outstanding_with_interest, loan_amount + accrued_interest);

    // Loan was due after 90 days; 90 days overdue should accrue a penalty.
    let due_time = created_at + SECONDS_PER_DAY * 90;
    let penalty =
        repayment::calculate_penalty(loan_amount, loan.interest_rate, due_time, current_time);
    assert!(penalty > 0);

    // 7. Satisfy the loan: a partial repayment, then a final repayment that
    //    completes the lifecycle and unlocks collateral via a real
    //    cross-contract call.
    let partial_amount = 4_000i128;
    c.loans.repay(&borrower, &(loan_id as u32), &partial_amount);
    let loan_after_partial = c.loans.get_loan(&loan_id).unwrap();
    assert_eq!(loan_after_partial.status, LoanStatus::Active);
    assert_eq!(loan_after_partial.outstanding, loan_amount - partial_amount);
    assert!(c.nft.is_collateral_locked(&borrower));

    let remaining_amount = loan_amount - partial_amount;
    c.loans
        .repay(&borrower, &(loan_id as u32), &remaining_amount);
    let final_loan = c.loans.get_loan(&loan_id).unwrap();
    assert_eq!(final_loan.status, LoanStatus::Repaid);
    assert_eq!(final_loan.outstanding, 0);
    assert!(!c.nft.is_collateral_locked(&borrower));
    assert!(c.nft.get_collateral_loan(&borrower).is_none());

    // 8. Reward the borrower's reputation for having repaid in full.
    c.nft.update_score(&borrower, &loan_amount, &None);
    let expected_score = initial_score + (loan_amount / 100) as u32;
    assert_eq!(c.nft.get_score(&borrower), expected_score);
}

#[test]
fn test_loan_default_liquidates_collateral_end_to_end() {
    let env = Env::default();
    env.mock_all_auths();

    let c = deploy(&env);
    let borrower = Address::generate(&env);

    let initial_score = 200u32;
    c.nft
        .mint(&borrower, &initial_score, &history_hash(&env, 2), &None);

    let loan_id = c.loans.request_loan(&borrower, &5_000);
    c.loans.approve_loan(&loan_id);
    assert!(c.nft.is_collateral_locked(&borrower));

    c.loans.default_loan(&loan_id);

    let loan = c.loans.get_loan(&loan_id).unwrap();
    assert_eq!(loan.status, LoanStatus::Defaulted);

    // The real remittance_nft contract only clears the collateral lock on
    // liquidation; unlike the mock used in loan_manager's unit tests, it
    // does not erase the borrower's reputation score.
    assert!(!c.nft.is_collateral_locked(&borrower));
    assert!(c.nft.get_collateral_loan(&borrower).is_none());
    assert_eq!(c.nft.get_score(&borrower), initial_score);
}

#[test]
#[should_panic(expected = "borrower score below threshold")]
fn test_loan_request_rejected_for_low_reputation_score_end_to_end() {
    let env = Env::default();
    env.mock_all_auths();

    let c = deploy(&env);
    let borrower = Address::generate(&env);

    // Score below the loan manager's MIN_SCORE threshold.
    c.nft.mint(&borrower, &10, &history_hash(&env, 3), &None);

    c.loans.request_loan(&borrower, &1_000);
}
