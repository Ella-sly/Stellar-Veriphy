#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{storage::Temporary as _, Address as _},
    Bytes, BytesN, Env,
};

fn make_env() -> Env {
    Env::default()
}

fn register_oracle(env: &Env) -> Address {
    env.register_contract(None, OracleContract)
}

fn hash32(env: &Env, n: u8) -> BytesN<32> {
    BytesN::from_array(env, &[n; 32])
}

mod mock_registry {
    use soroban_sdk::{contract, contractimpl, BytesN, Env};

    #[contract]
    pub struct MockRegistry;

    #[contractimpl]
    impl MockRegistry {
        pub fn is_tee_hash_approved(env: Env, tee_hash: BytesN<32>) -> bool {
            tee_hash == BytesN::from_array(&env, &[1u8; 32])
        }

        pub fn is_provider(_env: Env, _provider: BytesN<32>) -> bool {
            true
        }
    }
}

mod reject_registry {
    use soroban_sdk::{contract, contractimpl, BytesN, Env};

    #[contract]
    pub struct RejectRegistry;

    #[contractimpl]
    impl RejectRegistry {
        pub fn is_provider(_env: Env, _provider: BytesN<32>) -> bool {
            false
        }
        pub fn is_tee_hash_approved(_env: Env, _tee_hash: BytesN<32>) -> bool {
            true
        }
    }
}

fn setup_with_mock_registry(env: &Env) -> (Address, Address) {
    let registry_id = env.register_contract(None, mock_registry::MockRegistry);
    let oracle_id = register_oracle(env);
    let provenance = Address::generate(env);
    let admin = Address::generate(env);
    OracleContractClient::new(env, &oracle_id).init(&registry_id, &provenance, &admin);
    (oracle_id, registry_id)
}

// ---------------------------------------------------------------------------
// Issue #34 — init and double-init guard
// ---------------------------------------------------------------------------

#[test]
fn test_init() {
    let env = make_env();
    let cid = register_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);

    let registry = Address::generate(&env);
    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);

    client.init(&registry, &provenance, &admin);

    let result = client.try_init(&registry, &provenance, &admin);
    assert!(result.is_err());
}

#[test]
fn test_init_already_initialized() {
    let env = make_env();
    let cid = register_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);

    let registry = Address::generate(&env);
    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);

    client.init(&registry, &provenance, &admin);

    let err = client
        .try_init(&registry, &provenance, &admin)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::AlreadyInitialized);
}

// ---------------------------------------------------------------------------
// Issue #35 — submit_request uniqueness and TTL
// ---------------------------------------------------------------------------

#[test]
fn test_submit_request_generates_unique_ids() {
    let env = make_env();
    env.mock_all_auths();
    let cid = register_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let bytes = Bytes::from_slice(&env, b"data");
    let req = Address::generate(&env);
    let registry = Address::generate(&env);
    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);
    client.init(&registry, &provenance, &admin);

    assert_eq!(
        client
            .try_submit_request(&bytes, &bytes, &req)
            .unwrap()
            .unwrap(),
        1
    );
    assert_eq!(
        client
            .try_submit_request(&bytes, &bytes, &req)
            .unwrap()
            .unwrap(),
        2
    );
}

#[test]
fn test_submit_request_stores_pending_in_temporary_storage() {
    let env = make_env();
    env.mock_all_auths();
    let cid = register_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let bytes = Bytes::from_slice(&env, b"ref");
    let req = Address::generate(&env);
    let registry = Address::generate(&env);
    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);
    client.init(&registry, &provenance, &admin);

    let id = client
        .try_submit_request(&bytes, &bytes, &req)
        .unwrap()
        .unwrap();
    assert_eq!(
        client.get_request(&id).unwrap().state,
        RequestState::Pending
    );

    let ttl = env.as_contract(&cid, || {
        env.storage().temporary().get_ttl(&DataKey::Request(id))
    });
    assert!(ttl > 0);
}

// ---------------------------------------------------------------------------
// Issue #36 — verify_attestation scenarios
// ---------------------------------------------------------------------------

#[test]
fn test_verify_attestation_not_initialized() {
    let env = make_env();
    let cid = register_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);

    let err = client
        .try_verify_attestation(
            &hash32(&env, 0),
            &hash32(&env, 1),
            &Bytes::from_slice(&env, b"data"),
            &BytesN::from_array(&env, &[0u8; 64]),
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::RegistryNotConfigured);
}

