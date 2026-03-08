# RemitLend Contract Events

This document provides comprehensive documentation of all events emitted by the RemitLend smart contracts for backend indexing and monitoring.

## Event Overview

The RemitLend platform emits structured events for all critical state changes across three contracts:
- **RemittanceNFT**: Credit score and NFT management events
- **LoanManager**: Loan lifecycle events
- **LendingPool**: Liquidity management events

## RemittanceNFT Contract Events

### ContractInitialized
**Topics**: `(Symbol("ContractInitialized"), Symbol("RemittanceNFT"))`  
**Data**: `Address` (admin address)  
**Description**: Emitted when the NFT contract is initialized.

**Example**:
```javascript
{
  topics: ["ContractInitialized", "RemittanceNFT"],
  data: "GD5... (admin address)"
}
```

### MinterAuthorized
**Topics**: `(Symbol("MinterAuthorized"), Address)` (admin address)  
**Data**: `Address` (authorized minter)  
**Description**: Emitted when a new minter is authorized to mint NFTs.

**Example**:
```javascript
{
  topics: ["MinterAuthorized", "GD5... (admin)"],
  data: "GAB... (new minter)"
}
```

### MinterRevoked
**Topics**: `(Symbol("MinterRevoked"), Address)` (admin address)  
**Data**: `Address` (revoked minter)  
**Description**: Emitted when a minter's authorization is revoked.

**Example**:
```javascript
{
  topics: ["MinterRevoked", "GD5... (admin)"],
  data: "GAB... (revoked minter)"
}
```

### NFTMinted
**Topics**: `(Symbol("NFTMinted"), Address)` (user address)  
**Data**: `(u32, BytesN<32>)` (initial score, history hash)  
**Description**: Emitted when a new credit score NFT is minted for a user.

**Example**:
```javascript
{
  topics: ["NFTMinted", "GD5... (user)"],
  data: [750, "0x1234... (history hash)"]
}
```

### CreditScoreEstablished
**Topics**: `(Symbol("CreditScoreEstablished"), Address)` (user address)  
**Data**: `u32` (credit score)  
**Description**: Emitted when a user's initial credit score is established.

**Example**:
```javascript
{
  topics: ["CreditScoreEstablished", "GD5... (user)"],
  data: 750
}
```

### CreditScoreUpdated
**Topics**: `(Symbol("CreditScoreUpdated"), Address)` (user address)  
**Data**: `(u32, u32, i128)` (old score, new score, repayment amount)  
**Description**: Emitted when a user's credit score is updated after repayment.

**Example**:
```javascript
{
  topics: ["CreditScoreUpdated", "GD5... (user)"],
  data: [750, 760, 1000000000]
}
```

### RepaymentProcessed
**Topics**: `(Symbol("RepaymentProcessed"), Address)` (user address)  
**Data**: `i128` (repayment amount)  
**Description**: Emitted when a repayment is processed for credit score calculation.

**Example**:
```javascript
{
  topics: ["RepaymentProcessed", "GD5... (user)"],
  data: 1000000000
}
```

### HistoryHashUpdated
**Topics**: `(Symbol("HistoryHashUpdated"), Address)` (user address)  
**Data**: `(BytesN<32>, BytesN<32>)` (old hash, new hash)  
**Description**: Emitted when a user's remittance history hash is updated.

**Example**:
```javascript
{
  topics: ["HistoryHashUpdated", "GD5... (user)"],
  data: ["0x1234... (old)", "0x5678... (new)"]
}
```

## LoanManager Contract Events

### ContractInitialized
**Topics**: `(Symbol("ContractInitialized"), Symbol("LoanManager"))`  
**Data**: `Address` (NFT contract address)  
**Description**: Emitted when the loan manager contract is initialized.

**Example**:
```javascript
{
  topics: ["ContractInitialized", "LoanManager"],
  data: "GAB... (NFT contract)"
}
```

### LoanRequested
**Topics**: `(Symbol("LoanRequested"), Address)` (borrower address)  
**Data**: `(i128, u32, u32, u32)` (amount, loan_id, credit_score, interest_rate)  
**Description**: Emitted when a new loan is requested.

**Example**:
```javascript
{
  topics: ["LoanRequested", "GD5... (borrower)"],
  data: [1000000000, 1, 750, 5]
}
```

### LoanApproved
**Topics**: `(Symbol("LoanApproved"), u32)` (loan_id)  
**Data**: `(Address, i128, u32)` (borrower, amount, interest_rate)  
**Description**: Emitted when a loan is approved.

**Example**:
```javascript
{
  topics: ["LoanApproved", 1],
  data: ["GD5... (borrower)", 1000000000, 5]
}
```

### LoanActivated
**Topics**: `(Symbol("LoanActivated"), u32)` (loan_id)  
**Data**: `(Address, i128, Address)` (borrower, amount, lending_pool)  
**Description**: Emitted when a loan is activated and funds are allocated.

