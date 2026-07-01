#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

fn create_test_hash(env: &Env, value: u8) -> BytesN<32> {
    let mut hash_bytes = [0u8; 32];
    hash_bytes[0] = value;
    BytesN::from_array(env, &hash_bytes)
}

#[test]
fn test_score_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);

    let history_hash = create_test_hash(&env, 1);

    // Initial mint (admin mints, so minter is None)
    client.mint(&user, &500, &history_hash, &None);
    assert_eq!(client.get_score(&user), 500);

    // Check metadata
    let metadata = client.get_metadata(&user).unwrap();
    assert_eq!(metadata.score, 500);
    assert_eq!(metadata.history_hash, history_hash);

    // Update score (repayment of 250 -> 2 points) - admin updates
    client.update_score(&user, &250, &None);
    assert_eq!(client.get_score(&user), 502);

    // Verify metadata updated
    let metadata = client.get_metadata(&user).unwrap();
    assert_eq!(metadata.score, 502);

    // Update score (repayment of 1000 -> 10 points) - admin updates
    client.update_score(&user, &1000, &None);
    assert_eq!(client.get_score(&user), 512);

    // Verify metadata updated
    let metadata = client.get_metadata(&user).unwrap();
    assert_eq!(metadata.score, 512);

    // Unregistered user should have 0 score
    let stranger = Address::generate(&env);
    assert_eq!(client.get_score(&stranger), 0);
    assert!(client.get_metadata(&stranger).is_none());
}

#[test]
fn test_history_hash_update() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);

    let initial_hash = create_test_hash(&env, 1);
    client.mint(&user, &500, &initial_hash, &None);

    let metadata = client.get_metadata(&user).unwrap();
    assert_eq!(metadata.history_hash, initial_hash);

    // Update history hash - admin updates
    let new_hash = create_test_hash(&env, 2);
    client.update_history_hash(&user, &new_hash, &None);

    let metadata = client.get_metadata(&user).unwrap();
    assert_eq!(metadata.history_hash, new_hash);
    assert_eq!(metadata.score, 500); // Score should remain unchanged
}

#[test]
fn test_authorized_minter() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let authorized_contract = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);

    // Admin should be authorized by default
    assert!(client.is_authorized_minter(&admin));

    // Authorize a contract
    client.authorize_minter(&authorized_contract);
    assert!(client.is_authorized_minter(&authorized_contract));

    // Revoke authorization
    client.revoke_minter(&authorized_contract);
    assert!(!client.is_authorized_minter(&authorized_contract));
}

#[test]
#[should_panic(expected = "not initialized")]
fn test_not_initialized() {
    let env = Env::default();
    let user = Address::generate(&env);
    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    let history_hash = create_test_hash(&env, 1);
    client.mint(&user, &500, &history_hash, &None);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_already_initialized() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);
    client.initialize(&admin);
}

#[test]
#[should_panic(expected = "user already has an NFT")]
fn test_duplicate_mint() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);

    let history_hash = create_test_hash(&env, 1);
    client.mint(&user, &500, &history_hash, &None);

    // Try to mint again for the same user
    let history_hash2 = create_test_hash(&env, 2);
    client.mint(&user, &600, &history_hash2, &None);
}

#[test]
#[should_panic(expected = "user does not have an NFT")]
fn test_update_score_without_nft() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);

    // Try to update score for user without NFT
    client.update_score(&user, &100, &None);
}

#[test]
#[should_panic(expected = "user does not have an NFT")]
fn test_update_history_hash_without_nft() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);

    let new_hash = create_test_hash(&env, 99);
    client.update_history_hash(&user, &new_hash, &None);
}

#[test]
#[should_panic(expected = "minter is not authorized")]
fn test_mint_with_unauthorized_minter_panics() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let unauthorized_minter = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);

    let history_hash = create_test_hash(&env, 7);
    client.mint(&user, &500, &history_hash, &Some(unauthorized_minter));
}

#[test]
#[should_panic(expected = "minter is not authorized")]
fn test_update_with_revoked_minter_panics() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let minter = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);
    client.authorize_minter(&minter);

    let history_hash = create_test_hash(&env, 8);
    client.mint(&user, &500, &history_hash, &Some(minter.clone()));

    client.revoke_minter(&minter);
    client.update_score(&user, &100, &Some(minter));
}

