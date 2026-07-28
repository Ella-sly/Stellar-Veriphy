#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Address, Bytes, BytesN, Env, String, Vec};

// ---------------------------------------------------------------------------
// #24 – provenance cross-contract client
// ---------------------------------------------------------------------------

mod provenance {
    use soroban_sdk::{contractclient, contracttype, Address, Bytes, Env, String, Vec};

    #[contracttype]
    pub struct ProvenanceCert {
        pub storage_ref: Bytes,
        pub manifest_hash: Bytes,
        pub attestation_hash: Bytes,
        pub creator: Address,
        pub timestamp: u64,
    }

    #[contracttype]
    pub struct CertificateMetadata {
        pub display_name: String,
        pub description: String,
        pub version: u32,
    }

    #[contractclient(name = "ProvenanceClient")]
    pub trait ProvenanceContract {
        fn mint(
            env: Env,
            storage_ref: Bytes,
            manifest_hash: Bytes,
            attestation_hash: Bytes,
            to: Address,
        ) -> u64;

        // #172 - Certificate Transfer
        fn transfer_certificate(
            env: Env,
            certificate_id: u64,
            new_owner: Address,
        );

        // #173 - Metadata Updates
        fn update_metadata(
            env: Env,
            certificate_id: u64,
            display_name: String,
            description: String,
        );

        fn get_metadata(
            env: Env,
            certificate_id: u64,
        ) -> CertificateMetadata;

        // #174 - Query by Time Range
        fn get_certificates_by_time_range(
            env: Env,
            start_time: u64,
            end_time: u64,
            offset: u32,
            limit: u32,
        ) -> Vec<(u64, ProvenanceCert)>;

        // #175 - Batch Minting
        fn mint_batch(
            env: Env,
            storage_refs: Vec<Bytes>,
            manifest_hashes: Vec<Bytes>,
            attestation_hashes: Vec<Bytes>,
            to: Address,
        ) -> Vec<u64>;
    }
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotInitialized = 1,
    Unauthorized = 2,
    InvalidThreshold = 3,
    ProposalNotFound = 4,
    ProposalExpired = 5,
    InsufficientApprovals = 6,
    TeeHashNotFound = 7,
    ProviderNotFound = 8,
    CertificateExpired = 9,
}

// ---------------------------------------------------------------------------
// Storage keys  (#21 Provider variant, #23 typed BytesN<32> keys)
// ---------------------------------------------------------------------------

#[contracttype]
pub enum DataKey {
    Admin,
    Provenance,
    TeeHash(BytesN<32>),  // #23
    Provider(BytesN<32>), // #21
    MultisigThreshold,
    MultisigAdmins,
    Proposal(u64),
    ProposalApprovals(u64),
    NextProposalId,
    TeeHashVersionInfo(BytesN<32>), // #187
    TeeHashesByVersion(u32),        // #187
    TeeHashVersionHistory,          // #187
    ProviderReputation(BytesN<32>), // #186
    ProviderList,                   // #186
    TeeHashCertRef(BytesN<32>),     // certificate reference on a TEE hash
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalOperation {
    AddProvider(BytesN<32>),
    RemoveProvider(BytesN<32>),
    AddTeeHash(BytesN<32>),
    UpdateThreshold(u32),
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Proposal {
    pub id: u64,
    pub operation: ProposalOperation,
    pub proposer: Address,
    pub created_ledger: u32,
    pub execution_ledger: u32,
    pub executed: bool,
}

// ---------------------------------------------------------------------------
// #187 – TEE hash versioning
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug)]
pub struct TeeHashVersionInfo {
    pub code_hash: BytesN<32>,
    pub version: u32,
    pub added_at: u64,
    pub deprecated: bool,
    pub deprecated_at: Option<u64>,
}

// ---------------------------------------------------------------------------
// #186 – Provider reputation system
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug)]
pub struct ProviderReputation {
    pub score: u32,
    pub total_verifications: u64,
    pub successful_count: u64,
    pub failed_count: u64,
    pub last_updated: u64,
}

const REPUTATION_MAX_SCORE: u32 = 1000;
const REPUTATION_DECAY_PERIOD_SECS: u64 = 2_592_000; // 30 days
const REPUTATION_DECAY_AMOUNT: u32 = 50;

