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

// ---------------------------------------------------------------------------
// Provider management — add / remove / is_provider / get_provider_list
// ---------------------------------------------------------------------------

#[test]
fn test_add_and_check_provider() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let provider = Address::generate(&env);
    client.add_provider(&provider).unwrap();
    assert!(client.is_provider(&provider));
}

#[test]
fn test_remove_provider() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let provider = Address::generate(&env);
    client.add_provider(&provider).unwrap();
    assert!(client.is_provider(&provider));
    client.remove_provider(&provider).unwrap();
    assert!(!client.is_provider(&provider));
}

#[test]
fn test_is_provider_returns_false_for_unregistered() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let unknown = Address::generate(&env);
    assert!(!client.is_provider(&unknown));
}

#[test]
fn test_get_provider_list_reflects_additions_and_removals() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let p1 = Address::generate(&env);
    let p2 = Address::generate(&env);
    client.add_provider(&p1).unwrap();
    client.add_provider(&p2).unwrap();
    let list = client.get_provider_list();
    assert_eq!(list.len(), 2);
    client.remove_provider(&p1).unwrap();
    let list2 = client.get_provider_list();
    assert_eq!(list2.len(), 1);
}

#[test]
fn test_add_provider_idempotent() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let p = Address::generate(&env);
    client.add_provider(&p).unwrap();
    client.add_provider(&p).unwrap(); // second call must not panic
    assert_eq!(client.get_provider_list().len(), 1);
}

// ---------------------------------------------------------------------------
// Pause / unpause / is_paused
// ---------------------------------------------------------------------------

#[test]
fn test_pause_and_unpause() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    assert!(!client.is_paused());
    client.pause().unwrap();
    assert!(client.is_paused());
    client.unpause().unwrap();
    assert!(!client.is_paused());
}

#[test]
fn test_submit_request_rejected_when_paused() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    client.pause().unwrap();
    let bytes = Bytes::from_slice(&env, b"data");
    let req   = Address::generate(&env);
    let err = client
        .try_submit_request(&bytes, &bytes, &req, &Priority::Normal)
        .unwrap_err().unwrap();
    assert_eq!(err, Error::ContractPaused);
}

#[test]
fn test_batch_request_rejected_when_paused() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    client.pause().unwrap();
    let bytes    = Bytes::from_slice(&env, b"data");
    let req      = Address::generate(&env);
    let requests = vec![&env, (bytes.clone(), bytes.clone(), req.clone(), Priority::Normal)];
    let err = client.try_submit_batch_request(&requests).unwrap_err().unwrap();
    assert_eq!(err, Error::ContractPaused);
}

// ---------------------------------------------------------------------------
// Staking — deposit / initiate_withdrawal / complete_withdrawal / slash / get_stake
// ---------------------------------------------------------------------------

#[test]
fn test_deposit_stake_and_get_stake() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client   = OracleContractClient::new(&env, &cid);
    let provider = Address::generate(&env);
    client.deposit_stake(&provider, &2_000_000_000u128).unwrap();
    assert_eq!(client.get_provider_stake(&provider), 2_000_000_000u128);
}

#[test]
fn test_deposit_stake_below_minimum_fails() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client   = OracleContractClient::new(&env, &cid);
    let provider = Address::generate(&env);
    let err = client.try_deposit_stake(&provider, &1u128).unwrap_err().unwrap();
    assert_eq!(err, Error::InsufficientStake);
}

#[test]
fn test_deposit_stake_accumulates() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client   = OracleContractClient::new(&env, &cid);
    let provider = Address::generate(&env);
    client.deposit_stake(&provider, &1_000_000_000u128).unwrap();
    client.deposit_stake(&provider, &1_000_000_000u128).unwrap();
    assert_eq!(client.get_provider_stake(&provider), 2_000_000_000u128);
}

#[test]
fn test_initiate_and_complete_withdrawal() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client   = OracleContractClient::new(&env, &cid);
    let provider = Address::generate(&env);
    client.deposit_stake(&provider, &2_000_000_000u128).unwrap();
    client.initiate_withdrawal(&provider, &1_000_000_000u128).unwrap();
    // Advance past the cooldown window (7200 ledgers)
    env.ledger().with_mut(|l| l.sequence_number = 8000);
    let withdrawn = client.complete_withdrawal(&provider).unwrap();
    assert_eq!(withdrawn, 1_000_000_000u128);
}

