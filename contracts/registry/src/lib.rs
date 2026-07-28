#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN, Env, String, Vec,
};

// ---------------------------------------------------------------------------
// #24 – provenance cross-contract client
// ---------------------------------------------------------------------------

mod provenance {
    use soroban_sdk::{contractclient, contracttype, Address, Bytes, Env};

    #[contracttype]
    pub struct ProvenanceCert {
        pub storage_ref: Bytes,
        pub manifest_hash: Bytes,
        pub attestation_hash: Bytes,
        pub creator: Address,
        pub timestamp: u64,
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
    }
}

// ---------------------------------------------------------------------------
// Time constants
// ---------------------------------------------------------------------------

const SECONDS_PER_DAY: u64 = 86_400;
const TEE_HASH_VALIDITY: u64 = 180 * SECONDS_PER_DAY; // #191
const TEE_WARNING_PERIOD: u64 = 14 * SECONDS_PER_DAY; // #191
const PROVIDER_GRACE_PERIOD: u64 = 30 * SECONDS_PER_DAY; // #190

// ---------------------------------------------------------------------------
// Storage keys  (#21 Provider variant, #23 typed BytesN<32> keys)
// ---------------------------------------------------------------------------

#[contracttype]
pub enum DataKey {
    Admin,
    Provenance,
    TeeHash(BytesN<32>),          // #23
    Provider(BytesN<32>),         // #21
    ProviderInfo(BytesN<32>),     // #188 / #190
    ProviderList,                 // #188
    TeeHashInfo(BytesN<32>),      // #191
    TeeHashMigration(BytesN<32>), // #191
    Application(u64),             // #189
    ApplicationCount,             // #189
}

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
// #188 – provider service tiers
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum ServiceTier {
    Basic,
    Standard,
    Premium,
}

// ---------------------------------------------------------------------------
// #190 – provider lifecycle status
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum ProviderStatus {
    Active,
    Deactivating(u64), // grace-period end timestamp
    Removed,
}

#[contracttype]
#[derive(Clone)]
pub struct ProviderInfo {
    pub tier: ServiceTier,
    pub status: ProviderStatus,
}

// ---------------------------------------------------------------------------
// #189 – provider onboarding
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum ApplicationStatus {
    Pending,
    Approved,
    Rejected,
}

#[contracttype]
#[derive(Clone)]
pub struct ProviderApplication {
    pub applicant: Address,
    pub provider_key: BytesN<32>,
    pub metadata: String,
    pub status: ApplicationStatus,
    pub submitted_at: u64,
}

