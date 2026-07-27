#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, vec, Address, Bytes, BytesN, Env, Symbol,
};

const DEFAULT_REQUEST_TTL_LEDGERS: u32 = 100;
const DEFAULT_EXPIRATION_WARNING_LEDGERS: u32 = 10;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotInitialized = 1,
    UnauthorizedSigner = 2,
    AlreadyInitialized = 3,
    RegistryNotConfigured = 4,
    TeeNotVerified = 5,
    ProviderNotRegistered = 6,
    InvalidTTL = 7,
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

#[contracttype]
pub enum DataKey {
    Registry,
    Provenance,
    Admin,
    Provider(Address),
    NextRequestId,
    Request(u64),
    RequestTTL,
    ExpirationWarningLedgers,
    ProviderMetrics(Address),
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RequestState {
    Pending,
    Verified,
    Rejected,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct VerificationRequest {
    pub storage_ref: Bytes,
    pub manifest_hash: Bytes,
    pub requester: Address,
    pub state: RequestState,
    pub expiration_ledger: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TTLConfig {
    pub default_ttl: u32,
    pub high_priority_ttl: u32,
    pub low_priority_ttl: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ProviderMetrics {
    pub total_verifications: u64,
    pub successful_verifications: u64,
    pub failed_verifications: u64,
    pub last_activity: u64,
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct OracleContract;

#[contractimpl]
impl OracleContract {
    pub fn init(
        env: Env,
        registry: Address,
        provenance: Address,
        admin: Address,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Registry, &registry);
        env.storage()
            .instance()
            .set(&DataKey::Provenance, &provenance);
        env.storage().instance().set(&DataKey::Admin, &admin);

        let default_config = TTLConfig {
            default_ttl: DEFAULT_REQUEST_TTL_LEDGERS,
            high_priority_ttl: 200,
            low_priority_ttl: 50,
        };
        env.storage()
            .instance()
            .set(&DataKey::RequestTTL, &default_config);
        env.storage().instance().set(
            &DataKey::ExpirationWarningLedgers,
            &DEFAULT_EXPIRATION_WARNING_LEDGERS,
        );
        Ok(())
    }

    pub fn add_provider(env: Env, provider: Address) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Provider(provider), &true);
        Ok(())
    }

    pub fn remove_provider(env: Env, provider: Address) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        env.storage()
            .persistent()
            .remove(&DataKey::Provider(provider));
        Ok(())
    }

    pub fn is_provider(env: Env, provider: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Provider(provider))
            .unwrap_or(false)
    }

    pub fn update_ttl_config(
        env: Env,
        default_ttl: u32,
        high_priority_ttl: u32,
        low_priority_ttl: u32,
    ) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        if default_ttl == 0 || high_priority_ttl == 0 || low_priority_ttl == 0 {
            return Err(Error::InvalidTTL);
        }

