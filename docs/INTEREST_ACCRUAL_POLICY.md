# Interest accrual numeric policy

Loan interest and penalty accrual use integer contract units and a fixed
year of 31,536,000 seconds:

    floor(principal * rate_bps * elapsed_seconds / (10,000 * 31,536,000))

## Rounding

The rounding direction is deliberately floor (toward zero for the positive
accrual domain). Tiny positive fractions can therefore produce a legitimate
zero result. Backend reconciliation uses the same exact formula before accepting
an observed accrued-interest value, so it does not confuse a documented
fractional floor with a suppressed overflow.

## Overflow

The contract never treats arithmetic overflow as zero interest. It carries the
rational quotient and remainder through each multiplication, avoiding a large
full numerator. This permits cases such as i128::MAX principal at 100% for one
year, whose final result is representable even though the naive intermediate
product is not.

If the final mathematical floor itself cannot fit i128, the contract panics
with "interest accrual overflow". Repayment-total additions likewise fail
loudly rather than saturating.

## Shared boundary vectors

fixtures/interest-boundaries.csv is consumed by both the Rust contract
regression source and the backend reconciliation regression source. It includes
normal accrual, a legitimate fractional zero, a large principal that overflowed
the old intermediate calculation, and the i128 one-year boundary.

The backend pre-persist gate is
backend/src/services/loanReconciliationService.ts. The current backend does not
yet contain a loan-history ingestion writer, so this change exposes the guard at
the reconciliation-service boundary instead of inventing an unattached database
write path. Any future loan-history indexer must call this gate before accepting
on-chain accrued interest.