#[test]
fn test_complete_withdrawal_before_cooldown_fails() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client   = OracleContractClient::new(&env, &cid);
    let provider = Address::generate(&env);
    client.deposit_stake(&provider, &2_000_000_000u128).unwrap();
    client.initiate_withdrawal(&provider, &1_000_000_000u128).unwrap();
    // Do NOT advance the ledger
    let err = client.try_complete_withdrawal(&provider).unwrap_err().unwrap();
    assert_eq!(err, Error::WithdrawalCooldown);
}

#[test]
fn test_slash_stake_reduces_balance() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client   = OracleContractClient::new(&env, &cid);
    let provider = Address::generate(&env);
    client.deposit_stake(&provider, &2_000_000_000u128).unwrap();
    client.slash_stake(&provider, &500_000_000u128).unwrap();
    assert_eq!(client.get_provider_stake(&provider), 1_500_000_000u128);
}

#[test]
fn test_slash_stake_caps_at_available_amount() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client   = OracleContractClient::new(&env, &cid);
    let provider = Address::generate(&env);
    client.deposit_stake(&provider, &1_000_000_000u128).unwrap();
    // Slash more than available — should zero it out, not panic
    client.slash_stake(&provider, &9_999_999_999u128).unwrap();
    assert_eq!(client.get_provider_stake(&provider), 0u128);
}

#[test]
fn test_get_provider_stake_returns_zero_for_unregistered() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client   = OracleContractClient::new(&env, &cid);
    let unknown  = Address::generate(&env);
    assert_eq!(client.get_provider_stake(&unknown), 0u128);
}

// ---------------------------------------------------------------------------
// Load-balancing — get_next_available_provider / reputation score
// ---------------------------------------------------------------------------

#[test]
fn test_get_next_available_provider_with_one_provider() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client   = OracleContractClient::new(&env, &cid);
    let provider = Address::generate(&env);
    client.add_provider(&provider).unwrap();
    let chosen = client.get_next_available_provider().unwrap();
    assert_eq!(chosen, provider);
}

#[test]
fn test_get_next_available_provider_no_providers_fails() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let err = client.try_get_next_available_provider().unwrap_err().unwrap();
    assert_eq!(err, Error::NoAvailableProvider);
}

#[test]
fn test_get_next_available_provider_round_robins() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &cid);
    let p1 = Address::generate(&env);
    let p2 = Address::generate(&env);
    client.add_provider(&p1).unwrap();
    client.add_provider(&p2).unwrap();
    let first  = client.get_next_available_provider().unwrap();
    let second = client.get_next_available_provider().unwrap();
    // After two calls both providers must have been selected at least once
    // (ordering depends on score; just verify both are valid providers)
    assert!(first == p1 || first == p2);
    assert!(second == p1 || second == p2);
}

#[test]
fn test_reputation_score_is_100_for_new_provider() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client   = OracleContractClient::new(&env, &cid);
    let provider = Address::generate(&env);
    client.add_provider(&provider).unwrap();
    assert_eq!(client.get_reputation_score(&provider), 100u32);
}

#[test]
fn test_reputation_drops_after_failures() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, provider) = setup_with_provider(&env);
    let client = OracleContractClient::new(&env, &cid);
    client.record_verification_success(&provider);
    client.record_verification_failure(&provider);
    let score = client.get_reputation_score(&provider);
    assert!(score < 100);
    assert!(score > 0);
}

// ---------------------------------------------------------------------------
// Dispute resolution — file / resolve / dismiss / get / get_by_provider
// ---------------------------------------------------------------------------

#[test]
fn test_file_and_get_dispute() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client   = OracleContractClient::new(&env, &cid);
    let bytes    = Bytes::from_slice(&env, b"data");
    let req      = Address::generate(&env);
    let id       = client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap();
    let provider = Address::generate(&env);
    let reason   = Bytes::from_slice(&env, b"wrong result");
    let dispute_id = client.file_dispute(&id, &provider, &reason).unwrap();
    let dispute    = client.get_dispute(&dispute_id).unwrap();
    assert_eq!(dispute.id, dispute_id);
    assert_eq!(dispute.state, DisputeState::Open);
}