#[test]
fn test_get_metadata_migrates_legacy_score() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);

    use super::DataKey;
    let score_key = DataKey::Score(user.clone());
    let metadata_key = DataKey::Metadata(user.clone());

    env.as_contract(&contract_id, || {
        env.storage().persistent().set(&score_key, &777u32);
        assert!(!env.storage().persistent().has(&metadata_key));
    });

    let metadata = client.get_metadata(&user).unwrap();
    assert_eq!(metadata.score, 777);
    assert_eq!(metadata.history_hash, BytesN::from_array(&env, &[0u8; 32]));

    env.as_contract(&contract_id, || {
        assert!(!env.storage().persistent().has(&score_key));
        assert!(env.storage().persistent().has(&metadata_key));
    });
}

#[test]
fn test_backward_compatibility_migration() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);

    // Simulate legacy Score data (old format)
    use super::DataKey;
    let score_key = DataKey::Score(user.clone());
    env.as_contract(&contract_id, || {
        env.storage().persistent().set(&score_key, &750u32);
    });

    // get_score should migrate and return the score
    assert_eq!(client.get_score(&user), 750);

    // get_metadata should return migrated metadata with default hash
    let metadata = client.get_metadata(&user).unwrap();
    assert_eq!(metadata.score, 750);
    // Verify default hash (all zeros)
    let expected_default_hash = BytesN::from_array(&env, &[0u8; 32]);
    assert_eq!(metadata.history_hash, expected_default_hash);

    // Verify old Score key is removed after migration
    env.as_contract(&contract_id, || {
        assert!(!env.storage().persistent().has(&score_key));

        // Verify Metadata key exists after migration
        let metadata_key = DataKey::Metadata(user.clone());
        assert!(env.storage().persistent().has(&metadata_key));
    });

    // Update score should work on migrated data
    client.update_score(&user, &500, &None);
    assert_eq!(client.get_score(&user), 755); // 750 + 5 points (500/100)

    // Verify metadata still exists and is updated
    let updated_metadata = client.get_metadata(&user).unwrap();
    assert_eq!(updated_metadata.score, 755);
}

#[test]
fn test_update_score_migrates_legacy_data() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);

    // Simulate legacy Score data
    use super::DataKey;
    let score_key = DataKey::Score(user.clone());
    env.as_contract(&contract_id, || {
        env.storage().persistent().set(&score_key, &600u32);
    });

    // update_score should migrate legacy data and then update
    client.update_score(&user, &200, &None);

    // Score should be 602 (600 + 2 points from 200/100)
    assert_eq!(client.get_score(&user), 602);

    // Verify migration happened
    env.as_contract(&contract_id, || {
        let metadata_key = DataKey::Metadata(user.clone());
        assert!(env.storage().persistent().has(&metadata_key));
        assert!(!env.storage().persistent().has(&score_key));
    });

    let metadata = client.get_metadata(&user).unwrap();
    assert_eq!(metadata.score, 602);
}

#[test]
fn test_update_history_hash_migrates_legacy_data() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);

    // Simulate legacy Score data
    use super::DataKey;
    let score_key = DataKey::Score(user.clone());
    env.as_contract(&contract_id, || {
        env.storage().persistent().set(&score_key, &800u32);
    });

    // update_history_hash should migrate legacy data first
    let new_hash = create_test_hash(&env, 42);
    client.update_history_hash(&user, &new_hash, &None);

    // Verify migration and update
    let metadata = client.get_metadata(&user).unwrap();
    assert_eq!(metadata.score, 800); // Score preserved
    assert_eq!(metadata.history_hash, new_hash); // Hash updated

    // Verify old data is gone
    env.as_contract(&contract_id, || {
        assert!(!env.storage().persistent().has(&score_key));
    });
}

