#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol};
use soroban_sdk::token::Client as TokenClient;

#[contracttype]
#[derive(Clone, Debug)]
pub struct Deposit {
    pub provider: Address,
    pub amount: i128,
    pub timestamp: u64,
    pub shares: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct PoolInfo {
    pub total_deposits: i128,
    pub total_shares: u64,
    pub available_liquidity: i128,
    pub allocated_funds: i128,
    pub last_updated: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Token,
    Deposit(Address),
    PoolInfo,
    LoanAllocation(u32),
    TotalAllocated,
}

#[contract]
pub struct LendingPool;

#[contractimpl]
impl LendingPool {
    pub fn initialize(env: Env, token: Address) {
        if env.storage().instance().has(&DataKey::Token) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Token, &token);
        
        // Initialize pool info
        let pool_info = PoolInfo {
            total_deposits: 0,
            total_shares: 0,
            available_liquidity: 0,
            allocated_funds: 0,
            last_updated: env.ledger().timestamp(),
        };
        env.storage().instance().set(&DataKey::PoolInfo, &pool_info);
        env.storage().instance().set(&DataKey::TotalAllocated, &0i128);
        
        // Emit initialization event
        env.events().publish(
            (Symbol::new(&env, "ContractInitialized"), Symbol::new(&env, "LendingPool")),
            token
        );
    }

    pub fn deposit(env: Env, provider: Address, amount: i128) {
        provider.require_auth();
        if amount <= 0 {
            panic!("deposit amount must be positive");
        }
        
        let token: Address = env.storage().instance().get(&DataKey::Token).expect("not initialized");
        let token_client = TokenClient::new(&env, &token);
        
        // Transfer tokens to contract
        token_client.transfer(&provider, &env.current_contract_address(), &amount);
        
        // Update deposit
        let key = DataKey::Deposit(provider.clone());
        let mut current_deposit: Deposit = env.storage().persistent().get(&key).unwrap_or(Deposit {
            provider: provider.clone(),
            amount: 0,
            timestamp: 0,
            shares: 0,
        });
        
        let _old_amount = current_deposit.amount;
        current_deposit.amount += amount;
        current_deposit.timestamp = env.ledger().timestamp();
        
        // Calculate shares (1 share per unit of currency)
        let shares = amount as u64;
        current_deposit.shares += shares;
        
        env.storage().persistent().set(&key, &current_deposit);
        
        // Update pool info
        let mut pool_info: PoolInfo = env.storage().instance().get(&DataKey::PoolInfo).expect("not initialized");
        pool_info.total_deposits += amount;
        pool_info.total_shares += shares;
        pool_info.available_liquidity += amount;
        pool_info.last_updated = env.ledger().timestamp();
        env.storage().instance().set(&DataKey::PoolInfo, &pool_info);
        
        // Emit deposit event
        env.events().publish(
            (Symbol::new(&env, "Deposit"), provider.clone()),
            (amount, current_deposit.shares, pool_info.total_deposits)
        );
        
        // Emit pool updated event
        env.events().publish(
            (Symbol::new(&env, "PoolUpdated"),),
            (pool_info.total_deposits, pool_info.available_liquidity, pool_info.total_shares)
        );
    }

    pub fn get_deposit(env: Env, provider: Address) -> Deposit {
        let key = DataKey::Deposit(provider.clone());
        env.storage().persistent().get(&key).unwrap_or(Deposit {
            provider,
            amount: 0,
            timestamp: 0,
            shares: 0,
        })
    }