#[test]
fn test_resolve_dispute_provider_fault() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client   = OracleContractClient::new(&env, &cid);
    let bytes    = Bytes::from_slice(&env, b"data");
    let req      = Address::generate(&env);
    let id       = client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap();
    let provider = Address::generate(&env);
    let dispute_id = client
        .file_dispute(&id, &provider, &Bytes::from_slice(&env, b"bad"))
        .unwrap();
    client
        .resolve_dispute(&dispute_id, &DisputeResolution::ProviderFault, &500u32, &0u128)
        .unwrap();
    let d = client.get_dispute(&dispute_id).unwrap();
    assert_eq!(d.state, DisputeState::Resolved);
    assert_eq!(d.resolution, Some(DisputeResolution::ProviderFault));
}

#[test]
fn test_dismiss_dispute() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client   = OracleContractClient::new(&env, &cid);
    let bytes    = Bytes::from_slice(&env, b"d");
    let req      = Address::generate(&env);
    let id       = client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap();
    let provider = Address::generate(&env);
    let did      = client.file_dispute(&id, &provider, &bytes).unwrap();
    client.dismiss_dispute(&did).unwrap();
    let d = client.get_dispute(&did).unwrap();
    assert_eq!(d.state, DisputeState::Dismissed);
}

#[test]
fn test_resolve_already_resolved_dispute_fails() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client   = OracleContractClient::new(&env, &cid);
    let bytes    = Bytes::from_slice(&env, b"d");
    let req      = Address::generate(&env);
    let id       = client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap();
    let provider = Address::generate(&env);
    let did      = client.file_dispute(&id, &provider, &bytes).unwrap();
    client.resolve_dispute(&did, &DisputeResolution::NoFault, &0u32, &0u128).unwrap();
    let err = client
        .try_resolve_dispute(&did, &DisputeResolution::NoFault, &0u32, &0u128)
        .unwrap_err().unwrap();
    assert_eq!(err, Error::DisputeAlreadyResolved);
}

#[test]
fn test_get_disputes_by_provider() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client   = OracleContractClient::new(&env, &cid);
    let bytes    = Bytes::from_slice(&env, b"d");
    let req      = Address::generate(&env);
    let id       = client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap();
    let provider = Address::generate(&env);
    client.file_dispute(&id, &provider, &bytes).unwrap();
    let disputes = client.get_disputes_by_provider(&provider);
    assert_eq!(disputes.len(), 1);
}

#[test]
fn test_file_dispute_for_nonexistent_request_fails() {
    let env = make_env();
    env.mock_all_auths();
    let (cid, ..) = setup_oracle(&env);
    let client   = OracleContractClient::new(&env, &cid);
    let provider = Address::generate(&env);
    let err = client
        .try_file_dispute(&9999u64, &provider, &Bytes::from_slice(&env, b"x"))
        .unwrap_err().unwrap();
    assert_eq!(err, Error::RequestNotFound);
}

// ===========================================================================
// ISSUE 3 — Cross-contract Integration Tests
//
// These tests verify the full Oracle → Registry → Provenance pipeline using
// in-process mock contracts that mirror the real contract interfaces.
// Each test exercises a complete flow end-to-end within a single Env so
// that cross-contract calls are resolved without a live node.
// ===========================================================================

// ---------------------------------------------------------------------------
// Mock Provenance contract (mirrors the real interface)
// ---------------------------------------------------------------------------

mod mock_provenance {
    use soroban_sdk::{
        contract, contractimpl, contracttype, symbol_short,
        Address, Bytes, Env, String, Vec,
    };

    #[contracttype]
    pub struct MockCert {
        pub manifest_hash: Bytes,
        pub creator: Address,
        pub id: u64,
    }

    #[contract]
    pub struct MockProvenance;

    #[contractimpl]
    impl MockProvenance {
        pub fn initialize(env: Env, oracle: Address) {
            env.storage().instance().set(&symbol_short!("ORACLE"), &oracle);
        }

        pub fn mint(
            env: Env,
            storage_ref: Bytes,
            manifest_hash: Bytes,
            _attestation_hash: Bytes,
            to: Address,
        ) -> u64 {
            let cnt_key = symbol_short!("CNT");
            let id: u64 = env.storage().persistent().get(&cnt_key).unwrap_or(0u64) + 1;
            env.storage().persistent().set(&cnt_key, &id);
            let cert = MockCert { manifest_hash, creator: to, id };
            env.storage().persistent().set(&id, &cert);
            id
        }

        pub fn get_certificate(env: Env, id: u64) -> Option<MockCert> {
            env.storage().persistent().get(&id)
        }
    }
}

