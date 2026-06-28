#![no_std]
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Token,
    Deposit(Address),
}

#[contract]
pub struct LendingPool;

// TTL strategy:
// - When an entry has <= PERSISTENT_TTL_THRESHOLD ledgers left, bump it to
//   PERSISTENT_TTL_BUMP_TO ledgers.
// - We use the same values for instance storage to keep Token config alive.
const PERSISTENT_TTL_THRESHOLD: u32 = 120_960; // ~1 week at 5s/ledger
const PERSISTENT_TTL_BUMP_TO: u32 = 241_920; // ~2 weeks at 5s/ledger

fn bump_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_BUMP_TO);
}

fn bump_deposit_ttl(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_BUMP_TO);
}

#[contractimpl]
impl LendingPool {
    pub fn initialize(env: Env, token: Address) {
        if env.storage().instance().has(&DataKey::Token) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Token, &token);
        bump_instance_ttl(&env);
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
        bump_deposit_ttl(&env, &key);
        bump_instance_ttl(&env);
        env.events()
            .publish((symbol_short!("Deposit"), provider), amount);
    }

    pub fn get_deposit(env: Env, provider: Address) -> i128 {
        let key = DataKey::Deposit(provider);
        env.storage().persistent().get(&key).unwrap_or(0)
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
        let token: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .expect("not initialized");
        let token_client = TokenClient::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &provider, &amount);
        env.storage()
            .persistent()
            .set(&key, &(current_balance - amount));
        bump_deposit_ttl(&env, &key);
        bump_instance_ttl(&env);
        env.events()
            .publish((symbol_short!("Withdraw"), provider), amount);
    }
}

#[cfg(test)]
mod test;
