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
    ManifestRequests(Bytes),
    AggregatedGroup(Bytes),
    AggregationPrimary(u64),
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

#[contracttype]
#[derive(Clone, Debug)]
pub struct AggregatedRequest {
    pub primary_id:      u64,
    pub member_ids:      vec::Vec<u64>,
    pub manifest_hash:   Bytes,
    pub total_fee:       u128,
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

    pub fn calculate_dynamic_fee(env: Env, pending_requests: u64) -> u128 {
        let base_fee = Self::get_base_fee(env.clone());
        if pending_requests == 0 {
            return base_fee;
        }

        let load_factor = 1 + (pending_requests as u128 / 10);
        base_fee.saturating_mul(load_factor)
    }

    pub fn distribute_fee_to_provider(
        env: Env,
        provider: Address,
        amount: u128,
    ) -> Result<(), Error> {
        let current_balance: u128 = env.storage().persistent()
            .get(&DataKey::ProviderBalance(provider.clone()))
            .unwrap_or(0u128);

        let new_balance = current_balance.saturating_add(amount);
        env.storage().persistent()
            .set(&DataKey::ProviderBalance(provider.clone()), &new_balance);

        env.events().publish(
            (Symbol::new(&env, "fee_distributed"),),
            (provider, amount),
        );
        Ok(())
    }

    pub fn get_provider_balance(env: Env, provider: Address) -> u128 {
        env.storage().persistent()
            .get(&DataKey::ProviderBalance(provider))
            .unwrap_or(0u128)
    }

    pub fn withdraw_provider_earnings(env: Env, provider: Address) -> Result<u128, Error> {
        provider.require_auth();

        let balance = Self::get_provider_balance(env.clone(), provider.clone());
        if balance == 0 {
            return Ok(0);
        }

        env.storage().persistent()
            .set(&DataKey::ProviderBalance(provider.clone()), &0u128);

        env.events().publish(
            (Symbol::new(&env, "earnings_withdrawn"),),
            (provider, balance),
        );
        Ok(balance)
    }

    pub fn refund_request_fee(
        env: Env,
        requester: Address,
        amount: u128,
    ) -> Result<(), Error> {
        requester.require_auth();

        let current_escrow: u128 = env.storage().instance()
            .get(&DataKey::FeeEscrow)
            .unwrap_or(0u128);

        if current_escrow < amount {
            return Err(Error::ProviderNotRegistered);
        }

        let new_escrow = current_escrow.saturating_sub(amount);
        env.storage().instance().set(&DataKey::FeeEscrow, &new_escrow);

        env.events().publish(
            (Symbol::new(&env, "fee_refunded"),),
            (requester, amount),
        );
        Ok(())
    }

    pub fn get_escrow_balance(env: Env) -> u128 {
        env.storage().instance()
            .get(&DataKey::FeeEscrow)
            .unwrap_or(0u128)
    }

    pub fn check_and_aggregate_request(
        env: Env,
        manifest_hash: Bytes,
        request_id: u64,
        fee: u128,
    ) -> Result<Option<u64>, Error> {
        let key = DataKey::ManifestRequests(manifest_hash.clone());

        if let Some(primary_id) = env.storage().persistent().get::<_, Option<u64>>(&key) {
            Self::add_to_aggregation_group(
                env.clone(),
                primary_id,
                request_id,
                fee,
            )?;
            env.events().publish(
                (Symbol::new(&env, "request_aggregated"),),
                (request_id, primary_id),
            );
            return Ok(Some(primary_id));
        }

        env.storage().persistent()
            .set(&key, &request_id);
        env.storage().persistent()
            .set(&DataKey::AggregationPrimary(request_id), &true);
        Ok(None)
    }

    fn add_to_aggregation_group(
        env: Env,
        primary_id: u64,
        member_id: u64,
        fee: u128,
    ) -> Result<(), Error> {
        let req = env.storage().temporary()
            .get::<_, Option<VerificationRequest>>(&DataKey::Request(primary_id))
            .flatten()
            .ok_or(Error::RequestNotFound)?;

        let group_key = DataKey::AggregatedGroup(req.manifest_hash.clone());

        let mut group: AggregatedRequest = env.storage().persistent()
            .get(&group_key)
            .unwrap_or(AggregatedRequest {
                primary_id,
                member_ids: vec::Vec::new(&env),
                manifest_hash: req.manifest_hash,
                total_fee: 0,
            });

        group.member_ids.push_back(member_id);
        group.total_fee = group.total_fee.saturating_add(fee);

        env.storage().persistent().set(&group_key, &group);
        Ok(())
    }

    pub fn get_aggregated_group(env: Env, manifest_hash: Bytes) -> Option<AggregatedRequest> {
        env.storage().persistent()
            .get(&DataKey::AggregatedGroup(manifest_hash))
    }

    pub fn distribute_aggregated_cost(
        env: Env,
        manifest_hash: Bytes,
        verification_cost: u128,
    ) -> Result<(), Error> {
        let group = Self::get_aggregated_group(env.clone(), manifest_hash)
            .ok_or(Error::RequestNotFound)?;

        if group.member_ids.is_empty() {
            return Err(Error::RequestNotFound);
        }

        let cost_per_request = verification_cost / (group.member_ids.len() as u128);
        let remainder = verification_cost % (group.member_ids.len() as u128);

        for (idx, _member_id) in group.member_ids.iter().enumerate() {
            let cost = cost_per_request + if idx == 0 { remainder } else { 0 };
            let escrow: u128 = env.storage().instance()
                .get(&DataKey::FeeEscrow)
                .unwrap_or(0u128);
            let new_escrow = escrow.saturating_sub(cost);
            env.storage().instance().set(&DataKey::FeeEscrow, &new_escrow);
        }

        env.events().publish(
            (Symbol::new(&env, "aggregated_cost_distributed"),),
            group.member_ids.len(),
        );
        Ok(())
    }

    pub fn is_primary_request(env: Env, request_id: u64) -> bool {
        env.storage().persistent()
            .get(&DataKey::AggregationPrimary(request_id))
            .unwrap_or(false)
    }
}

mod test;
