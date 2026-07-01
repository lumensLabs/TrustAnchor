const SECONDS_PER_YEAR: i128 = 31_536_000;
const BPS_DENOMINATOR: i128 = 10_000;

pub fn calculate_interest(principal: i128, rate_bps: u32, elapsed_seconds: u64) -> i128 {
    if principal <= 0 || rate_bps == 0 || elapsed_seconds == 0 {
        return 0;
    }

    let rate = rate_bps as i128;
    let time = elapsed_seconds as i128;

    principal * rate * time / (BPS_DENOMINATOR * SECONDS_PER_YEAR)
}

pub fn calculate_outstanding_balance(
    principal: i128,
    rate_bps: u32,
    start_time: u64,
    current_time: u64,
    amount_repaid: i128,
) -> i128 {
    let elapsed = current_time.saturating_sub(start_time);

    let interest = calculate_interest(principal, rate_bps, elapsed);
    let balance = principal + interest - amount_repaid;

    if balance < 0 {
        0
    } else {
        balance
    }
}

pub fn calculate_penalty(
    principal: i128,
    penalty_rate_bps: u32,
    due_time: u64,
    current_time: u64,
) -> i128 {
    if current_time <= due_time || penalty_rate_bps == 0 {
        return 0;
    }

    let overdue_seconds = current_time - due_time;
    calculate_interest(principal, penalty_rate_bps, overdue_seconds)
}