**Example**:
```javascript
{
  topics: ["LoanActivated", 1],
  data: ["GD5... (borrower)", 1000000000, "GAB... (lending pool)"]
}
```

### LoanRepaid
**Topics**: `(Symbol("LoanRepaid"), Address)` (borrower address)  
**Data**: `(u32, i128, bool)` (loan_id, amount, fully_repaid)  
**Description**: Emitted when a loan repayment is made.

**Example**:
```javascript
{
  topics: ["LoanRepaid", "GD5... (borrower)"],
  data: [1, 1000000000, true]
}
```

### LoanDefaulted
**Topics**: `(Symbol("LoanDefaulted"), u32)` (loan_id)  
**Data**: `(Address, i128)` (borrower, amount)  
**Description**: Emitted when a loan is defaulted.

**Example**:
```javascript
{
  topics: ["LoanDefaulted", 1],
  data: ["GD5... (borrower)", 1000000000]
}
```

## LendingPool Contract Events

### ContractInitialized
**Topics**: `(Symbol("ContractInitialized"), Symbol("LendingPool"))`  
**Data**: `Address` (token contract address)  
**Description**: Emitted when the lending pool contract is initialized.

**Example**:
```javascript
{
  topics: ["ContractInitialized", "LendingPool"],
  data: "GAB... (token contract)"
}
```

### Deposit
**Topics**: `(Symbol("Deposit"), Address)` (provider address)  
**Data**: `(i128, u64, i128)` (amount, shares, total_deposits)  
**Description**: Emitted when funds are deposited into the lending pool.

**Example**:
```javascript
{
  topics: ["Deposit", "GD5... (provider)"],
  data: [1000000000, 1000000000, 5000000000]
}
```

### Withdrawal
**Topics**: `(Symbol("Withdrawal"), Address)` (provider address)  
**Data**: `(i128, u64, i128)` (amount, shares_removed, remaining_balance)  
**Description**: Emitted when funds are withdrawn from the lending pool.

**Example**:
```javascript
{
  topics: ["Withdrawal", "GD5... (provider)"],
  data: [500000000, 500000000, 1500000000]
}
```

### FundsAllocated
**Topics**: `(Symbol("FundsAllocated"), u32)` (loan_id)  
**Data**: `(i128, i128, i128)` (amount, available_liquidity, total_allocated)  
**Description**: Emitted when funds are allocated for a loan.

**Example**:
```javascript
{
  topics: ["FundsAllocated", 1],
  data: [1000000000, 4000000000, 2000000000]
}
```

### FundsReturned
**Topics**: `(Symbol("FundsReturned"), u32)` (loan_id)  
**Data**: `(i128, i128, i128)` (amount, available_liquidity, total_allocated)  
**Description**: Emitted when funds are returned from a loan repayment.

**Example**:
```javascript
{
  topics: ["FundsReturned", 1],
  data: [1050000000, 5050000000, 950000000]
}
```

### PoolUpdated
**Topics**: `Symbol("PoolUpdated")`  
**Data**: `(i128, i128, u64)` (total_deposits, available_liquidity, total_shares)  
**Description**: Emitted when pool statistics are updated.

**Example**:
```javascript
{
  topics: ["PoolUpdated"],
  data: [5000000000, 4000000000, 5000000000]
}
```

## Event Indexing Strategy

### Primary Indexing Keys

1. **User Address**: Index all events by user address for user-specific activity feeds
2. **Loan ID**: Index loan-related events by loan_id for loan lifecycle tracking
3. **Timestamp**: Index all events by timestamp for chronological ordering
4. **Event Type**: Index by event type for event-specific analytics

### Recommended Database Schema

```sql
-- Events table
CREATE TABLE contract_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    contract_address VARCHAR(56) NOT NULL,
    topics JSONB NOT NULL,
    data JSONB NOT NULL,
    timestamp BIGINT NOT NULL,
    ledger_number BIGINT NOT NULL,
    transaction_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_events_type ON contract_events(event_type);
CREATE INDEX idx_events_timestamp ON contract_events(timestamp);
CREATE INDEX idx_events_user ON contract_events USING GIN(topics) WHERE topics ? 'Address';
CREATE INDEX idx_events_loan_id ON contract_events USING GIN(data) WHERE data ? 'loan_id';
CREATE INDEX idx_events_contract ON contract_events(contract_address);

-- User activity aggregation
CREATE MATERIALIZED VIEW user_activity AS
SELECT 
    (topics->>1) as user_address,
    event_type,
    data,
    timestamp,
    ledger_number
FROM contract_events 
WHERE topics->>0 IN ('NFTMinted', 'CreditScoreUpdated', 'LoanRequested', 'LoanRepaid', 'Deposit', 'Withdrawal');

-- Loan lifecycle tracking
CREATE MATERIALIZED VIEW loan_lifecycle AS
SELECT 
    (data->>'loan_id')::integer as loan_id,
    event_type,
    topics,
    data,
    timestamp,
    ledger_number
FROM contract_events 
WHERE event_type IN ('LoanRequested', 'LoanApproved', 'LoanActivated', 'LoanRepaid', 'LoanDefaulted', 'FundsAllocated', 'FundsReturned');
```