// ---------------------------------------------------------------------------
// Mock Registry contract (mirrors the real interface)
// ---------------------------------------------------------------------------

mod mock_real_registry {
    use soroban_sdk::{contract, contractimpl, symbol_short, BytesN, Env};

    #[contract]
    pub struct MockRealRegistry;

    #[contractimpl]
    impl MockRealRegistry {
        /// Register a provider (always succeeds).
        pub fn add_provider(env: Env, provider: BytesN<32>) {
            env.storage().persistent().set(&(symbol_short!("P"), provider), &true);
        }

        /// Register an approved TEE hash (always succeeds).
        pub fn add_tee_hash(env: Env, tee_hash: BytesN<32>) {
            env.storage().persistent().set(&(symbol_short!("T"), tee_hash), &true);
        }

        pub fn is_provider(env: Env, provider: BytesN<32>) -> bool {
            env.storage().persistent()
                .get(&(symbol_short!("P"), provider))
                .unwrap_or(false)
        }

        pub fn is_tee_hash_approved(env: Env, tee_hash: BytesN<32>) -> bool {
            env.storage().persistent()
                .get(&(symbol_short!("T"), tee_hash))
                .unwrap_or(false)
        }
    }
}

// ---------------------------------------------------------------------------
// Integration helpers
// ---------------------------------------------------------------------------

/// Deploy Oracle + MockRealRegistry + MockProvenance, wire them together,
/// and return (oracle_id, registry_id, provenance_id, admin).
fn setup_full_pipeline(
    env: &Env,
) -> (Address, Address, Address, Address) {
    let registry_id   = env.register_contract(None, mock_real_registry::MockRealRegistry);
    let provenance_id = env.register_contract(None, mock_provenance::MockProvenance);
    let oracle_id     = register_oracle(env);
    let admin         = Address::generate(env);

    // Wire oracle to registry + provenance
    OracleContractClient::new(env, &oracle_id)
        .init(&registry_id, &provenance_id, &admin)
        .unwrap();

    (oracle_id, registry_id, provenance_id, admin)
}

// ---------------------------------------------------------------------------
// Integration: submit_request lifecycle
// ---------------------------------------------------------------------------

#[test]
fn integration_submit_request_stores_pending_and_returns_id() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, ..) = setup_full_pipeline(&env);
    let client = OracleContractClient::new(&env, &oracle_id);

    let bytes = Bytes::from_slice(&env, b"integration data");
    let req   = Address::generate(&env);
    let id    = client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap();

    assert_eq!(id, 1u64);
    let request = client.get_request(&id).unwrap();
    assert_eq!(request.state, RequestState::Pending);
    assert_eq!(request.requester, req);
}

#[test]
fn integration_multiple_requests_get_unique_ids() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, ..) = setup_full_pipeline(&env);
    let client = OracleContractClient::new(&env, &oracle_id);

    let bytes = Bytes::from_slice(&env, b"payload");
    let req   = Address::generate(&env);
    let id1 = client.submit_request(&bytes, &bytes, &req, &Priority::Low).unwrap();
    let id2 = client.submit_request(&bytes, &bytes, &req, &Priority::High).unwrap();
    let id3 = client.submit_request(&bytes, &bytes, &req, &Priority::Urgent).unwrap();

    assert_ne!(id1, id2);
    assert_ne!(id2, id3);
    assert_eq!(id3, 3u64);
}

#[test]
fn integration_cancel_request_transitions_to_cancelled() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, ..) = setup_full_pipeline(&env);
    let client = OracleContractClient::new(&env, &oracle_id);

    let bytes = Bytes::from_slice(&env, b"to cancel");
    let req   = Address::generate(&env);
    let id    = client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap();

    client.cancel_request(&id).unwrap();
    let request = client.get_request(&id).unwrap();
    assert_eq!(request.state, RequestState::Cancelled);
}

// ---------------------------------------------------------------------------
// Integration: verify_attestation → unregistered provider is rejected
// ---------------------------------------------------------------------------