    pub fn withdraw(env: Env, provider: Address, amount: i128) {
        provider.require_auth();
        if amount <= 0 {
            panic!("withdraw amount must be positive");
        }
        
        let key = DataKey::Deposit(provider.clone());
        let mut current_deposit: Deposit = env.storage().persistent().get(&key)
            .expect("no deposit found");
        
        if current_deposit.amount < amount {
            panic!("insufficient balance");
        }
        
        let token: Address = env.storage().instance().get(&DataKey::Token).expect("not initialized");
        let token_client = TokenClient::new(&env, &token);
        
        // Transfer tokens back to provider
        token_client.transfer(&env.current_contract_address(), &provider, &amount);
        
        // Update deposit
        current_deposit.amount -= amount;
        current_deposit.timestamp = env.ledger().timestamp();
        
        // Calculate shares to remove (proportional)
        let shares_to_remove = ((amount as u64) * current_deposit.shares) / (current_deposit.amount + amount) as u64;
        current_deposit.shares -= shares_to_remove;
        
        env.storage().persistent().set(&key, &current_deposit);
        
        // Update pool info
        let mut pool_info: PoolInfo = env.storage().instance().get(&DataKey::PoolInfo).expect("not initialized");
        pool_info.total_deposits -= amount;
        pool_info.total_shares -= shares_to_remove;
        pool_info.available_liquidity -= amount;
        pool_info.last_updated = env.ledger().timestamp();
        env.storage().instance().set(&DataKey::PoolInfo, &pool_info);
        
        // Emit withdrawal event
        env.events().publish(
            (Symbol::new(&env, "Withdrawal"), provider.clone()),
            (amount, shares_to_remove, current_deposit.amount)
        );
        
        // Emit pool updated event
        env.events().publish(
            (Symbol::new(&env, "PoolUpdated"),),
            (pool_info.total_deposits, pool_info.available_liquidity, pool_info.total_shares)
        );
    }
    
    pub fn allocate_funds(env: Env, loan_id: u32, amount: i128) {
        let mut pool_info: PoolInfo = env.storage().instance().get(&DataKey::PoolInfo).expect("not initialized");
        
        if pool_info.available_liquidity < amount {
            panic!("insufficient liquidity");
        }
        
        // Update pool info
        pool_info.available_liquidity -= amount;
        pool_info.allocated_funds += amount;
        pool_info.last_updated = env.ledger().timestamp();
        env.storage().instance().set(&DataKey::PoolInfo, &pool_info);
        
        // Track allocation
        env.storage().persistent().set(&DataKey::LoanAllocation(loan_id), &amount);
        
        let total_allocated = env.storage().instance().get(&DataKey::TotalAllocated).unwrap_or(0i128) + amount;
        env.storage().instance().set(&DataKey::TotalAllocated, &total_allocated);
        
        // Emit fund allocation event
        env.events().publish(
            (Symbol::new(&env, "FundsAllocated"), loan_id),
            (amount, pool_info.available_liquidity, total_allocated)
        );
    }
    
    pub fn return_funds(env: Env, loan_id: u32, amount: i128) {
        let mut pool_info: PoolInfo = env.storage().instance().get(&DataKey::PoolInfo).expect("not initialized");
        
        // Get original allocation
        let allocated_amount: i128 = env.storage().persistent().get(&DataKey::LoanAllocation(loan_id))
            .unwrap_or(0);
        
        if allocated_amount == 0 {
            panic!("no allocation found for loan");
        }
        
        // Update pool info
        pool_info.available_liquidity += amount;
        pool_info.allocated_funds -= allocated_amount.min(amount);
        pool_info.last_updated = env.ledger().timestamp();
        env.storage().instance().set(&DataKey::PoolInfo, &pool_info);
        
        // Update total allocated
        let total_allocated = env.storage().instance().get(&DataKey::TotalAllocated).unwrap_or(0i128) - allocated_amount.min(amount);
        env.storage().instance().set(&DataKey::TotalAllocated, &total_allocated);
        
        // Remove allocation if fully returned
        if amount >= allocated_amount {
            env.storage().persistent().remove(&DataKey::LoanAllocation(loan_id));
        }
        
        // Emit fund return event
        env.events().publish(
            (Symbol::new(&env, "FundsReturned"), loan_id),
            (amount, pool_info.available_liquidity, total_allocated)
        );
    }
    
    pub fn get_pool_info(env: Env) -> PoolInfo {
        env.storage().instance().get(&DataKey::PoolInfo).expect("not initialized")
    }
    
    pub fn get_available_liquidity(env: Env) -> i128 {
        let pool_info: PoolInfo = env.storage().instance().get(&DataKey::PoolInfo).expect("not initialized");
        pool_info.available_liquidity
    }
    
    pub fn get_total_allocated(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalAllocated).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
