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

fn setup_oracle(env: &Env) -> (Address, Address, Address) {
    let registry   = Address::generate(env);
    let provenance = Address::generate(env);
    let admin      = Address::generate(env);
    let cid = register_oracle(env);
    OracleContractClient::new(env, &cid)
        .init(&registry, &provenance, &admin)
        .unwrap();
    (cid, admin, registry)
}

fn setup_with_mock_registry(env: &Env) -> (Address, Address) {
    let registry_id = env.register_contract(None, mock_registry::MockRegistry);
    let oracle_id   = register_oracle(env);
    let provenance  = Address::generate(env);
    let admin       = Address::generate(env);
    OracleContractClient::new(env, &oracle_id)
        .init(&registry_id, &provenance, &admin)
        .unwrap();
    (oracle_id, registry_id)
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

#[test]
fn test_init() {
    let env = make_env();
    let cid = register_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let registry   = Address::generate(&env);
    let provenance = Address::generate(&env);
    let admin      = Address::generate(&env);
    client.init(&registry, &provenance, &admin).unwrap();
    assert!(client.try_init(&registry, &provenance, &admin).is_err());
}

#[test]
fn test_init_already_initialized() {
    let env = make_env();
    let cid = register_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let registry   = Address::generate(&env);
    let provenance = Address::generate(&env);
    let admin      = Address::generate(&env);
    client.init(&registry, &provenance, &admin).unwrap();
    let err = client.try_init(&registry, &provenance, &admin)
        .unwrap_err().unwrap();
    assert_eq!(err, Error::AlreadyInitialized);
}

// ---------------------------------------------------------------------------
// submit_request
// ---------------------------------------------------------------------------

#[test]
fn test_submit_request_generates_unique_ids() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let bytes = Bytes::from_slice(&env, b"data");
    let req   = Address::generate(&env);
    assert_eq!(client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap(), 1);
    assert_eq!(client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap(), 2);
}

#[test]
fn test_submit_request_stores_pending_in_temporary_storage() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let bytes = Bytes::from_slice(&env, b"ref");
    let req   = Address::generate(&env);
    let id = client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap();
    assert_eq!(client.get_request(&id).unwrap().state, RequestState::Pending);
    let ttl = env.as_contract(&cid, || {
        env.storage().temporary().get_ttl(&DataKey::Request(id))
    });
    assert!(ttl > 0);
}

#[test]
fn test_submit_request_with_priority_uses_correct_ttl() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let bytes    = Bytes::from_slice(&env, b"data");
    let req      = Address::generate(&env);
    let id_high  = client.submit_request(&bytes, &bytes, &req, &Priority::High).unwrap();
    let id_low   = client.submit_request(&bytes, &bytes, &req, &Priority::Low).unwrap();
    let ttl_high = env.as_contract(&cid, || {
        env.storage().temporary().get_ttl(&DataKey::Request(id_high))
    });
    let ttl_low = env.as_contract(&cid, || {
        env.storage().temporary().get_ttl(&DataKey::Request(id_low))
    });
    assert!(ttl_high > ttl_low);
}

// ---------------------------------------------------------------------------
// verify_attestation
// ---------------------------------------------------------------------------

#[test]
fn test_verify_attestation_not_initialized() {
    let env = make_env();
    let cid    = register_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let err = client
        .try_verify_attestation(
            &hash32(&env, 0),
            &hash32(&env, 1),
            &Bytes::from_slice(&env, b"data"),
            &BytesN::from_array(&env, &[0u8; 64]),
        )
        .unwrap_err().unwrap();
    assert_eq!(err, Error::RegistryNotConfigured);
}