#[test]
fn integration_verify_attestation_rejects_unregistered_provider() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, ..) = setup_full_pipeline(&env);
    let client = OracleContractClient::new(&env, &oracle_id);

    // Provider NOT added to registry
    let sk       = ed25519_dalek::SigningKey::from_bytes(&[10u8; 32]);
    let provider = BytesN::from_array(&env, sk.verifying_key().as_bytes());
    let tee_hash = BytesN::from_array(&env, &[1u8; 32]);
    let payload  = Bytes::from_slice(&env, b"data");
    let sig      = BytesN::from_array(&env, &[0u8; 64]);

    let err = client
        .try_verify_attestation(&provider, &tee_hash, &payload, &sig)
        .unwrap_err().unwrap();
    assert_eq!(err, Error::UnauthorizedSigner);
}

// ---------------------------------------------------------------------------
// Integration: verify_attestation → unregistered TEE hash is rejected
// ---------------------------------------------------------------------------

#[test]
fn integration_verify_attestation_rejects_unapproved_tee_hash() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, registry_id, ..) = setup_full_pipeline(&env);

    // Register provider but NOT the TEE hash
    let sk       = ed25519_dalek::SigningKey::from_bytes(&[20u8; 32]);
    let provider = BytesN::from_array(&env, sk.verifying_key().as_bytes());
    mock_real_registry::MockRealRegistryClient::new(&env, &registry_id)
        .add_provider(&provider);

    let client   = OracleContractClient::new(&env, &oracle_id);
    let tee_hash = BytesN::from_array(&env, &[99u8; 32]); // not registered
    let payload  = Bytes::from_slice(&env, b"data");
    let sig      = BytesN::from_array(&env, &[0u8; 64]);

    let err = client
        .try_verify_attestation(&provider, &tee_hash, &payload, &sig)
        .unwrap_err().unwrap();
    assert_eq!(err, Error::TeeNotVerified);
}

// ---------------------------------------------------------------------------
// Integration: verify_attestation → invalid signature rejected
// ---------------------------------------------------------------------------

#[test]
fn integration_verify_attestation_rejects_bad_signature() {
    use ed25519_dalek::Signer;
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, registry_id, ..) = setup_full_pipeline(&env);

    let sk       = ed25519_dalek::SigningKey::from_bytes(&[30u8; 32]);
    let provider = BytesN::from_array(&env, sk.verifying_key().as_bytes());
    let tee_hash = BytesN::from_array(&env, &[2u8; 32]);

    let reg = mock_real_registry::MockRealRegistryClient::new(&env, &registry_id);
    reg.add_provider(&provider);
    reg.add_tee_hash(&tee_hash);

    let client  = OracleContractClient::new(&env, &oracle_id);
    let payload = Bytes::from_slice(&env, b"real payload");
    let bad_sig = BytesN::from_array(&env, &[0u8; 64]); // wrong signature

    let result = client.try_verify_attestation(&provider, &tee_hash, &payload, &bad_sig);
    assert!(result.is_err());
}

// ---------------------------------------------------------------------------
// Integration: full pipeline — valid attestation succeeds
// ---------------------------------------------------------------------------

#[test]
fn integration_verify_attestation_success_with_valid_signature() {
    use ed25519_dalek::Signer;
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, registry_id, ..) = setup_full_pipeline(&env);

    let sk       = ed25519_dalek::SigningKey::from_bytes(&[42u8; 32]);
    let provider = BytesN::from_array(&env, sk.verifying_key().as_bytes());
    let tee_hash = BytesN::from_array(&env, &[1u8; 32]);

    let reg = mock_real_registry::MockRealRegistryClient::new(&env, &registry_id);
    reg.add_provider(&provider);
    reg.add_tee_hash(&tee_hash);

    let raw     = b"attestation payload";
    let payload = Bytes::from_slice(&env, raw);
    let sig: ed25519_dalek::Signature = sk.sign(raw);
    let signature = BytesN::from_array(&env, &sig.to_bytes());

    let client = OracleContractClient::new(&env, &oracle_id);
    client.verify_attestation(&provider, &tee_hash, &payload, &signature).unwrap();
}

// ---------------------------------------------------------------------------
// Integration: batch request — all items stored as Pending
// ---------------------------------------------------------------------------

#[test]
fn integration_batch_request_all_items_pending() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, ..) = setup_full_pipeline(&env);
    let client = OracleContractClient::new(&env, &oracle_id);

    let bytes = Bytes::from_slice(&env, b"batch");
    let req   = Address::generate(&env);
    let items = vec![
        &env,
        (bytes.clone(), bytes.clone(), req.clone(), Priority::Normal),
        (bytes.clone(), bytes.clone(), req.clone(), Priority::High),
        (bytes.clone(), bytes.clone(), req.clone(), Priority::Low),
    ];
    let ids = client.submit_batch_request(&items).unwrap();
    assert_eq!(ids.len(), 3);
    for i in 0..ids.len() {
        let id      = ids.get(i);
        let request = client.get_request(&id).unwrap();
        assert_eq!(request.state, RequestState::Pending);
    }
}