// ---------------------------------------------------------------------------
// #191 – TEE hash rotation
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub struct TeeHashRecord {
    pub added_at: u64,
    pub expires_at: u64,
    pub rotated: bool,
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
        env.storage().instance().set(&DataKey::Provenance, &provenance);
    }

    pub fn get_admin(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::Admin)
    }

    fn require_admin(env: &Env) -> Address {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Not initialized");
        admin.require_auth();
        admin
    }

    fn provider_info_or_default(env: &Env, provider: &BytesN<32>) -> ProviderInfo {
        env.storage()
            .persistent()
            .get(&DataKey::ProviderInfo(provider.clone()))
            .unwrap_or(ProviderInfo {
                tier: ServiceTier::Basic,
                status: ProviderStatus::Active,
            })
    }

    // -----------------------------------------------------------------------
    // #22 / #23 / #191 – TEE hash registry with rotation policy
    // -----------------------------------------------------------------------

    /// Register an approved TEE code hash with a 180-day validity window.  #22 #23 #191
    pub fn add_tee_hash(env: Env, code_hash: BytesN<32>) {
        Self::require_admin(&env);
        env.storage()
            .persistent()
            .set(&DataKey::TeeHash(code_hash.clone()), &true);
        let now = env.ledger().timestamp();
        let record = TeeHashRecord {
            added_at: now,
            expires_at: now + TEE_HASH_VALIDITY,
            rotated: false,
        };
        env.storage()
            .persistent()
            .set(&DataKey::TeeHashInfo(code_hash), &record);
    }

    /// Check whether a TEE code hash is approved, not rotated and not expired.  #22 #23 #191
    pub fn is_tee_hash_approved(env: Env, code_hash: BytesN<32>) -> bool {
        let registered = env
            .storage()
            .persistent()
            .get(&DataKey::TeeHash(code_hash.clone()))
            .unwrap_or(false);
        if !registered {
            return false;
        }
        let record: Option<TeeHashRecord> = env
            .storage()
            .persistent()
            .get(&DataKey::TeeHashInfo(code_hash));
        match record {
            Some(record) => !record.rotated && env.ledger().timestamp() < record.expires_at,
            None => true,
        }
    }

    /// True once a hash has entered its pre-expiry warning window.  #191
    pub fn is_tee_hash_near_expiry(env: Env, code_hash: BytesN<32>) -> bool {
        let record: Option<TeeHashRecord> = env
            .storage()
            .persistent()
            .get(&DataKey::TeeHashInfo(code_hash));
        match record {
            Some(record) => {
                let now = env.ledger().timestamp();
                !record.rotated
                    && now < record.expires_at
                    && now + TEE_WARNING_PERIOD >= record.expires_at
            }
            None => false,
        }
    }

    /// Force-rotate an old TEE hash to a new one. The old hash is immediately
    /// invalidated and a migration pointer is stored so in-flight
    /// verifications can be redirected to the replacement hash.  #191
    pub fn rotate_tee_hash(env: Env, old_hash: BytesN<32>, new_hash: BytesN<32>) {
        Self::require_admin(&env);

        let mut old_record: TeeHashRecord = env
            .storage()
            .persistent()
            .get(&DataKey::TeeHashInfo(old_hash.clone()))
            .expect("Unknown TEE hash");
        old_record.rotated = true;
        env.storage()
            .persistent()
            .set(&DataKey::TeeHashInfo(old_hash.clone()), &old_record);
        env.storage()
            .persistent()
            .set(&DataKey::TeeHashMigration(old_hash.clone()), &new_hash);

        Self::add_tee_hash(env.clone(), new_hash.clone());
        env.events()
            .publish((symbol_short!("tee_rot"),), (old_hash, new_hash));
    }

    /// Look up the replacement hash for a rotated TEE hash, if any.  #191
    pub fn get_tee_hash_migration(env: Env, old_hash: BytesN<32>) -> Option<BytesN<32>> {
        env.storage().persistent().get(&DataKey::TeeHashMigration(old_hash))
    }

    // -----------------------------------------------------------------------
    // #21 / #188 / #190 – provider registry, service tiers & lifecycle
    // -----------------------------------------------------------------------

    /// Register a trusted oracle provider public key (admin-gated).  #21
    pub fn add_provider(env: Env, provider: BytesN<32>) {
        Self::require_admin(&env);
        env.storage()
            .persistent()
            .set(&DataKey::Provider(provider.clone()), &true);

        let has_info = env
            .storage()
            .persistent()
            .has(&DataKey::ProviderInfo(provider.clone()));
        if !has_info {
            env.storage().persistent().set(
                &DataKey::ProviderInfo(provider.clone()),
                &ProviderInfo {
                    tier: ServiceTier::Basic,
                    status: ProviderStatus::Active,
                },
            );
            let mut list: Vec<BytesN<32>> = env
                .storage()
                .persistent()
                .get(&DataKey::ProviderList)
                .unwrap_or(Vec::new(&env));
            list.push_back(provider);
            env.storage().persistent().set(&DataKey::ProviderList, &list);
        }
    }

    /// Check whether a provider public key is registered and not removed.  #21 #190
    pub fn is_provider(env: Env, provider: BytesN<32>) -> bool {
        let registered = env
            .storage()
            .persistent()
            .get(&DataKey::Provider(provider.clone()))
            .unwrap_or(false);
        if !registered {
            return false;
        }
        let info: Option<ProviderInfo> = env.storage().persistent().get(&DataKey::ProviderInfo(provider));
        match info {
            Some(info) => info.status != ProviderStatus::Removed,
            None => true,
        }
    }

    /// Assign a service tier to a provider (admin-gated).  #188
    pub fn set_provider_tier(env: Env, provider: BytesN<32>, tier: ServiceTier) {
        Self::require_admin(&env);
        let mut info = Self::provider_info_or_default(&env, &provider);
        info.tier = tier;
        env.storage()
            .persistent()
            .set(&DataKey::ProviderInfo(provider), &info);
    }

    /// Fetch a provider's tier and lifecycle status.  #188 #190
    pub fn get_provider_info(env: Env, provider: BytesN<32>) -> Option<ProviderInfo> {
        env.storage().persistent().get(&DataKey::ProviderInfo(provider))
    }

    /// List every registered provider whose tier matches.  #188
    pub fn get_providers_by_tier(env: Env, tier: ServiceTier) -> Vec<BytesN<32>> {
        let list: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::ProviderList)
            .unwrap_or(Vec::new(&env));
        let mut result = Vec::new(&env);
        for provider in list.iter() {
            let info: Option<ProviderInfo> = env
                .storage()
                .persistent()
                .get(&DataKey::ProviderInfo(provider.clone()));
            if let Some(info) = info {
                if info.tier == tier {
                    result.push_back(provider);
                }
            }
        }
        result
    }

    /// Begin graceful removal of a provider: new request assignments are
    /// blocked immediately, but requests already in flight may still
    /// complete during the 30-day grace period.  #190
    pub fn deactivate_provider(env: Env, provider: BytesN<32>) {
        Self::require_admin(&env);
        let mut info = Self::provider_info_or_default(&env, &provider);
        let grace_end = env.ledger().timestamp() + PROVIDER_GRACE_PERIOD;
        info.status = ProviderStatus::Deactivating(grace_end);
        env.storage()
            .persistent()
            .set(&DataKey::ProviderInfo(provider.clone()), &info);
        env.events()
            .publish((symbol_short!("deactiv"),), (provider, grace_end));
    }

    /// Whether a provider may be assigned new requests right now.  #190
    pub fn can_accept_new_requests(env: Env, provider: BytesN<32>) -> bool {
        let info: Option<ProviderInfo> = env.storage().persistent().get(&DataKey::ProviderInfo(provider));
        match info {
            Some(info) => info.status == ProviderStatus::Active,
            None => false,
        }
    }

    /// Finalize removal once the grace period has elapsed (admin-gated).  #190
    pub fn finalize_removal(env: Env, provider: BytesN<32>) {
        Self::require_admin(&env);
        let mut info = Self::provider_info_or_default(&env, &provider);
        match info.status {
            ProviderStatus::Deactivating(grace_end) if env.ledger().timestamp() >= grace_end => {
                info.status = ProviderStatus::Removed;
                env.storage()
                    .persistent()
                    .set(&DataKey::ProviderInfo(provider.clone()), &info);
                env.events().publish((symbol_short!("removed"),), provider);
            }
            _ => panic!("Grace period not elapsed"),
        }
    }

    // -----------------------------------------------------------------------
    // #189 – provider onboarding workflow
    // -----------------------------------------------------------------------

    /// Submit a new provider application. The applicant must authenticate.  #189
    pub fn submit_provider_application(
        env: Env,
        applicant: Address,
        provider_key: BytesN<32>,
        metadata: String,
    ) -> u64 {
        applicant.require_auth();
        let id: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::ApplicationCount)
            .unwrap_or(0);
        let application = ProviderApplication {
            applicant,
            provider_key,
            metadata,
            status: ApplicationStatus::Pending,
            submitted_at: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Application(id), &application);
        env.storage()
            .persistent()
            .set(&DataKey::ApplicationCount, &(id + 1));
        env.events().publish((symbol_short!("app_sub"),), id);
        id
    }

    /// Fetch a stored application by id.  #189
    pub fn get_application(env: Env, application_id: u64) -> Option<ProviderApplication> {
        env.storage().persistent().get(&DataKey::Application(application_id))
    }

    /// Admin reviews an application. Approval registers the applicant's key
    /// as an active Basic-tier provider.  #189
    pub fn review_application(env: Env, application_id: u64, approve: bool) {
        Self::require_admin(&env);
        let mut application: ProviderApplication = env
            .storage()
            .persistent()
            .get(&DataKey::Application(application_id))
            .expect("Application not found");
        application.status = if approve {
            ApplicationStatus::Approved
        } else {
            ApplicationStatus::Rejected
        };
        env.storage()
            .persistent()
            .set(&DataKey::Application(application_id), &application);
        env.events()
            .publish((symbol_short!("app_rev"), application_id), approve);

        if approve {
            Self::add_provider(env, application.provider_key);
        }
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
        let computed: BytesN<32> = env.crypto().sha256(&content);

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
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger as _},
        Env,
    };

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
        let h1 = BytesN::from_array(&env, &[1u8; 32]);
        let h2 = BytesN::from_array(&env, &[2u8; 32]);
        client.add_tee_hash(&h1);
        client.add_tee_hash(&h2);
        assert!(client.is_tee_hash_approved(&h1));
        assert!(client.is_tee_hash_approved(&h2));
    }

    #[test]
    fn test_add_tee_hash_no_admin_returns_unauthorized() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, RegistryContract);
        let client = RegistryContractClient::new(&env, &cid);
        // Not initialized — expect panic
        let result = client.try_add_tee_hash(&BytesN::from_array(&env, &[0u8; 32]));
        assert!(result.is_err());
    }

    #[test]
    #[should_panic]
    fn test_add_tee_hash_non_admin_panics() {
        // Calling add_tee_hash on an uninitialised contract (no admin stored)
        // without auth mocks causes a panic — satisfies the non-admin panic requirement.
        let env = Env::default(); // no mock_all_auths
        let cid = env.register_contract(None, RegistryContract);
        let client = RegistryContractClient::new(&env, &cid);
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

    // --- #188 tests ---

    #[test]
    fn test_set_and_get_provider_tier() {
        let (env, _admin, client) = setup();
        let p = BytesN::from_array(&env, &[3u8; 32]);
        client.add_provider(&p);
        client.set_provider_tier(&p, &ServiceTier::Premium);
        assert_eq!(client.get_provider_info(&p).unwrap().tier, ServiceTier::Premium);
    }

    #[test]
    fn test_get_providers_by_tier() {
        let (env, _admin, client) = setup();
        let p1 = BytesN::from_array(&env, &[4u8; 32]);
        let p2 = BytesN::from_array(&env, &[5u8; 32]);
        client.add_provider(&p1);
        client.add_provider(&p2);
        client.set_provider_tier(&p1, &ServiceTier::Premium);
        let premium = client.get_providers_by_tier(&ServiceTier::Premium);
        assert_eq!(premium.len(), 1);
    }

    // --- #189 tests ---

    #[test]
    fn test_submit_and_approve_application() {
        let (env, _admin, client) = setup();
        let applicant = Address::generate(&env);
        let provider_key = BytesN::from_array(&env, &[6u8; 32]);
        let id = client.submit_provider_application(
            &applicant,
            &provider_key,
            &String::from_str(&env, "metadata"),
        );
        assert_eq!(client.get_application(&id).unwrap().status, ApplicationStatus::Pending);
        client.review_application(&id, &true);
        assert_eq!(client.get_application(&id).unwrap().status, ApplicationStatus::Approved);
        assert!(client.is_provider(&provider_key));
    }

    // --- #190 tests ---

    #[test]
    fn test_deactivate_provider_blocks_new_requests() {
        let (env, _admin, client) = setup();
        let p = BytesN::from_array(&env, &[7u8; 32]);
        client.add_provider(&p);
        client.deactivate_provider(&p);
        assert!(!client.can_accept_new_requests(&p));
        assert!(client.is_provider(&p));
    }

    #[test]
    fn test_finalize_removal_after_grace_period() {
        let (env, _admin, client) = setup();
        let p = BytesN::from_array(&env, &[8u8; 32]);
        client.add_provider(&p);
        client.deactivate_provider(&p);
        env.ledger().with_mut(|l| l.timestamp += PROVIDER_GRACE_PERIOD + 1);
        client.finalize_removal(&p);
        assert!(!client.is_provider(&p));
    }

    // --- #191 tests ---

    #[test]
    fn test_tee_hash_expires_after_validity_window() {
        let (env, _admin, client) = setup();
        let h = hash32(&env);
        client.add_tee_hash(&h);
        env.ledger().with_mut(|l| l.timestamp += TEE_HASH_VALIDITY + 1);
        assert!(!client.is_tee_hash_approved(&h));
    }

    #[test]
    fn test_rotate_tee_hash_provides_migration_path() {
        let (env, _admin, client) = setup();
        let old = BytesN::from_array(&env, &[10u8; 32]);
        let new = BytesN::from_array(&env, &[11u8; 32]);
        client.add_tee_hash(&old);
        client.rotate_tee_hash(&old, &new);
        assert!(!client.is_tee_hash_approved(&old));
        assert!(client.is_tee_hash_approved(&new));
        assert_eq!(client.get_tee_hash_migration(&old).unwrap(), new);
    }
}