#[test]
fn test_verify_attestation_unauthorized_signer() {
    let env = make_env();
    env.mock_all_auths();
    let registry_id = env.register_contract(None, reject_registry::RejectRegistry);
    let oracle_id   = register_oracle(&env);
    let provenance  = Address::generate(&env);
    let admin       = Address::generate(&env);
    OracleContractClient::new(&env, &oracle_id)
        .init(&registry_id, &provenance, &admin)
        .unwrap();
    let client = OracleContractClient::new(&env, &oracle_id);
    let err = client
        .try_verify_attestation(
            &hash32(&env, 0),
            &hash32(&env, 1),
            &Bytes::from_slice(&env, b"data"),
            &BytesN::from_array(&env, &[0u8; 64]),
        )
        .unwrap_err().unwrap();
    assert_eq!(err, Error::UnauthorizedSigner);
}

#[test]
fn test_verify_attestation_invalid_signature() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, _) = setup_with_mock_registry(&env);
    let client = OracleContractClient::new(&env, &oracle_id);
    let sk       = ed25519_dalek::SigningKey::from_bytes(&[42u8; 32]);
    let provider = BytesN::from_array(&env, sk.verifying_key().as_bytes());
    let tee_hash = BytesN::from_array(&env, &[1u8; 32]);
    let payload  = Bytes::from_slice(&env, b"payload");
    let bad_sig  = BytesN::from_array(&env, &[0u8; 64]);
    let result   = client.try_verify_attestation(&provider, &tee_hash, &payload, &bad_sig);
    assert!(result.is_err());
}

#[test]
fn test_verify_attestation_success() {
    use ed25519_dalek::Signer;
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, _) = setup_with_mock_registry(&env);
    let client   = OracleContractClient::new(&env, &oracle_id);
    let sk       = ed25519_dalek::SigningKey::from_bytes(&[42u8; 32]);
    let provider = BytesN::from_array(&env, sk.verifying_key().as_bytes());
    let tee_hash = BytesN::from_array(&env, &[1u8; 32]);
    let raw      = b"attestation payload";
    let payload  = Bytes::from_slice(&env, raw);
    let sig: ed25519_dalek::Signature = sk.sign(raw);
    let signature = BytesN::from_array(&env, &sig.to_bytes());
    client.verify_attestation(&provider, &tee_hash, &payload, &signature).unwrap();
}

// ---------------------------------------------------------------------------
// Batch processing
// ---------------------------------------------------------------------------

#[test]
fn test_submit_batch_request_success() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let bytes = Bytes::from_slice(&env, b"data");
    let req   = Address::generate(&env);
    let requests = vec![
        &env,
        (bytes.clone(), bytes.clone(), req.clone(), Priority::Normal),
        (bytes.clone(), bytes.clone(), req.clone(), Priority::High),
    ];
    let ids = client.submit_batch_request(&requests).unwrap();
    assert_eq!(ids.len(), 2);
    assert_eq!(ids.get(0), 1);
    assert_eq!(ids.get(1), 2);
}

#[test]
fn test_submit_batch_request_exceeds_limit() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let bytes = Bytes::from_slice(&env, b"data");
    let req   = Address::generate(&env);
    let mut requests: Vec<(Bytes, Bytes, Address, Priority)> = vec![&env];
    for _ in 0..11 {
        requests.push_back((bytes.clone(), bytes.clone(), req.clone(), Priority::Normal));
    }
    let err = client.try_submit_batch_request(&requests).unwrap_err().unwrap();
    assert_eq!(err, Error::BatchSizeExceeded);
}

#[test]
fn test_submit_batch_request_stores_all_pending() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let bytes = Bytes::from_slice(&env, b"data");
    let req   = Address::generate(&env);
    let requests = vec![
        &env,
        (bytes.clone(), bytes.clone(), req.clone(), Priority::Low),
        (bytes.clone(), bytes.clone(), req.clone(), Priority::Normal),
    ];
    let ids = client.submit_batch_request(&requests).unwrap();
    for i in 0..ids.len() {
        let id     = ids.get(i);
        let stored = client.get_request(&id).unwrap();
        assert_eq!(stored.state, RequestState::Pending);
    }
}

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