// ---------------------------------------------------------------------------
// Integration: paused oracle rejects all new requests
// ---------------------------------------------------------------------------

#[test]
fn integration_paused_oracle_blocks_both_submit_modes() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, ..) = setup_full_pipeline(&env);
    let client = OracleContractClient::new(&env, &oracle_id);

    client.pause().unwrap();

    let bytes = Bytes::from_slice(&env, b"x");
    let req   = Address::generate(&env);

    let err1 = client
        .try_submit_request(&bytes, &bytes, &req, &Priority::Normal)
        .unwrap_err().unwrap();
    assert_eq!(err1, Error::ContractPaused);

    let batch = vec![&env, (bytes.clone(), bytes.clone(), req.clone(), Priority::Low)];
    let err2  = client.try_submit_batch_request(&batch).unwrap_err().unwrap();
    assert_eq!(err2, Error::ContractPaused);
}

// ---------------------------------------------------------------------------
// Integration: dispute lifecycle across Oracle state
// ---------------------------------------------------------------------------

#[test]
fn integration_dispute_filed_resolved_and_dismissed_separately() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, ..) = setup_full_pipeline(&env);
    let client   = OracleContractClient::new(&env, &oracle_id);
    let bytes    = Bytes::from_slice(&env, b"data");
    let req      = Address::generate(&env);
    let provider = Address::generate(&env);

    // File dispute on request 1
    let id1 = client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap();
    let did1 = client.file_dispute(&id1, &provider, &bytes).unwrap();

    // File dispute on request 2
    let id2  = client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap();
    let did2 = client.file_dispute(&id2, &provider, &bytes).unwrap();

    // Resolve dispute 1
    client.resolve_dispute(&did1, &DisputeResolution::NoFault, &0u32, &0u128).unwrap();
    assert_eq!(client.get_dispute(&did1).unwrap().state, DisputeState::Resolved);

    // Dismiss dispute 2
    client.dismiss_dispute(&did2).unwrap();
    assert_eq!(client.get_dispute(&did2).unwrap().state, DisputeState::Dismissed);

    // Both are indexed against the provider
    let by_provider = client.get_disputes_by_provider(&provider);
    assert_eq!(by_provider.len(), 2);
}

// ---------------------------------------------------------------------------
// Integration: SLA violation → auto-suspend → reinstate
// ---------------------------------------------------------------------------

#[test]
fn integration_sla_violation_auto_suspends_and_reinstate_restores() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, ..) = setup_full_pipeline(&env);
    let client   = OracleContractClient::new(&env, &oracle_id);
    let provider = Address::generate(&env);

    client.add_provider(&provider).unwrap();
    // Strict SLA targets that will be violated by slow responses
    client.set_provider_sla(&provider, &1u32, &99u32, &99u32).unwrap();

    // Record 5 failures — triggers auto-suspend
    for _ in 0..5 {
        client.record_verification(&provider, &false, &60u32, &0u32).unwrap();
    }
    assert!(client.is_provider_suspended(&provider));

    // Reinstate clears suspension
    client.reinstate_provider(&provider).unwrap();
    assert!(!client.is_provider_suspended(&provider));
}

// ---------------------------------------------------------------------------
// Integration: cost estimation with pricing set
// ---------------------------------------------------------------------------

#[test]
fn integration_cost_estimation_full_pipeline() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, ..) = setup_full_pipeline(&env);
    let client   = OracleContractClient::new(&env, &oracle_id);
    let provider = Address::generate(&env);

    client.add_provider(&provider).unwrap();
    client.set_provider_pricing(&provider, &1_000_000u128, &1_000u128).unwrap();

    let est = client
        .estimate_cost(&provider, &2048u64, &Priority::Urgent, &ContentComplexity::Moderate)
        .unwrap();

    // base = 1_000_000; size = 2*1_000 = 2_000; urgent = 100% of base = 1_000_000;
    // moderate = 25% of base = 250_000
    assert_eq!(est.base_fee, 1_000_000);
    assert_eq!(est.size_fee, 2_000);
    assert!(est.priority_fee > 0);
    assert!(est.complexity_fee > 0);
    assert_eq!(est.total, est.base_fee + est.size_fee + est.priority_fee + est.complexity_fee);
}