// ---------------------------------------------------------------------------
// #24 – VerificationResult
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub struct VerificationResult {
    pub success: bool,
    pub content_hash: BytesN<32>,
    pub certificate_id: u64,
    pub state: String,
}

// ---------------------------------------------------------------------------
// Feature 3 – Attestation certificate references on TEE hash entries
// ---------------------------------------------------------------------------

/// A DER/PEM certificate reference attached to an approved TEE code hash.
/// Stores enough metadata to validate freshness without holding the full cert.
#[contracttype]
#[derive(Clone, Debug)]
pub struct TeeHashCertRef {
    /// Human-readable identifier or fingerprint of the certificate issuer.
    pub issuer: String,
    /// Unix timestamp (seconds) from which the certificate is valid.
    pub valid_from: u64,
    /// Unix timestamp (seconds) at which the certificate expires.
    pub valid_until: u64,
    /// Optional external URI or IPFS reference to the full DER/PEM certificate.
    pub cert_uri: Option<String>,
    /// The TEE code hash this certificate covers.
    pub code_hash: BytesN<32>,
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct RegistryContract;

#[contractimpl]
impl RegistryContract {
    /// One-time initialisation.
    pub fn init(env: Env, admin: Address, provenance: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Provenance, &provenance);

        let mut admins: Vec<Address> = Vec::new(&env);
        admins.push_back(admin);
        env.storage()
            .instance()
            .set(&DataKey::MultisigAdmins, &admins);
        env.storage()
            .instance()
            .set(&DataKey::MultisigThreshold, &1u32);
        env.storage()
            .instance()
            .set(&DataKey::NextProposalId, &1u64);
    }