#[test]
fn test_cancel_request_success() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let bytes = Bytes::from_slice(&env, b"data");
    let req   = Address::generate(&env);
    let id = client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap();
    client.cancel_request(&id).unwrap();
    assert_eq!(client.get_request(&id).unwrap().state, RequestState::Cancelled);
}

#[test]
fn test_cancel_request_not_found() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let err = client.try_cancel_request(&9999u64).unwrap_err().unwrap();
    assert_eq!(err, Error::RequestNotFound);
}

// ---------------------------------------------------------------------------
// Priorities
// ---------------------------------------------------------------------------

#[test]
fn test_priority_affects_request() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client  = OracleContractClient::new(&env, &cid);
    let bytes   = Bytes::from_slice(&env, b"data");
    let req     = Address::generate(&env);
    let id_low  = client.submit_request(&bytes, &bytes, &req, &Priority::Low).unwrap();
    let id_high = client.submit_request(&bytes, &bytes, &req, &Priority::High).unwrap();
    assert_eq!(client.get_request(&id_low).unwrap().priority,  Priority::Low);
    assert_eq!(client.get_request(&id_high).unwrap().priority, Priority::High);
}

#[test]
fn test_all_priority_levels() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let bytes  = Bytes::from_slice(&env, b"data");
    let req    = Address::generate(&env);
    let prios: Vec<Priority> = vec![
        &env,
        Priority::Low,
        Priority::Normal,
        Priority::High,
        Priority::Urgent,
    ];
    for i in 0..prios.len() {
        let p  = prios.get(i);
        let id = client.submit_request(&bytes, &bytes, &req, &p).unwrap();
        assert_eq!(client.get_request(&id).unwrap().priority, p);
    }
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

#[test]
fn test_get_requests_by_state_pending() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let bytes  = Bytes::from_slice(&env, b"data");
    let req    = Address::generate(&env);
    client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap();
    client.submit_request(&bytes, &bytes, &req, &Priority::High).unwrap();
    let paged = client.get_requests_by_state(&RequestState::Pending, &0u32, &10u32, &None);
    assert_eq!(paged.requests.len(), 2);
    assert_eq!(paged.total_count, 2);
}

#[test]
fn test_get_requests_by_state_with_pagination() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let bytes  = Bytes::from_slice(&env, b"data");
    let req    = Address::generate(&env);
    for _ in 0..5 {
        client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap();
    }
    let page1 = client.get_requests_by_state(&RequestState::Pending, &0u32, &2u32, &None);
    let page2 = client.get_requests_by_state(&RequestState::Pending, &2u32, &2u32, &None);
    assert_eq!(page1.requests.len(), 2);
    assert_eq!(page2.requests.len(), 2);
    assert_eq!(page1.total_count, 5);
}

#[test]
fn test_get_requests_by_state_filter_by_requester() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let bytes  = Bytes::from_slice(&env, b"data");
    let req1   = Address::generate(&env);
    let req2   = Address::generate(&env);
    client.submit_request(&bytes, &bytes, &req1, &Priority::Normal).unwrap();
    client.submit_request(&bytes, &bytes, &req2, &Priority::Normal).unwrap();
    let paged = client.get_requests_by_state(
        &RequestState::Pending, &0u32, &10u32, &Some(req1.clone()),
    );
    assert_eq!(paged.requests.len(), 1);
    assert_eq!(paged.requests.get(0).request.requester, req1);
}

// ---------------------------------------------------------------------------
// TTL config & expiration warning
// ---------------------------------------------------------------------------

#[test]
fn test_get_ttl_config_returns_default_after_init() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let cfg = client.get_ttl_config();
    assert!(cfg.default_ttl > 0);
}

#[test]
fn test_update_ttl_config_admin_only() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    client.update_ttl_config(&200u32, &400u32, &100u32).unwrap();
    assert_eq!(client.get_ttl_config().default_ttl, 200);
}

