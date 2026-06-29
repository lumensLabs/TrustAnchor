#![no_std]
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Token,
    Deposit(Address),
    TotalDeposits,
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
        env.storage()
            .persistent()
            .set(&DataKey::TotalDeposits, &(0i128));
    }

    pub fn deposit(env: Env, provider: Address, amount: i128) {
        provider.require_auth();
        if amount <= 0 {
            panic!("deposit amount must be positive");
        }
        let token: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .expect("not initialized");
        let token_client = TokenClient::new(&env, &token);
        token_client.transfer(&provider, &env.current_contract_address(), &amount);
        let key = DataKey::Deposit(provider.clone());
        let mut current_balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        current_balance += amount;
        env.storage().persistent().set(&key, &current_balance);
        let mut total_deposits: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::TotalDeposits)
            .unwrap_or(0);
        total_deposits += amount;
        env.storage()
            .persistent()
            .set(&DataKey::TotalDeposits, &total_deposits);
        env.events()
            .publish((symbol_short!("Deposit"), provider), amount);
    }

    pub fn get_deposit(env: Env, provider: Address) -> i128 {
        let key = DataKey::Deposit(provider);
        env.storage().persistent().get(&key).unwrap_or(0)
    }

    pub fn get_total_deposits(env: Env) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TotalDeposits)
            .unwrap_or(0)
    }

    pub fn withdraw(env: Env, provider: Address, amount: i128) {
        provider.require_auth();
        if amount <= 0 {
            panic!("withdraw amount must be positive");
        }
        let key = DataKey::Deposit(provider.clone());
        let current_balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if current_balance < amount {
            panic!("insufficient balance");
        }
        // Effects: update stored balances before external interaction
        let new_balance = current_balance - amount;
        env.storage().persistent().set(&key, &new_balance);
        let mut total_deposits: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::TotalDeposits)
            .unwrap_or(0);
        total_deposits -= amount;
        env.storage()
            .persistent()
            .set(&DataKey::TotalDeposits, &total_deposits);
        // Interaction: transfer tokens only after state is updated
        let token: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .expect("not initialized");
        let token_client = TokenClient::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &provider, &amount);
        env.events()
            .publish((symbol_short!("Withdraw"), provider), amount);
    }
}

#[cfg(test)]
mod test;