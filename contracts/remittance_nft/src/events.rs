use soroban_sdk::{Address, BytesN, Env, Symbol};

pub fn nft_issued(
    env: &Env,
    owner: Address,
    score: u32,
    history_hash: BytesN<32>,
    minted_at: u64,
) {
    let topics = (Symbol::new(env, "NftIssued"), owner);
    env.events().publish(topics, (score, history_hash, minted_at));
}