#[test]
fn test_update_ttl_config_invalid_ttl() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let err = client.try_update_ttl_config(&0u32, &200u32, &50u32)
        .unwrap_err().unwrap();
    assert_eq!(err, Error::InvalidState);
}

#[test]
fn test_get_warning_threshold_returns_default() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    assert_eq!(client.get_warning_threshold(), 20u32);
}

#[test]
fn test_update_warning_threshold_admin_only() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    client.update_warning_threshold(&50u32).unwrap();
    assert_eq!(client.get_warning_threshold(), 50u32);
}

#[test]
fn test_update_warning_threshold_invalid() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let err = client.try_update_warning_threshold(&0u32)
        .unwrap_err().unwrap();
    assert_eq!(err, Error::InvalidState);
}

#[test]
fn test_check_expiration_warning_emits_event() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let bytes  = Bytes::from_slice(&env, b"data");
    let req    = Address::generate(&env);
    let id = client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap();
    // TTL is 100 ledgers; set threshold to 200 so the warning fires immediately
    client.update_warning_threshold(&200u32).unwrap();
    assert!(client.check_expiration_warning(&id));
}

// ---------------------------------------------------------------------------
// Feature 1 — SLA metrics, compliance, violation alerts, auto-suspend
// ---------------------------------------------------------------------------

fn setup_with_provider(env: &Env) -> (Address, Address) {
    let (cid, admin, ..) = setup_oracle(env);
    let provider = Address::generate(env);
    OracleContractClient::new(env, &cid)
        .add_provider(&provider)
        .unwrap();
    (cid, provider)
}

#[test]
fn test_get_provider_metrics_returns_none_initially() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, provider) = setup_with_provider(&env);
    let client = OracleContractClient::new(&env, &cid);
    // No SLA set yet → None
    assert!(client.get_provider_metrics(&provider).is_none());
}

#[test]
fn test_record_verification_success() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, provider) = setup_with_provider(&env);
    let client = OracleContractClient::new(&env, &cid);
    client.set_provider_sla(&provider, &5u32, &90u32, &90u32).unwrap();
    client.record_verification(&provider, &true, &2u32, &100u32).unwrap();
    let sla = client.get_provider_metrics(&provider).unwrap();
    assert_eq!(sla.successful, 1);
    assert_eq!(sla.total_requests, 1);
    assert_eq!(sla.actual_success_rate, 100);
}

#[test]
fn test_record_verification_failure() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, provider) = setup_with_provider(&env);
    let client = OracleContractClient::new(&env, &cid);
    client.set_provider_sla(&provider, &5u32, &90u32, &100u32).unwrap();
    client.record_verification(&provider, &false, &5u32, &100u32).unwrap();
    let sla = client.get_provider_metrics(&provider).unwrap();
    assert_eq!(sla.successful, 0);
    assert_eq!(sla.actual_success_rate, 0);
}

#[test]
fn test_record_multiple_verifications() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, provider) = setup_with_provider(&env);
    let client = OracleContractClient::new(&env, &cid);
    client.set_provider_sla(&provider, &10u32, &90u32, &80u32).unwrap();
    for _ in 0..4 {
        client.record_verification(&provider, &true, &3u32, &100u32).unwrap();
    }
    client.record_verification(&provider, &false, &12u32, &0u32).unwrap();
    let sla = client.get_provider_metrics(&provider).unwrap();
    assert_eq!(sla.total_requests, 5);
    assert_eq!(sla.successful, 4);
    assert_eq!(sla.actual_success_rate, 80);
}

#[test]
fn test_get_sla_compliance_all_ok() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, provider) = setup_with_provider(&env);
    let client = OracleContractClient::new(&env, &cid);
    client.set_provider_sla(&provider, &30u32, &50u32, &50u32).unwrap();
    client.record_verification(&provider, &true, &2u32, &100u32).unwrap();
    let c = client.get_sla_compliance(&provider).unwrap();
    assert!(c.response_time_ok);
    assert!(c.uptime_ok);
    assert!(c.success_rate_ok);
    assert_eq!(c.compliance_percent, 100);
    assert!(!c.suspended);
}

