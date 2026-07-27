#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    vec, Bytes, BytesN, Env, Symbol, Address,
};

const REQUEST_TTL_LEDGERS: u32 = 100;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotInitialized        = 1,
    UnauthorizedSigner    = 2,
    AlreadyInitialized    = 3,
    RegistryNotConfigured = 4,
    TeeNotVerified        = 5,
    ProviderNotRegistered = 6,
    RequestNotFound       = 7,
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
    AttestationData(u64),
    BaseFee,
    FeeEscrow,
    ProviderBalance(Address),
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
    pub storage_ref:   Bytes,
    pub manifest_hash: Bytes,
    pub requester:     Address,
    pub state:         RequestState,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct AttestationData {
    pub provider:   Address,
    pub tee_hash:   BytesN<32>,
    pub signature:  BytesN<64>,
    pub timestamp:  u64,
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct OracleContract;

#[contractimpl]
impl OracleContract {
    pub fn init(
        env:        Env,
        registry:   Address,
        provenance: Address,
        admin:      Address,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Registry,   &registry);
        env.storage().instance().set(&DataKey::Provenance, &provenance);
        env.storage().instance().set(&DataKey::Admin,      &admin);
        Ok(())
    }

    pub fn add_provider(env: Env, provider: Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        env.storage().persistent().set(&DataKey::Provider(provider), &true);
        Ok(())
    }

    pub fn remove_provider(env: Env, provider: Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        env.storage().persistent().remove(&DataKey::Provider(provider));
        Ok(())
    }

    pub fn is_provider(env: Env, provider: Address) -> bool {
        env.storage().persistent()
            .get(&DataKey::Provider(provider))
            .unwrap_or(false)
    }

    pub fn submit_request(
        env:           Env,
        storage_ref:   Bytes,
        manifest_hash: Bytes,
        requester:     Address,
    ) -> u64 {
        requester.require_auth();

        let id: u64 = env.storage().instance()
            .get(&DataKey::NextRequestId)
            .unwrap_or(0u64)
            + 1;
        env.storage().instance().set(&DataKey::NextRequestId, &id);

        let req = VerificationRequest {
            storage_ref,
            manifest_hash,
            requester,
            state: RequestState::Pending,
        };

        env.storage().temporary().set(&DataKey::Request(id), &req);
        env.storage().temporary().extend_ttl(
            &DataKey::Request(id),
            REQUEST_TTL_LEDGERS,
            REQUEST_TTL_LEDGERS,
        );

        env.events().publish((Symbol::new(&env, "submitted"),), id);
        id
    }

    pub fn get_request(env: Env, id: u64) -> Option<VerificationRequest> {
        env.storage().temporary().get(&DataKey::Request(id))
    }

    pub fn verify_tee_hash(env: Env, tee_hash: BytesN<32>) -> Result<(), Error> {
        let registry: Address = env.storage().instance()
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
        env:       Env,
        provider:  BytesN<32>,
        tee_hash:  BytesN<32>,
        payload:   Bytes,
        signature: BytesN<64>,
    ) -> Result<(), Error> {
        let registry: Address = env.storage().instance()
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

    pub fn resubmit_request(
        env:           Env,
        id:            u64,
        storage_ref:   Bytes,
        manifest_hash: Bytes,
    ) -> Result<u64, Error> {
        let req = env.storage().temporary()
            .get(&DataKey::Request(id))
            .ok_or(Error::RequestNotFound)?;

        req.requester.require_auth();

        let updated_req = VerificationRequest {
            storage_ref,
            manifest_hash,
            requester: req.requester.clone(),
            state: RequestState::Pending,
        };

        env.storage().temporary().set(&DataKey::Request(id), &updated_req);
        env.storage().temporary().extend_ttl(
            &DataKey::Request(id),
            REQUEST_TTL_LEDGERS,
            REQUEST_TTL_LEDGERS,
        );

        env.events().publish((Symbol::new(&env, "resubmitted"),), id);
        Ok(id)
    }

    pub fn store_attestation(
        env:       Env,
        request_id: u64,
        provider:  Address,
        tee_hash:  BytesN<32>,
        signature: BytesN<64>,
    ) -> Result<(), Error> {
        let attestation = AttestationData {
            provider,
            tee_hash,
            signature,
            timestamp: env.ledger().timestamp(),
        };

        env.storage().persistent()
            .set(&DataKey::AttestationData(request_id), &attestation);
        Ok(())
    }

    pub fn get_attestation(env: Env, request_id: u64) -> Option<AttestationData> {
        env.storage().persistent()
            .get(&DataKey::AttestationData(request_id))
    }

    pub fn set_base_fee(env: Env, fee: u128) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        env.storage().instance().set(&DataKey::BaseFee, &fee);
        Ok(())
    }

    pub fn get_base_fee(env: Env) -> u128 {
        env.storage().instance()
            .get(&DataKey::BaseFee)
            .unwrap_or(0u128)
    }
}

mod test;
