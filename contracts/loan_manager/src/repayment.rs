const SECONDS_PER_YEAR: i128 = 31_536_000;
const BPS_DENOMINATOR: i128 = 10_000;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct RepaymentBreakdown {
    pub principal_remaining: i128,
    pub accrued_interest: i128,
    pub penalty_fee: i128,
    pub total_due: i128,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PaymentAllocation {
    pub penalty_paid: i128,
    pub interest_paid: i128,
    pub principal_paid: i128,
    pub excess_paid: i128,
}

pub fn calculate_interest(principal: i128, rate_bps: u32, elapsed_seconds: u64) -> i128 {
    if principal <= 0 || rate_bps == 0 || elapsed_seconds == 0 {
        return 0;
    }

    let rate = rate_bps as i128;
    let time = elapsed_seconds as i128;

    let numerator = match principal.checked_mul(rate).and_then(|val| val.checked_mul(time)) {
        Some(n) => n,
        None => return 0,
    };

    let denominator = BPS_DENOMINATOR * SECONDS_PER_YEAR;
    numerator / denominator
}

pub fn calculate_penalty(
    principal: i128,
    penalty_rate_bps: u32,
    due_time: u64,
    current_time: u64,
) -> i128 {
    if current_time <= due_time || penalty_rate_bps == 0 || principal <= 0 {
        return 0;
    }

    let overdue_seconds = current_time - due_time;
    calculate_interest(principal, penalty_rate_bps, overdue_seconds)
}

pub fn calculate_repayment_breakdown(
    principal: i128,
    rate_bps: u32,
    penalty_rate_bps: u32,
    start_time: u64,
    due_time: u64,
    current_time: u64,
    amount_repaid: i128,
) -> RepaymentBreakdown {
    if principal <= 0 {
        return RepaymentBreakdown {
            principal_remaining: 0,
            accrued_interest: 0,
            penalty_fee: 0,
            total_due: 0,
        };
    }

    let elapsed = current_time.saturating_sub(start_time);
    let interest = calculate_interest(principal, rate_bps, elapsed);
    let penalty = calculate_penalty(principal, penalty_rate_bps, due_time, current_time);

    let gross_total = principal.saturating_add(interest).saturating_add(penalty);
    let net_total = gross_total.saturating_sub(amount_repaid);

    if net_total <= 0 {
        return RepaymentBreakdown {
            principal_remaining: 0,
            accrued_interest: 0,
            penalty_fee: 0,
            total_due: 0,
        };
    }

    let mut paid = amount_repaid.max(0);

    let penalty_paid = penalty.min(paid);
    let penalty_remaining = penalty - penalty_paid;
    paid -= penalty_paid;

    let interest_paid = interest.min(paid);
    let interest_remaining = interest - interest_paid;
    paid -= interest_paid;

    let principal_paid = principal.min(paid);
    let principal_remaining = principal - principal_paid;

    let total_due = penalty_remaining
        .saturating_add(interest_remaining)
        .saturating_add(principal_remaining);

    RepaymentBreakdown {
        principal_remaining,
        accrued_interest: interest_remaining,
        penalty_fee: penalty_remaining,
        total_due,
    }
}


pub fn calculate_outstanding_balance(
    principal: i128,
    rate_bps: u32,
    start_time: u64,
    current_time: u64,
    amount_repaid: i128,
) -> i128 {
    calculate_repayment_breakdown(
        principal,
        rate_bps,
        0,
        start_time,
        u64::MAX,
        current_time,
        amount_repaid,
    )
    .total_due
}

pub fn allocate_payment(breakdown: &RepaymentBreakdown, payment: i128) -> PaymentAllocation {
    if payment <= 0 {
        return PaymentAllocation {
            penalty_paid: 0,
            interest_paid: 0,
            principal_paid: 0,
            excess_paid: 0,
        };
    }

    let mut rem = payment;

    let penalty_paid = breakdown.penalty_fee.min(rem);
    rem -= penalty_paid;

    let interest_paid = breakdown.accrued_interest.min(rem);
    rem -= interest_paid;

    let principal_paid = breakdown.principal_remaining.min(rem);
    rem -= principal_paid;

    PaymentAllocation {
        penalty_paid,
        interest_paid,
        principal_paid,
        excess_paid: rem,
    }
}

#[cfg(test)]
mod repayment_tests {
    use super::*;

    #[test]
    fn test_calculate_interest_one_year() {
        // 10,000 principal at 500 bps (5%) for 1 year (31,536,000 sec) = 500
        let interest = calculate_interest(10_000, 500, 31_536_000);
        assert_eq!(interest, 500);
    }

    #[test]
    fn test_calculate_interest_zero_cases() {
        assert_eq!(calculate_interest(0, 500, 31_536_000), 0);
        assert_eq!(calculate_interest(10_000, 0, 31_536_000), 0);
        assert_eq!(calculate_interest(10_000, 500, 0), 0);
    }

    #[test]
    fn test_calculate_penalty_overdue() {
        // Principal 10,000, penalty rate 200 bps (2%), overdue by 1 year = 200
        let penalty = calculate_penalty(10_000, 200, 1_000, 1_000 + 31_536_000);
        assert_eq!(penalty, 200);

        // Not overdue yet
        let no_penalty = calculate_penalty(10_000, 200, 1_000, 900);
        assert_eq!(no_penalty, 0);
    }

    #[test]
    fn test_breakdown_and_allocation() {
        // 10,000 principal, 5% rate, 2% penalty rate
        // start: 0, due: 31,536,000 (1 yr), current: 63,072,000 (2 yrs -> 2 yrs interest + 1 yr penalty)
        // 2 yrs interest = 1,000. 1 yr penalty = 200. Total gross = 11,200
        let breakdown = calculate_repayment_breakdown(
            10_000,
            500,
            200,
            0,
            31_536_000,
            63_072_000,
            0,
        );

        assert_eq!(breakdown.principal_remaining, 10_000);
        assert_eq!(breakdown.accrued_interest, 1_000);
        assert_eq!(breakdown.penalty_fee, 200);
        assert_eq!(breakdown.total_due, 11_200);

        let allocation = allocate_payment(&breakdown, 1_500);
        assert_eq!(allocation.penalty_paid, 200);
        assert_eq!(allocation.interest_paid, 1_000);
        assert_eq!(allocation.principal_paid, 300);
        assert_eq!(allocation.excess_paid, 0);
    }
}