#[test]
fn test_verify_attestation_unauthorized_signer() {
    let env = make_env();
    env.mock_all_auths();
    let registry_id = env.register_contract(None, reject_registry::RejectRegistry);
    let oracle_id = register_oracle(&env);
    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);
    OracleContractClient::new(&env, &oracle_id).init(&registry_id, &provenance, &admin);
    let client = OracleContractClient::new(&env, &oracle_id);

    let err = client
        .try_verify_attestation(
            &hash32(&env, 0),
            &hash32(&env, 1),
            &Bytes::from_slice(&env, b"data"),
            &BytesN::from_array(&env, &[0u8; 64]),
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::UnauthorizedSigner);
}

#[test]
fn test_verify_attestation_invalid_signature() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, _) = setup_with_mock_registry(&env);
    let client = OracleContractClient::new(&env, &oracle_id);

    let sk = ed25519_dalek::SigningKey::from_bytes(&[42u8; 32]);
    let provider = BytesN::from_array(&env, sk.verifying_key().as_bytes());
    let tee_hash = BytesN::from_array(&env, &[1u8; 32]);
    let payload = Bytes::from_slice(&env, b"payload");
    let bad_sig = BytesN::from_array(&env, &[0u8; 64]);

    let result = client.try_verify_attestation(&provider, &tee_hash, &payload, &bad_sig);
    assert!(result.is_err());
}

#[test]
fn test_verify_attestation_success() {
    use ed25519_dalek::Signer;

    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, _) = setup_with_mock_registry(&env);
    let client = OracleContractClient::new(&env, &oracle_id);

    let sk = ed25519_dalek::SigningKey::from_bytes(&[42u8; 32]);
    let provider = BytesN::from_array(&env, sk.verifying_key().as_bytes());
    let tee_hash = BytesN::from_array(&env, &[1u8; 32]);
    let raw = b"attestation payload";
    let payload = Bytes::from_slice(&env, raw);

    let sig: ed25519_dalek::Signature = sk.sign(raw);
    let signature = BytesN::from_array(&env, &sig.to_bytes());

    client.verify_attestation(&provider, &tee_hash, &payload, &signature);
}

// ---------------------------------------------------------------------------
// Issue #161 — Configurable TTL
// ---------------------------------------------------------------------------

#[test]
fn test_get_ttl_config_returns_default_after_init() {
    let env = make_env();
    env.mock_all_auths();
    let cid = register_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let registry = Address::generate(&env);
    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);
    client.init(&registry, &provenance, &admin);

    let config = client.try_get_ttl_config().unwrap().unwrap();
    assert_eq!(config.default_ttl, 100);
    assert_eq!(config.high_priority_ttl, 200);
    assert_eq!(config.low_priority_ttl, 50);
}

#[test]
fn test_update_ttl_config_admin_only() {
    let env = make_env();
    env.mock_all_auths();
    let cid = register_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let registry = Address::generate(&env);
    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);
    client.init(&registry, &provenance, &admin);

    client
        .try_update_ttl_config(&150, &250, &75)
        .unwrap()
        .unwrap();
    let config = client.try_get_ttl_config().unwrap().unwrap();
    assert_eq!(config.default_ttl, 150);
    assert_eq!(config.high_priority_ttl, 250);
    assert_eq!(config.low_priority_ttl, 75);
}

#[test]
fn test_update_ttl_config_invalid_ttl() {
    let env = make_env();
    env.mock_all_auths();
    let cid = register_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let registry = Address::generate(&env);
    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);
    client.init(&registry, &provenance, &admin);

    let result = client.try_update_ttl_config(&0, &250, &75);
    assert!(result.is_err());
}

#[test]
fn test_submit_request_with_priority_uses_correct_ttl() {
    let env = make_env();
    env.mock_all_auths();
    let cid = register_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let registry = Address::generate(&env);
    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);
    let requester = Address::generate(&env);
    client.init(&registry, &provenance, &admin);

    let bytes = Bytes::from_slice(&env, b"data");
    let priority = 2u32;
    let id = client
        .try_submit_request_with_priority(&bytes, &bytes, &requester, &priority)
        .unwrap()
        .unwrap();

    let ttl = env.as_contract(&cid, || {
        env.storage().temporary().get_ttl(&DataKey::Request(id))
    });
    assert_eq!(ttl, 200);
}