#[test]
fn test_get_sla_compliance_violation() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, provider) = setup_with_provider(&env);
    let client = OracleContractClient::new(&env, &cid);
    // Must respond within 1 s
    client.set_provider_sla(&provider, &1u32, &0u32, &0u32).unwrap();
    client.record_verification(&provider, &true, &10u32, &100u32).unwrap();
    let c = client.get_sla_compliance(&provider).unwrap();
    assert!(!c.response_time_ok);
    assert!(c.compliance_percent < 100);
}

#[test]
fn test_auto_suspend_below_threshold() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, provider) = setup_with_provider(&env);
    let client = OracleContractClient::new(&env, &cid);
    client.set_provider_sla(&provider, &1u32, &99u32, &99u32).unwrap();
    for _ in 0..5 {
        client.record_verification(&provider, &false, &60u32, &0u32).unwrap();
    }
    assert!(client.is_provider_suspended(&provider));
}

#[test]
fn test_reinstate_provider() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, provider) = setup_with_provider(&env);
    let client = OracleContractClient::new(&env, &cid);
    client.set_provider_sla(&provider, &1u32, &99u32, &99u32).unwrap();
    for _ in 0..5 {
        client.record_verification(&provider, &false, &60u32, &0u32).unwrap();
    }
    assert!(client.is_provider_suspended(&provider));
    client.reinstate_provider(&provider).unwrap();
    assert!(!client.is_provider_suspended(&provider));
}

// ---------------------------------------------------------------------------
// Feature 2 — Cost estimation
// ---------------------------------------------------------------------------

#[test]
fn test_estimate_cost_basic() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, provider) = setup_with_provider(&env);
    let client = OracleContractClient::new(&env, &cid);
    client.set_provider_pricing(&provider, &1_000_000u128, &10_000u128).unwrap();
    let est = client.estimate_cost(
        &provider, &1024u64, &Priority::Normal, &ContentComplexity::Simple,
    ).unwrap();
    assert_eq!(est.base_fee, 1_000_000);
    assert_eq!(est.size_fee, 10_000);
    assert_eq!(est.priority_fee, 0);
    assert_eq!(est.complexity_fee, 0);
    assert_eq!(est.total, 1_010_000);
}

#[test]
fn test_estimate_cost_high_priority() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, provider) = setup_with_provider(&env);
    let client = OracleContractClient::new(&env, &cid);
    client.set_provider_pricing(&provider, &1_000_000u128, &0u128).unwrap();
    let est = client.estimate_cost(
        &provider, &0u64, &Priority::High, &ContentComplexity::Simple,
    ).unwrap();
    // High adds 50 % of base = 500_000
    assert_eq!(est.priority_fee, 500_000);
    assert_eq!(est.total, 1_500_000);
}

#[test]
fn test_estimate_cost_complex_content() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, provider) = setup_with_provider(&env);
    let client = OracleContractClient::new(&env, &cid);
    client.set_provider_pricing(&provider, &1_000_000u128, &0u128).unwrap();
    let est = client.estimate_cost(
        &provider, &0u64, &Priority::Normal, &ContentComplexity::Complex,
    ).unwrap();
    // Complex adds 75 % of base = 750_000
    assert_eq!(est.complexity_fee, 750_000);
    assert_eq!(est.total, 1_750_000);
}

#[test]
fn test_estimate_cost_no_pricing_set() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, provider) = setup_with_provider(&env);
    let client = OracleContractClient::new(&env, &cid);
    let err = client
        .try_estimate_cost(&provider, &0u64, &Priority::Normal, &ContentComplexity::Simple)
        .unwrap_err().unwrap();
    assert_eq!(err, Error::PricingNotSet);
}