        let config = TTLConfig {
            default_ttl,
            high_priority_ttl,
            low_priority_ttl,
        };
        env.storage().instance().set(&DataKey::RequestTTL, &config);
        Ok(())
    }

    pub fn get_ttl_config(env: Env) -> Result<TTLConfig, Error> {
        env.storage()
            .instance()
            .get(&DataKey::RequestTTL)
            .ok_or(Error::NotInitialized)
    }

    pub fn submit_request(
        env: Env,
        storage_ref: Bytes,
        manifest_hash: Bytes,
        requester: Address,
    ) -> Result<u64, Error> {
        Self::submit_request_with_priority(env, storage_ref, manifest_hash, requester, 1)
    }

    pub fn submit_request_with_priority(
        env: Env,
        storage_ref: Bytes,
        manifest_hash: Bytes,
        requester: Address,
        priority: u32,
    ) -> Result<u64, Error> {
        requester.require_auth();

        let config = Self::get_ttl_config(env.clone())?;
        let ttl = match priority {
            0 => config.low_priority_ttl,
            1 => config.default_ttl,
            2 => config.high_priority_ttl,
            _ => config.default_ttl,
        };

        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextRequestId)
            .unwrap_or(0u64)
            + 1;
        env.storage().instance().set(&DataKey::NextRequestId, &id);

        let current_ledger = env.ledger().sequence();
        let expiration_ledger = current_ledger + ttl;

        let req = VerificationRequest {
            storage_ref,
            manifest_hash,
            requester,
            state: RequestState::Pending,
            expiration_ledger,
        };

        env.storage().temporary().set(&DataKey::Request(id), &req);
        env.storage()
            .temporary()
            .extend_ttl(&DataKey::Request(id), ttl, ttl);

        env.events()
            .publish((Symbol::new(&env, "submitted"),), (id, expiration_ledger));
        Ok(id)
    }

    pub fn get_request(env: Env, id: u64) -> Option<VerificationRequest> {
        env.storage().temporary().get(&DataKey::Request(id))
    }

    pub fn update_warning_threshold(env: Env, warning_ledgers: u32) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        if warning_ledgers == 0 {
            return Err(Error::InvalidTTL);
        }

        env.storage()
            .instance()
            .set(&DataKey::ExpirationWarningLedgers, &warning_ledgers);
        Ok(())
    }

    pub fn get_warning_threshold(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::ExpirationWarningLedgers)
            .unwrap_or(DEFAULT_EXPIRATION_WARNING_LEDGERS)
    }

    pub fn check_expiration_warning(env: Env, request_id: u64) -> Result<(), Error> {
        let req = Self::get_request(env.clone(), request_id).ok_or(Error::NotInitialized)?;
        let current_ledger = env.ledger().sequence();
        let warning_threshold = Self::get_warning_threshold(env.clone());

        let expiration_ledger = req.expiration_ledger as i32;
        let warning_start = expiration_ledger - warning_threshold as i32;

        if current_ledger as i32 <= expiration_ledger && current_ledger as i32 >= warning_start {
            env.events().publish(
                (Symbol::new(&env, "RequestExpiring"),),
                (request_id, req.expiration_ledger),
            );
        }

        Ok(())
    }

    pub fn get_provider_metrics(env: Env, provider: Address) -> Option<ProviderMetrics> {
        env.storage()
            .persistent()
            .get(&DataKey::ProviderMetrics(provider))
    }

    pub fn record_verification_success(env: Env, provider: Address) -> Result<(), Error> {
        let mut metrics =
            Self::get_provider_metrics(env.clone(), provider.clone()).unwrap_or(ProviderMetrics {
                total_verifications: 0,
                successful_verifications: 0,
                failed_verifications: 0,
                last_activity: 0,
            });

        metrics.total_verifications += 1;
        metrics.successful_verifications += 1;
        metrics.last_activity = env.ledger().sequence() as u64;

        env.storage()
            .persistent()
            .set(&DataKey::ProviderMetrics(provider), &metrics);
        Ok(())
    }

    pub fn record_verification_failure(env: Env, provider: Address) -> Result<(), Error> {
        let mut metrics =
            Self::get_provider_metrics(env.clone(), provider.clone()).unwrap_or(ProviderMetrics {
                total_verifications: 0,
                successful_verifications: 0,
                failed_verifications: 0,
                last_activity: 0,
            });

        metrics.total_verifications += 1;
        metrics.failed_verifications += 1;
        metrics.last_activity = env.ledger().sequence() as u64;

        env.storage()
            .persistent()
            .set(&DataKey::ProviderMetrics(provider), &metrics);
        Ok(())
    }

    pub fn verify_tee_hash(env: Env, tee_hash: BytesN<32>) -> Result<(), Error> {
        let registry: Address = env
            .storage()
            .instance()
            .get(&DataKey::Registry)
            .ok_or(Error::RegistryNotConfigured)?;

        let approved: bool = env.invoke_contract(
            &registry,
            &Symbol::new(&env, "is_tee_hash_approved"),
            vec![&env, tee_hash.into()],
        );

        if !approved {
            return Err(Error::TeeNotVerified);
        }
        Ok(())
    }

    pub fn verify_attestation(
        env: Env,
        provider: BytesN<32>,
        tee_hash: BytesN<32>,
        payload: Bytes,
        signature: BytesN<64>,
    ) -> Result<(), Error> {
        let registry: Address = env
            .storage()
            .instance()
            .get(&DataKey::Registry)
            .ok_or(Error::RegistryNotConfigured)?;

        let provider_ok: bool = env.invoke_contract(
            &registry,
            &Symbol::new(&env, "is_provider"),
            vec![&env, provider.clone().into()],
        );
        if !provider_ok {
            return Err(Error::UnauthorizedSigner);
        }

        let tee_ok: bool = env.invoke_contract(
            &registry,
            &Symbol::new(&env, "is_tee_hash_approved"),
            vec![&env, tee_hash.into()],
        );
        if !tee_ok {
            return Err(Error::TeeNotVerified);
        }

        env.crypto().ed25519_verify(&provider, &payload, &signature);

        Ok(())
    }
}

mod test;