#[test]
fn test_lock_and_unlock_collateral() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let locker = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);

    // Authorize locker contract
    client.authorize_minter(&locker);

    let history_hash = create_test_hash(&env, 1);
    client.mint(&user, &500, &history_hash, &None);

    // Initially, collateral should not be locked
    assert!(!client.is_collateral_locked(&user));
    assert!(client.get_collateral_loan(&user).is_none());

    // Lock collateral for loan ID 1
    client.lock_collateral(&user, &1, &locker);
    assert!(client.is_collateral_locked(&user));
    assert_eq!(client.get_collateral_loan(&user), Some(1));

    // Unlock collateral for the same loan ID
    client.unlock_collateral(&user, &1, &locker);
    assert!(!client.is_collateral_locked(&user));
    assert!(client.get_collateral_loan(&user).is_none());
}

#[test]
#[should_panic(expected = "collateral already locked")]
fn test_lock_collateral_already_locked() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let locker = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);
    client.authorize_minter(&locker);

    let history_hash = create_test_hash(&env, 1);
    client.mint(&user, &500, &history_hash, &None);

    // Lock collateral for loan ID 1
    client.lock_collateral(&user, &1, &locker);

    // Try to lock again - should panic
    client.lock_collateral(&user, &2, &locker);
}

#[test]
#[should_panic(expected = "user does not have an NFT")]
fn test_lock_collateral_without_nft() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let locker = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);
    client.authorize_minter(&locker);

    // Try to lock collateral for user without NFT - should panic
    client.lock_collateral(&user, &1, &locker);
}

#[test]
#[should_panic(expected = "collateral info not found")]
fn test_unlock_unlocked_collateral() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let locker = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);
    client.authorize_minter(&locker);

    let history_hash = create_test_hash(&env, 1);
    client.mint(&user, &500, &history_hash, &None);

    // Try to unlock collateral that was never locked - should panic
    client.unlock_collateral(&user, &1, &locker);
}

#[test]
#[should_panic(expected = "collateral locked for different loan")]
fn test_unlock_collateral_wrong_loan_id() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let locker = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);
    client.authorize_minter(&locker);

    let history_hash = create_test_hash(&env, 1);
    client.mint(&user, &500, &history_hash, &None);

    // Lock collateral for loan ID 1
    client.lock_collateral(&user, &1, &locker);

    // Try to unlock with different loan ID - should panic
    client.unlock_collateral(&user, &2, &locker);
}

#[test]
#[should_panic(expected = "locker is not authorized")]
fn test_lock_collateral_unauthorized_locker() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let unauthorized_locker = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);

    let history_hash = create_test_hash(&env, 1);
    client.mint(&user, &500, &history_hash, &None);

    // Try to lock collateral with unauthorized locker - should panic
    client.lock_collateral(&user, &1, &unauthorized_locker);
}

#[test]
fn test_liquidate_collateral() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let liquidator = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);
    client.authorize_minter(&liquidator);

    let history_hash = create_test_hash(&env, 1);
    client.mint(&user, &500, &history_hash, &None);

    // Lock collateral for loan ID 1
    client.lock_collateral(&user, &1, &liquidator);
    assert!(client.is_collateral_locked(&user));

    // Liquidate collateral
    client.liquidate_collateral(&user, &1, &liquidator);

    // After liquidation, collateral should be removed (no longer locked)
    assert!(!client.is_collateral_locked(&user));
    assert!(client.get_collateral_loan(&user).is_none());
}

#[test]
#[should_panic(expected = "collateral info not found")]
fn test_liquidate_unlocked_collateral() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let liquidator = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);
    client.authorize_minter(&liquidator);

    let history_hash = create_test_hash(&env, 1);
    client.mint(&user, &500, &history_hash, &None);

    // Try to liquidate collateral that's not locked - should panic
    client.liquidate_collateral(&user, &1, &liquidator);
}

#[test]
#[should_panic(expected = "collateral locked for different loan")]
fn test_liquidate_collateral_wrong_loan_id() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let liquidator = Address::generate(&env);

    let contract_id = env.register(RemittanceNFT, ());
    let client = RemittanceNFTClient::new(&env, &contract_id);

    client.initialize(&admin);
    client.authorize_minter(&liquidator);

    let history_hash = create_test_hash(&env, 1);
    client.mint(&user, &500, &history_hash, &None);

    // Lock collateral for loan ID 1
    client.lock_collateral(&user, &1, &liquidator);

    // Try to liquidate with different loan ID - should panic
    client.liquidate_collateral(&user, &2, &liquidator);
}
