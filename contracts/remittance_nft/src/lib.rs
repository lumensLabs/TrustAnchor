#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env};

mod events;

const MIN_SCORE: u32 = 1;
const MAX_SCORE: u32 = 1000;

/// On-chain record for a user's soulbound remittance reputation NFT.
#[contracttype]
#[derive(Clone)]
pub struct RemittanceMetadata {
    pub score: u32,
    pub history_hash: BytesN<32>,
    pub minted_at: u64,
    pub locked: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Metadata(Address),
    Score(Address), // Legacy key for backward compatibility
    Admin,
    AuthorizedMinter(Address),
}

#[contract]
pub struct RemittanceNFT;

#[contractimpl]
impl RemittanceNFT {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::AuthorizedMinter(admin.clone()), &true);
    }

    pub fn authorize_minter(env: Env, minter: Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized");
        admin.require_auth();

        env.storage()
            .instance()
            .set(&DataKey::AuthorizedMinter(minter), &true);
    }

    pub fn revoke_minter(env: Env, minter: Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized");
        admin.require_auth();

        env.storage()
            .instance()
            .remove(&DataKey::AuthorizedMinter(minter));
    }

    pub fn is_authorized_minter(env: Env, minter: Address) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::AuthorizedMinter(minter))
            .unwrap_or(false)
    }

    /// Mint a soulbound NFT tied to `user`, representing remittance history and credit score.
    pub fn mint(
        env: Env,
        user: Address,
        initial_score: u32,
        history_hash: BytesN<32>,
        minter: Option<Address>,
    ) {
        require_authorized_minter(&env, minter);
        validate_issuance_inputs(initial_score, &history_hash);
        ensure_user_has_no_nft(&env, &user);

        let minted_at = env.ledger().timestamp();
        let metadata = RemittanceMetadata {
            score: initial_score,
            history_hash: history_hash.clone(),
            minted_at,
            locked: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Metadata(user.clone()), &metadata);

        events::nft_issued(&env, user, initial_score, history_hash, minted_at);
    }

    /// Returns whether the user has been issued a remittance NFT.
    pub fn has_nft(env: Env, user: Address) -> bool {
        Self::get_metadata(env, user).is_some()
    }

    /// Soulbound NFTs cannot be transferred between accounts.
    pub fn transfer(_env: Env, _from: Address, _to: Address) {
        panic!("remittance NFTs are non-transferable");
    }

    pub fn get_metadata(env: Env, user: Address) -> Option<RemittanceMetadata> {
        let metadata_key = DataKey::Metadata(user.clone());
        if let Some(metadata) = env.storage().persistent().get(&metadata_key) {
            return Some(metadata);
        }

        let score_key = DataKey::Score(user.clone());
        if let Some(score) = env.storage().persistent().get::<DataKey, u32>(&score_key) {
            let default_hash = BytesN::from_array(&env, &[0u8; 32]);
            let migrated_metadata = RemittanceMetadata {
                score,
                history_hash: default_hash,
                minted_at: 0,
                locked: false,
            };
            env.storage()
                .persistent()
                .set(&metadata_key, &migrated_metadata);
            env.storage().persistent().remove(&score_key);
            return Some(migrated_metadata);
        }

        None
    }

    pub fn get_score(env: Env, user: Address) -> u32 {
        if let Some(metadata) = Self::get_metadata(env.clone(), user.clone()) {
            return metadata.score;
        }

        let score_key = DataKey::Score(user);
        env.storage()
            .persistent()
            .get::<DataKey, u32>(&score_key)
            .unwrap_or(0)
    }

    pub fn update_score(env: Env, user: Address, repayment_amount: i128, minter: Option<Address>) {
        require_authorized_minter(&env, minter);

        let metadata_key = DataKey::Metadata(user.clone());
        let score_key = DataKey::Score(user.clone());

        let mut metadata = if let Some(md) = env.storage().persistent().get(&metadata_key) {
            md
        } else if let Some(score) = env.storage().persistent().get::<DataKey, u32>(&score_key) {
            let default_hash = BytesN::from_array(&env, &[0u8; 32]);
            let migrated = RemittanceMetadata {
                score,
                history_hash: default_hash,
                minted_at: 0,
                locked: false,
            };
            env.storage().persistent().set(&metadata_key, &migrated);
            env.storage().persistent().remove(&score_key);
            migrated
        } else {
            panic!("user does not have an NFT");
        };

        let points = (repayment_amount / 100) as u32;
        metadata.score = metadata
            .score
            .saturating_add(points)
            .min(MAX_SCORE);

        env.storage().persistent().set(&metadata_key, &metadata);
    }

    pub fn update_history_hash(
        env: Env,
        user: Address,
        new_history_hash: BytesN<32>,
        minter: Option<Address>,
    ) {
        require_authorized_minter(&env, minter);
        if is_zero_hash(&new_history_hash) {
            panic!("history hash must not be zero");
        }

        let metadata_key = DataKey::Metadata(user.clone());
        let score_key = DataKey::Score(user.clone());

        let mut metadata = if let Some(md) = env.storage().persistent().get(&metadata_key) {
            md
        } else if let Some(score) = env.storage().persistent().get::<DataKey, u32>(&score_key) {
            let default_hash = BytesN::from_array(&env, &[0u8; 32]);
            let migrated = RemittanceMetadata {
                score,
                history_hash: default_hash,
                minted_at: 0,
                locked: false,
            };
            env.storage().persistent().set(&metadata_key, &migrated);
            env.storage().persistent().remove(&score_key);
            migrated
        } else {
            panic!("user does not have an NFT");
        };

        metadata.history_hash = new_history_hash;
        env.storage().persistent().set(&metadata_key, &metadata);
    }
}

fn require_authorized_minter(env: &Env, minter: Option<Address>) {
    let admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .expect("not initialized");

    if let Some(minter_addr) = minter {
        minter_addr.require_auth();
        let is_authorized = env
            .storage()
            .instance()
            .get(&DataKey::AuthorizedMinter(minter_addr))
            .unwrap_or(false);
        if !is_authorized {
            panic!("minter is not authorized");
        }
    } else {
        admin.require_auth();
    }
}

fn validate_issuance_inputs(score: u32, history_hash: &BytesN<32>) {
    if score < MIN_SCORE || score > MAX_SCORE {
        panic!("score must be between 1 and 1000");
    }
    if is_zero_hash(history_hash) {
        panic!("history hash must not be zero");
    }
}

fn ensure_user_has_no_nft(env: &Env, user: &Address) {
    let metadata_key = DataKey::Metadata(user.clone());
    let score_key = DataKey::Score(user.clone());

    if env.storage().persistent().has(&metadata_key)
        || env.storage().persistent().has(&score_key)
    {
        panic!("user already has an NFT");
    }
}

fn is_zero_hash(hash: &BytesN<32>) -> bool {
    hash.to_array() == [0u8; 32]
}

#[cfg(test)]
mod test;