### Real-time Event Processing

```javascript
// Example event processor for backend
class EventProcessor {
    async processEvent(event) {
        const { topics, data, event_type } = event;
        
        switch(event_type) {
            case 'LoanRequested':
                await this.handleLoanRequested(topics, data);
                break;
            case 'CreditScoreUpdated':
                await this.handleCreditScoreUpdated(topics, data);
                break;
            case 'Deposit':
                await this.handleDeposit(topics, data);
                break;
            // ... handle other event types
        }
    }
    
    async handleLoanRequested(topics, data) {
        const borrower = topics[1];
        const [amount, loanId, creditScore, interestRate] = data;
        
        // Update user's loan requests
        await db.users.updateOne(
            { address: borrower },
            { 
                $push: { loan_requests: loanId },
                $set: { last_activity: new Date() }
            }
        );
        
        // Create loan record
        await db.loans.insertOne({
            loan_id: loanId,
            borrower,
            amount,
            credit_score: creditScore,
            interest_rate: interestRate,
            status: 'requested',
            created_at: new Date()
        });
        
        // Trigger notifications
        await this.notifyLoanRequested(borrower, loanId, amount);
    }
    
    async handleCreditScoreUpdated(topics, data) {
        const user = topics[1];
        const [oldScore, newScore, repaymentAmount] = data;
        
        // Update user's credit score
        await db.users.updateOne(
            { address: user },
            { 
                $set: { 
                    credit_score: newScore,
                    last_score_update: new Date()
                }
            }
        );
        
        // Log credit score history
        await db.credit_history.insertOne({
            user,
            old_score: oldScore,
            new_score: newScore,
            repayment_amount: repaymentAmount,
            timestamp: new Date()
        });
    }
}
```

### Event Monitoring and Alerts

```javascript
// Example monitoring setup
class EventMonitor {
    setupAlerts() {
        // Monitor large loan requests
        this.onEvent('LoanRequested', async (event) => {
            const [amount] = event.data;
            if (amount > 10000000000) { // > 10,000 tokens
                await this.sendAlert('Large loan requested', event);
            }
        });
        
        // Monitor credit score drops
        this.onEvent('CreditScoreUpdated', async (event) => {
            const [oldScore, newScore] = event.data;
            if (newScore < oldScore - 50) {
                await this.sendAlert('Significant credit score drop', event);
            }
        });
        
        // Monitor pool liquidity
        this.onEvent('PoolUpdated', async (event) => {
            const [, availableLiquidity] = event.data;
            if (availableLiquidity < 1000000000) { // < 1,000 tokens
                await this.sendAlert('Low pool liquidity', event);
            }
        });
    }
}
```

## Event Data Types Reference

### Stellar Address Format
- String representation of Stellar public key
- Example: `"GD5DJQDQGYJ5HITZ2J4DQZMIT4B4NGZQGQJY4J5BQ4Z4Z4Z4Z4Z4Z4Z4"`

### Amount Format
- `i128` integer representing smallest currency unit
- Example: `1000000000` = 1,000 tokens (assuming 7 decimals)

### Timestamp Format
- Unix timestamp in seconds
- Example: `1704067200` = January 1, 2024 00:00:00 UTC

### Hash Format
- 32-byte hex string for history hashes
- Example: `"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"`

## Best Practices for Event Consumption

1. **Idempotency**: Design event processors to be idempotent in case of duplicate events
2. **Ordering**: Process events in chronological order within each transaction
3. **Error Handling**: Implement robust error handling and retry mechanisms
4. **Monitoring**: Monitor event processing lag and alert on delays
5. **Validation**: Validate event data structure before processing
6. **Backup**: Store raw events for audit and reprocessing capabilities

## Testing Event Processing

```javascript
// Example test for event processing
describe('Event Processing', () => {
    it('should process LoanRequested event correctly', async () => {
        const mockEvent = {
            event_type: 'LoanRequested',
            topics: ['LoanRequested', 'GD5...'],
            data: [1000000000, 1, 750, 5],
            timestamp: 1704067200
        };
        
        await eventProcessor.processEvent(mockEvent);
        
        const loan = await db.loans.findOne({ loan_id: 1 });
        expect(loan).toBeDefined();
        expect(loan.amount).toBe(1000000000);
        expect(loan.status).toBe('requested');
    });
});
```

This comprehensive event system provides full visibility into all contract operations and enables robust backend indexing, monitoring, and analytics for the RemitLend platform.