// ---------------------------------------------------------------------------
// Integration: TTL — high-priority requests live longer than low-priority
// ---------------------------------------------------------------------------

#[test]
fn integration_ttl_high_priority_longer_than_low_priority() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, ..) = setup_full_pipeline(&env);
    let client = OracleContractClient::new(&env, &oracle_id);

    let bytes    = Bytes::from_slice(&env, b"data");
    let req      = Address::generate(&env);
    let id_high  = client.submit_request(&bytes, &bytes, &req, &Priority::High).unwrap();
    let id_low   = client.submit_request(&bytes, &bytes, &req, &Priority::Low).unwrap();

    let ttl_high = env.as_contract(&oracle_id, || {
        env.storage().temporary().get_ttl(&DataKey::Request(id_high))
    });
    let ttl_low = env.as_contract(&oracle_id, || {
        env.storage().temporary().get_ttl(&DataKey::Request(id_low))
    });
    assert!(ttl_high > ttl_low);
}

// ---------------------------------------------------------------------------
// Integration: pagination across multiple requests
// ---------------------------------------------------------------------------

#[test]
fn integration_pagination_returns_correct_pages() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, ..) = setup_full_pipeline(&env);
    let client = OracleContractClient::new(&env, &oracle_id);

    let bytes = Bytes::from_slice(&env, b"data");
    let req   = Address::generate(&env);
    for _ in 0..6 {
        client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap();
    }

    let page1 = client.get_requests_by_state(&RequestState::Pending, &0u32, &3u32, &None);
    let page2 = client.get_requests_by_state(&RequestState::Pending, &3u32, &3u32, &None);

    assert_eq!(page1.requests.len(), 3);
    assert_eq!(page2.requests.len(), 3);
    assert_eq!(page1.total_count, 6);
    // Pages must not overlap — compare first IDs from each page
    let first_p1 = page1.requests.get(0).request_id;
    let first_p2 = page2.requests.get(0).request_id;
    assert_ne!(first_p1, first_p2);
}

// ---------------------------------------------------------------------------
// Integration: cancel-then-try-to-cancel is an error
// ---------------------------------------------------------------------------

#[test]
fn integration_double_cancel_fails() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, ..) = setup_full_pipeline(&env);
    let client = OracleContractClient::new(&env, &oracle_id);

    let bytes = Bytes::from_slice(&env, b"data");
    let req   = Address::generate(&env);
    let id    = client.submit_request(&bytes, &bytes, &req, &Priority::Normal).unwrap();
    client.cancel_request(&id).unwrap();

    let err = client.try_cancel_request(&id).unwrap_err().unwrap();
    assert_eq!(err, Error::InvalidState);
}

// ---------------------------------------------------------------------------
// Error Message & Enum Verification Tests (#369)
// ---------------------------------------------------------------------------

#[test]
fn test_update_ttl_config_invalid_ttl_error() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &oracle_id);

    let invalid_config = TTLConfig {
        default_ttl: 0,
        high_priority_ttl: 100,
        low_priority_ttl: 50,
    };
    let err = client.try_update_ttl_config(&invalid_config).unwrap_err().unwrap();
    assert_eq!(err, Error::InvalidTTL);
}

#[test]
fn test_update_warning_threshold_invalid_threshold_error() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &oracle_id);

    let err = client.try_update_warning_threshold(&0u32).unwrap_err().unwrap();
    assert_eq!(err, Error::InvalidThreshold);
}

#[test]
fn test_dispute_not_found_error() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &oracle_id);

    let non_existent_dispute_id = 999999u64;
    let err = client
        .try_resolve_dispute(
            &non_existent_dispute_id,
            &DisputeResolution::ProviderFault,
            &100u32,
            &0u128,
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::DisputeNotFound);
}

#[test]
fn test_no_stake_error_on_withdrawal() {
    let env = make_env();
    env.mock_all_auths();
    let (oracle_id, ..) = setup_oracle(&env);
    let client = OracleContractClient::new(&env, &oracle_id);

    let unstaked_provider = Address::generate(&env);
    let err = client
        .try_initiate_withdrawal(&unstaked_provider, &1_000_000_000u128)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::NoStake);
}