    pub fn get_admin(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::Admin)
    }

    // -----------------------------------------------------------------------
    // #22 / #23 – add_tee_hash / is_tee_hash_approved (BytesN<32> keys)
    // -----------------------------------------------------------------------

    /// Register an approved TEE code hash (admin-gated).  #22 #23
    pub fn add_tee_hash(env: Env, code_hash: BytesN<32>) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Not initialized");
        admin.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::TeeHash(code_hash), &true);
    }

    /// Check whether a TEE code hash is approved.  #22 #23
    pub fn is_tee_hash_approved(env: Env, code_hash: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::TeeHash(code_hash))
            .unwrap_or(false)
    }

    // -----------------------------------------------------------------------
    // #187 – TEE hash versioning
    // -----------------------------------------------------------------------

    /// Register an approved TEE code hash with an explicit version (admin-gated).
    /// Multiple versions may be active simultaneously, and multiple hashes may
    /// share the same version.
    pub fn add_tee_hash_version(env: Env, code_hash: BytesN<32>, version: u32) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Not initialized");
        admin.require_auth();

        env.storage()
            .persistent()
            .set(&DataKey::TeeHash(code_hash.clone()), &true);

        let info = TeeHashVersionInfo {
            code_hash: code_hash.clone(),
            version,
            added_at: env.ledger().timestamp(),
            deprecated: false,
            deprecated_at: None,
        };
        env.storage()
            .persistent()
            .set(&DataKey::TeeHashVersionInfo(code_hash.clone()), &info);

        let version_key = DataKey::TeeHashesByVersion(version);
        let mut hashes: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&version_key)
            .unwrap_or(Vec::new(&env));
        if !hashes.contains(&code_hash) {
            hashes.push_back(code_hash);
            env.storage().persistent().set(&version_key, &hashes);
        }

        let mut history: Vec<TeeHashVersionInfo> = env
            .storage()
            .persistent()
            .get(&DataKey::TeeHashVersionHistory)
            .unwrap_or(Vec::new(&env));
        history.push_back(info);
        env.storage()
            .persistent()
            .set(&DataKey::TeeHashVersionHistory, &history);
    }

    /// Deprecate a previously registered TEE code hash (admin-gated). The
    /// hash remains queryable but is flagged as deprecated; other active
    /// versions are unaffected.
    pub fn deprecate_tee_hash(env: Env, code_hash: BytesN<32>) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let mut info: TeeHashVersionInfo = env
            .storage()
            .persistent()
            .get(&DataKey::TeeHashVersionInfo(code_hash.clone()))
            .ok_or(Error::TeeHashNotFound)?;

        info.deprecated = true;
        info.deprecated_at = Some(env.ledger().timestamp());
        env.storage()
            .persistent()
            .set(&DataKey::TeeHashVersionInfo(code_hash), &info);

        let mut history: Vec<TeeHashVersionInfo> = env
            .storage()
            .persistent()
            .get(&DataKey::TeeHashVersionHistory)
            .unwrap_or(Vec::new(&env));
        history.push_back(info);
        env.storage()
            .persistent()
            .set(&DataKey::TeeHashVersionHistory, &history);

        Ok(())
    }

    /// Fetch version metadata for a TEE code hash.
    pub fn get_tee_hash_version(env: Env, code_hash: BytesN<32>) -> Result<TeeHashVersionInfo, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::TeeHashVersionInfo(code_hash))
            .ok_or(Error::TeeHashNotFound)
    }

    /// Query all TEE code hashes registered under a given version.
    pub fn get_tee_hashes_by_version(env: Env, version: u32) -> Vec<BytesN<32>> {
        env.storage()
            .persistent()
            .get(&DataKey::TeeHashesByVersion(version))
            .unwrap_or(Vec::new(&env))
    }

    /// Full chronological history of TEE hash version registrations and
    /// deprecations.
    pub fn get_tee_hash_version_history(env: Env) -> Vec<TeeHashVersionInfo> {
        env.storage()
            .persistent()
            .get(&DataKey::TeeHashVersionHistory)
            .unwrap_or(Vec::new(&env))
    }

    // -----------------------------------------------------------------------
    // #21 – add_provider / is_provider (BytesN<32> keys)
    // -----------------------------------------------------------------------

    /// Register a trusted oracle provider public key (admin-gated).  #21
    pub fn add_provider(env: Env, provider: BytesN<32>) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Not initialized");
        admin.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Provider(provider.clone()), &true);

        // #186 — seed reputation tracking for newly registered providers
        if !env
            .storage()
            .persistent()
            .has(&DataKey::ProviderReputation(provider.clone()))
        {
            let reputation = ProviderReputation {
                score: REPUTATION_MAX_SCORE / 2,
                total_verifications: 0,
                successful_count: 0,
                failed_count: 0,
                last_updated: env.ledger().timestamp(),
            };
            env.storage()
                .persistent()
                .set(&DataKey::ProviderReputation(provider.clone()), &reputation);

            let mut providers: Vec<BytesN<32>> = env
                .storage()
                .persistent()
                .get(&DataKey::ProviderList)
                .unwrap_or(Vec::new(&env));
            providers.push_back(provider);
            env.storage()
                .persistent()
                .set(&DataKey::ProviderList, &providers);
        }
    }

    /// Check whether a provider public key is registered.  #21
    pub fn is_provider(env: Env, provider: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Provider(provider))
            .unwrap_or(false)
    }

    // -----------------------------------------------------------------------
    // #186 – provider reputation system
    // -----------------------------------------------------------------------

    /// Record the outcome of a provider verification and recompute its
    /// reputation score (admin-gated).
    pub fn record_verification_result(
        env: Env,
        provider: BytesN<32>,
        success: bool,
    ) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let mut reputation: ProviderReputation = env
            .storage()
            .persistent()
            .get(&DataKey::ProviderReputation(provider.clone()))
            .ok_or(Error::ProviderNotFound)?;

        reputation.total_verifications += 1;
        if success {
            reputation.successful_count += 1;
        } else {
            reputation.failed_count += 1;
        }

        reputation.score = ((reputation.successful_count as u128 * REPUTATION_MAX_SCORE as u128)
            / reputation.total_verifications as u128) as u32;
        reputation.last_updated = env.ledger().timestamp();

        env.storage()
            .persistent()
            .set(&DataKey::ProviderReputation(provider), &reputation);

        Ok(())
    }

    /// Apply time-based decay to a provider's score if it has been inactive
    /// for one or more decay periods. Callable by anyone; decay is a
    /// deterministic function of elapsed time, not an admin action.
    pub fn apply_reputation_decay(env: Env, provider: BytesN<32>) -> Result<(), Error> {
        let mut reputation: ProviderReputation = env
            .storage()
            .persistent()
            .get(&DataKey::ProviderReputation(provider.clone()))
            .ok_or(Error::ProviderNotFound)?;

        let now = env.ledger().timestamp();
        let elapsed = now.saturating_sub(reputation.last_updated);
        let periods = elapsed / REPUTATION_DECAY_PERIOD_SECS;

        if periods > 0 {
            let decay = REPUTATION_DECAY_AMOUNT.saturating_mul(periods as u32);
            reputation.score = reputation.score.saturating_sub(decay);
            reputation.last_updated = now;
            env.storage()
                .persistent()
                .set(&DataKey::ProviderReputation(provider), &reputation);
        }

        Ok(())
    }

    /// Fetch a provider's current reputation.
    pub fn get_provider_reputation(env: Env, provider: BytesN<32>) -> Result<ProviderReputation, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::ProviderReputation(provider))
            .ok_or(Error::ProviderNotFound)
    }

    /// Query all registered providers whose score meets or exceeds a
    /// threshold.
    pub fn get_providers_by_reputation_threshold(
        env: Env,
        min_score: u32,
    ) -> Vec<BytesN<32>> {
        let providers: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::ProviderList)
            .unwrap_or(Vec::new(&env));

        let mut result: Vec<BytesN<32>> = Vec::new(&env);
        for provider in providers.iter() {
            if let Some(reputation) = env
                .storage()
                .persistent()
                .get::<DataKey, ProviderReputation>(&DataKey::ProviderReputation(provider.clone()))
            {
                if reputation.score >= min_score {
                    result.push_back(provider);
                }
            }
        }
        result
    }

    // -----------------------------------------------------------------------
    // #24 – verify_and_mint
    // -----------------------------------------------------------------------

    /// Hash `content`, verify it matches `expected_hash`, then cross-call
    /// the provenance contract to mint a certificate.  #24
    pub fn verify_and_mint(
        env: Env,
        content: Bytes,
        expected_hash: BytesN<32>,
        owner: Address,
    ) -> VerificationResult {
        let computed: BytesN<32> = env.crypto().sha256(&content).into();

        if computed != expected_hash {
            return VerificationResult {
                success: false,
                content_hash: computed,
                certificate_id: 0,
                state: String::from_str(&env, "hash_mismatch"),
            };
        }

        let provenance_id: Address = env
            .storage()
            .instance()
            .get(&DataKey::Provenance)
            .expect("Not initialized");

        let client = provenance::ProvenanceClient::new(&env, &provenance_id);
        let empty = Bytes::from_slice(&env, &[]);
        let cert_id = client.mint(&content, &empty, &empty, &owner);

        VerificationResult {
            success: true,
            content_hash: computed,
            certificate_id: cert_id,
            state: String::from_str(&env, "minted"),
        }
    }

    // -----------------------------------------------------------------------
    // #163 – Multi-Signature Support
    // -----------------------------------------------------------------------

    pub fn get_multisig_threshold(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::MultisigThreshold)
            .unwrap_or(1)
    }

    pub fn update_multisig_threshold(env: Env, threshold: u32) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        if threshold == 0 {
            return Err(Error::InvalidThreshold);
        }

        env.storage()
            .instance()
            .set(&DataKey::MultisigThreshold, &threshold);
        Ok(())
    }

    pub fn propose_operation(
        env: Env,
        operation: ProposalOperation,
        timelock_ledgers: u32,
    ) -> Result<u64, Error> {
        let proposer: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        proposer.require_auth();

        let proposal_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextProposalId)
            .unwrap_or(1u64);
        env.storage()
            .instance()
            .set(&DataKey::NextProposalId, &(proposal_id + 1));

        let current_ledger = env.ledger().sequence();
        let proposal = Proposal {
            id: proposal_id,
            operation,
            proposer,
            created_ledger: current_ledger,
            execution_ledger: current_ledger + timelock_ledgers,
            executed: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);
        let approvals: Vec<Address> = Vec::new(&env);
        env.storage()
            .persistent()
            .set(&DataKey::ProposalApprovals(proposal_id), &approvals);

        Ok(proposal_id)
    }

    pub fn approve_proposal(env: Env, proposal_id: u64) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let proposal: Proposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(Error::ProposalNotFound)?;

        if proposal.executed {
            return Err(Error::ProposalNotFound);
        }

        let mut approvals: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::ProposalApprovals(proposal_id))
            .unwrap_or(Vec::new(&env));

        for approval in approvals.iter() {
            if approval == admin {
                return Ok(());
            }
        }

        approvals.push_back(admin);
        env.storage()
            .persistent()
            .set(&DataKey::ProposalApprovals(proposal_id), &approvals);
        Ok(())
    }

    pub fn execute_proposal(env: Env, proposal_id: u64) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(Error::ProposalNotFound)?;

        if proposal.executed {
            return Err(Error::ProposalNotFound);
        }

        let current_ledger = env.ledger().sequence();
        if current_ledger < proposal.execution_ledger {
            return Err(Error::InvalidThreshold);
        }

        let threshold = Self::get_multisig_threshold(env.clone());
        let approvals: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::ProposalApprovals(proposal_id))
            .unwrap_or(Vec::new(&env));

        if (approvals.len() as u32) < threshold {
            return Err(Error::InsufficientApprovals);
        }

        proposal.executed = true;
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        Ok(())
    }

    pub fn get_proposal(env: Env, proposal_id: u64) -> Option<Proposal> {
        env.storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
    }

    pub fn get_proposal_approvals(env: Env, proposal_id: u64) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::ProposalApprovals(proposal_id))
            .unwrap_or(Vec::new(&env))
    }

    // -----------------------------------------------------------------------
    // Feature 3 – Attestation certificate references on TEE hash entries
    // -----------------------------------------------------------------------

    /// Attach an attestation certificate reference to an approved TEE code hash.
    /// Only the admin may call this. The TEE hash must already be registered.
    /// `valid_until` must be strictly after `valid_from`.
    pub fn attach_cert_ref(
        env: Env,
        code_hash: BytesN<32>,
        issuer: String,
        valid_from: u64,
        valid_until: u64,
        cert_uri: Option<String>,
    ) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        // The TEE hash must already be registered.
        if !env.storage().persistent().has(&DataKey::TeeHash(code_hash.clone())) {
            return Err(Error::TeeHashNotFound);
        }

        // Basic sanity: expiry must be after issuance.
        if valid_until <= valid_from {
            return Err(Error::InvalidThreshold);
        }

        let cert_ref = TeeHashCertRef {
            issuer,
            valid_from,
            valid_until,
            cert_uri,
            code_hash: code_hash.clone(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::TeeHashCertRef(code_hash), &cert_ref);
        Ok(())
    }

    /// Retrieve the certificate reference for a TEE hash, if one has been attached.
    pub fn get_cert_ref(env: Env, code_hash: BytesN<32>) -> Result<TeeHashCertRef, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::TeeHashCertRef(code_hash))
            .ok_or(Error::TeeHashNotFound)
    }

    /// Query a TEE hash together with its certificate reference in one call.
    /// Returns `(is_approved, Option<TeeHashCertRef>)`.
    pub fn get_tee_hash_with_cert(
        env: Env,
        code_hash: BytesN<32>,
    ) -> (bool, Option<TeeHashCertRef>) {
        let approved = env
            .storage()
            .persistent()
            .get(&DataKey::TeeHash(code_hash.clone()))
            .unwrap_or(false);
        let cert_ref = env
            .storage()
            .persistent()
            .get(&DataKey::TeeHashCertRef(code_hash));
        (approved, cert_ref)
    }

    /// Check whether the certificate attached to a TEE hash has expired.
    /// Returns `Ok(false)` if no cert is attached (treat as unexpired).
    /// Returns `Err(CertificateExpired)` if the cert has expired.
    pub fn validate_cert_expiration(env: Env, code_hash: BytesN<32>) -> Result<bool, Error> {
        let cert_ref: TeeHashCertRef = match env
            .storage()
            .persistent()
            .get(&DataKey::TeeHashCertRef(code_hash))
        {
            Some(c) => c,
            None    => return Ok(false), // no cert attached → pass
        };

        let now = env.ledger().timestamp();
        if now > cert_ref.valid_until {
            return Err(Error::CertificateExpired);
        }
        Ok(true)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup() -> (Env, Address, RegistryContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, RegistryContract);
        let client = RegistryContractClient::new(&env, &cid);
        let admin = Address::generate(&env);
        let provenance = Address::generate(&env);
        client.init(&admin, &provenance);
        (env, admin, client)
    }

    fn hash32(env: &Env) -> BytesN<32> {
        BytesN::from_array(env, &[1u8; 32])
    }

    fn hash32_with_value(env: &Env, value: u8) -> BytesN<32> {
        BytesN::from_array(env, &[value; 32])
    }

    // --- #22 / #23 tests ---

    #[test]
    fn test_add_tee_hash_stores_hash() {
        let (env, _admin, client) = setup();
        let h = hash32(&env);
        client.add_tee_hash(&h);
        assert!(client.is_tee_hash_approved(&h));
    }

    #[test]
    fn test_add_tee_hash_multiple_hashes() {
        let (env, _admin, client) = setup();
        let h1 = hash32_with_value(&env, 1);
        let h2 = hash32_with_value(&env, 2);
        let h3 = hash32_with_value(&env, 3);
        client.add_tee_hash(&h1);
        client.add_tee_hash(&h2);
        client.add_tee_hash(&h3);
        assert!(client.is_tee_hash_approved(&h1));
        assert!(client.is_tee_hash_approved(&h2));
        assert!(client.is_tee_hash_approved(&h3));
    }

    #[test]
    fn test_add_tee_hash_no_admin_returns_unauthorized() {
        let env = Env::default();
        let cid = env.register_contract(None, RegistryContract);
        let client = RegistryContractClient::new(&env, &cid);
        let admin = Address::generate(&env);
        let provenance = Address::generate(&env);
        client.init(&admin, &provenance);

        let result = client.try_add_tee_hash(&BytesN::from_array(&env, &[0u8; 32]));
        assert!(result.is_err());
    }

    #[test]
    #[should_panic]
    fn test_add_tee_hash_non_admin_panics() {
        let env = Env::default();
        let cid = env.register_contract(None, RegistryContract);
        let client = RegistryContractClient::new(&env, &cid);
        let admin = Address::generate(&env);
        let provenance = Address::generate(&env);
        client.init(&admin, &provenance);

        client.add_tee_hash(&BytesN::from_array(&env, &[0u8; 32]));
    }

    // --- #21 tests ---

    #[test]
    fn test_add_provider() {
        let (env, _admin, client) = setup();
        let p = BytesN::from_array(&env, &[9u8; 32]);
        client.add_provider(&p);
        assert!(client.is_provider(&p));
    }

    #[test]
    fn test_unauthorized_provider() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, RegistryContract);
        let client = RegistryContractClient::new(&env, &cid);
        // Not initialized — expect panic
        let result = client.try_add_provider(&BytesN::from_array(&env, &[0u8; 32]));
        assert!(result.is_err());
    }

    // --- #163 tests ---

    #[test]
    fn test_get_multisig_threshold_returns_default() {
        let (env, _admin, client) = setup();
        let threshold = client.get_multisig_threshold();
        assert_eq!(threshold, 1);
    }

    #[test]
    fn test_update_multisig_threshold() {
        let (env, _admin, client) = setup();
        client.try_update_multisig_threshold(&2).unwrap().unwrap();
        let threshold = client.get_multisig_threshold();
        assert_eq!(threshold, 2);
    }

    #[test]
    fn test_update_multisig_threshold_invalid() {
        let (env, _admin, client) = setup();
        let result = client.try_update_multisig_threshold(&0);
        assert!(result.is_err());
    }

    #[test]
    fn test_propose_operation() {
        let (env, _admin, client) = setup();
        let h = BytesN::from_array(&env, &[1u8; 32]);
        let operation = ProposalOperation::AddTeeHash(h);
        let proposal_id = client
            .try_propose_operation(&operation, &10u32)
            .unwrap()
            .unwrap();
        assert_eq!(proposal_id, 1);

        let proposal = client.get_proposal(&proposal_id).unwrap();
        assert_eq!(proposal.id, 1);
    }

    #[test]
    fn test_approve_proposal() {
        let (env, admin, client) = setup();
        let h = BytesN::from_array(&env, &[1u8; 32]);
        let operation = ProposalOperation::AddTeeHash(h);
        let proposal_id = client
            .try_propose_operation(&operation, &10u32)
            .unwrap()
            .unwrap();

        client.try_approve_proposal(&proposal_id).unwrap().unwrap();
        let approvals = client.get_proposal_approvals(&proposal_id);
        assert_eq!(approvals.len(), 1);
    }

    #[test]
    fn test_execute_proposal() {
        let (env, _admin, client) = setup();
        let h = BytesN::from_array(&env, &[1u8; 32]);
        let operation = ProposalOperation::AddTeeHash(h);
        let proposal_id = client
            .try_propose_operation(&operation, &0u32)
            .unwrap()
            .unwrap();

        client.try_approve_proposal(&proposal_id).unwrap().unwrap();

        let result = client.try_execute_proposal(&proposal_id).unwrap();
        assert!(result.is_ok());

        let proposal = client.get_proposal(&proposal_id).unwrap();
        assert!(proposal.executed);
    }

    // -----------------------------------------------------------------------
    // Feature 3 – Attestation certificate references on TEE hash entries
    // -----------------------------------------------------------------------

    #[test]
    fn test_attach_and_get_cert_ref() {
        let (env, _admin, client) = setup();
        let h = hash32(&env);
        client.add_tee_hash(&h);

        let issuer      = String::from_str(&env, "ACME CA");
        let valid_from  = 1_000_000u64;
        let valid_until = 9_999_999u64;
        client
            .attach_cert_ref(&h, &issuer, &valid_from, &valid_until, &None)
            .unwrap();

        let cert_ref = client.get_cert_ref(&h).unwrap();
        assert_eq!(cert_ref.issuer, String::from_str(&env, "ACME CA"));
        assert_eq!(cert_ref.valid_from, valid_from);
        assert_eq!(cert_ref.valid_until, valid_until);
        assert!(cert_ref.cert_uri.is_none());
    }

    #[test]
    fn test_attach_cert_ref_with_uri() {
        let (env, _admin, client) = setup();
        let h = hash32(&env);
        client.add_tee_hash(&h);

        let uri = Some(String::from_str(&env, "ipfs://Qm1234567890"));
        client
            .attach_cert_ref(
                &h,
                &String::from_str(&env, "TEE Lab"),
                &1000u64,
                &5000u64,
                &uri,
            )
            .unwrap();

        let cert_ref = client.get_cert_ref(&h).unwrap();
        assert!(cert_ref.cert_uri.is_some());
    }

    #[test]
    fn test_attach_cert_ref_tee_not_registered() {
        let (env, _admin, client) = setup();
        let h = hash32_with_value(&env, 99);
        let err = client
            .try_attach_cert_ref(
                &h,
                &String::from_str(&env, "CA"),
                &1000u64,
                &5000u64,
                &None,
            )
            .unwrap_err()
            .unwrap();
        assert_eq!(err, Error::TeeHashNotFound);
    }

    #[test]
    fn test_attach_cert_ref_invalid_validity_period() {
        let (env, _admin, client) = setup();
        let h = hash32(&env);
        client.add_tee_hash(&h);
        // valid_until == valid_from → InvalidThreshold
        let err = client
            .try_attach_cert_ref(
                &h,
                &String::from_str(&env, "CA"),
                &5000u64,
                &5000u64,
                &None,
            )
            .unwrap_err()
            .unwrap();
        assert_eq!(err, Error::InvalidThreshold);
    }

    #[test]
    fn test_get_tee_hash_with_cert_both_present() {
        let (env, _admin, client) = setup();
        let h = hash32(&env);
        client.add_tee_hash(&h);
        client
            .attach_cert_ref(&h, &String::from_str(&env, "CA"), &1000u64, &9999u64, &None)
            .unwrap();
        let (approved, cert_ref) = client.get_tee_hash_with_cert(&h);
        assert!(approved);
        assert!(cert_ref.is_some());
    }

    #[test]
    fn test_get_tee_hash_with_cert_no_cert() {
        let (env, _admin, client) = setup();
        let h = hash32(&env);
        client.add_tee_hash(&h);
        let (approved, cert_ref) = client.get_tee_hash_with_cert(&h);
        assert!(approved);
        assert!(cert_ref.is_none());
    }

    #[test]
    fn test_validate_cert_expiration_valid() {
        let (env, _admin, client) = setup();
        let h = hash32(&env);
        client.add_tee_hash(&h);
        // Ledger timestamp defaults to 0 in tests; expiry far in the future.
        client
            .attach_cert_ref(&h, &String::from_str(&env, "CA"), &0u64, &99_999_999u64, &None)
            .unwrap();
        let result = client.validate_cert_expiration(&h).unwrap();
        assert!(result);
    }

    #[test]
    fn test_validate_cert_expiration_no_cert_passes() {
        let (env, _admin, client) = setup();
        let h = hash32(&env);
        client.add_tee_hash(&h);
        // No cert attached → Ok(false)
        let result = client.validate_cert_expiration(&h).unwrap();
        assert!(!result);
    }
}
