#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, contractevent,
    vec, Bytes, BytesN, Env, Symbol, Address,
};

const REQUEST_TTL_LEDGERS: u32 = 100;
const MINIMUM_STAKE: u128 = 1_000_000_000; // 1 billion stroops (10 XLM)
const WITHDRAWAL_COOLDOWN_LEDGERS: u32 = 7200; // ~1 hour
const ARCHIVAL_THRESHOLD_LEDGERS: u32 = 1000; // Archive after 1000 ledgers

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
    BatchSizeExceeded     = 7,
    RequestNotFound       = 8,
    Unauthorized          = 9,
    InvalidState          = 10,
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
    RequestsByState(RequestState),
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
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Priority {
    Low,
    Normal,
    High,
    Urgent,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct VerificationRequest {
    pub storage_ref: Bytes,
    pub manifest_hash: Bytes,
    pub requester:     Address,
    pub state:         RequestState,
    pub priority:      Priority,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct RequestWithId {
    pub id: u64,
    pub request: VerificationRequest,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct PaginatedRequests {
    pub requests: Vec<RequestWithId>,
    pub total_count: u32,
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

#[contracttype]
#[derive(Clone, Debug)]
pub struct ProviderStakeInfo {
    pub amount: u128,
    pub withdrawal_cooldown_until: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ArchivedRequest {
    pub request: VerificationRequest,
    pub archived_at_ledger: u32,
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

    pub fn pause(env: Env) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        env.storage().instance().set(&DataKey::Paused, &true);
        env.events().publish((Symbol::new(&env, "pause"),), admin.clone());
        Ok(())
    }

    pub fn unpause(env: Env) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        env.storage().instance().remove(&DataKey::Paused);
        env.events().publish((Symbol::new(&env, "unpause"),), admin.clone());
        Ok(())
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage().instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    pub fn deposit_stake(env: Env, provider: Address, amount: u128) -> Result<(), Error> {
        provider.require_auth();

        if amount < MINIMUM_STAKE {
            return Err(Error::InsufficientStake);
        }

        let current_stake: u128 = env.storage().persistent()
            .get(&DataKey::ProviderStake(provider.clone()))
            .unwrap_or(0u128);

        let new_stake = current_stake.saturating_add(amount);

        let stake_info = ProviderStakeInfo {
            amount: new_stake,
            withdrawal_cooldown_until: 0,
        };

        env.storage().persistent().set(&DataKey::ProviderStake(provider.clone()), &stake_info);
        env.events().publish((Symbol::new(&env, "stake_deposited"),), (provider.clone(), amount));

        Ok(())
    }

    pub fn initiate_withdrawal(env: Env, provider: Address, amount: u128) -> Result<(), Error> {
        provider.require_auth();

        let stake_info: ProviderStakeInfo = env.storage().persistent()
            .get(&DataKey::ProviderStake(provider.clone()))
            .ok_or(Error::NoStake)?;

        if stake_info.amount < amount {
            return Err(Error::InsufficientStake);
        }

        let current_ledger = env.ledger().sequence();
        let cooldown_until = current_ledger + WITHDRAWAL_COOLDOWN_LEDGERS;

        let updated_stake = ProviderStakeInfo {
            amount: stake_info.amount.saturating_sub(amount),
            withdrawal_cooldown_until: cooldown_until,
        };

        env.storage().persistent().set(&DataKey::ProviderStake(provider.clone()), &updated_stake);
        env.storage().persistent().set(&DataKey::ProviderWithdrawalCooldown(provider.clone()), &(cooldown_until, amount));
        env.events().publish((Symbol::new(&env, "withdrawal_initiated"),), (provider.clone(), amount));

        Ok(())
    }

    pub fn complete_withdrawal(env: Env, provider: Address) -> Result<u128, Error> {
        provider.require_auth();

        let (cooldown_until, amount): (u32, u128) = env.storage().persistent()
            .get(&DataKey::ProviderWithdrawalCooldown(provider.clone()))
            .ok_or(Error::NoStake)?;

        let current_ledger = env.ledger().sequence();
        if current_ledger < cooldown_until {
            return Err(Error::WithdrawalCooldown);
        }

        env.storage().persistent().remove(&DataKey::ProviderWithdrawalCooldown(provider.clone()));

        Ok(amount)
    }

    pub fn get_provider_stake(env: Env, provider: Address) -> u128 {
        env.storage().persistent()
            .get(&DataKey::ProviderStake(provider))
            .map(|info: ProviderStakeInfo| info.amount)
            .unwrap_or(0u128)
    }

    pub fn slash_stake(env: Env, provider: Address, amount: u128) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let stake_info: ProviderStakeInfo = env.storage().persistent()
            .get(&DataKey::ProviderStake(provider.clone()))
            .ok_or(Error::NoStake)?;

        let slashed_amount = if stake_info.amount >= amount {
            amount
        } else {
            stake_info.amount
        };

        let updated_stake = ProviderStakeInfo {
            amount: stake_info.amount.saturating_sub(slashed_amount),
            withdrawal_cooldown_until: stake_info.withdrawal_cooldown_until,
        };

        env.storage().persistent().set(&DataKey::ProviderStake(provider.clone()), &updated_stake);
        env.events().publish((Symbol::new(&env, "stake_slashed"),), (provider.clone(), slashed_amount));

        Ok(())
    }

    pub fn submit_request(
        env: Env,
        storage_ref: Bytes,
        manifest_hash: Bytes,
        requester:     Address,
        priority:      Priority,
    ) -> u64 {
        requester.require_auth();

        if Self::is_paused(env.clone()) {
            return Err(Error::ContractPaused);
        }

        let id: u64 = env.storage().instance()
            .get(&DataKey::NextRequestId)
            .unwrap_or(0u64)
            + 1;
        env.storage().instance().set(&DataKey::NextRequestId, &id);

        let current_ledger = env.ledger().sequence();
        let expiration_ledger = current_ledger + ttl;

        let req = VerificationRequest {
            storage_ref,
            manifest_hash,
            requester: requester.clone(),
            state: RequestState::Pending,
            priority,
        };

        env.storage().temporary().set(&DataKey::Request(id), &req);
        env.storage()
            .temporary()
            .extend_ttl(&DataKey::Request(id), ttl, ttl);

        Self::add_request_to_state_index(&env, &RequestState::Pending, id);

        let fee = Self::calculate_priority_fee(&priority);
        env.events().publish((Symbol::new(&env, "submitted"),), (id, fee));
        id
    }

    pub fn get_request(env: Env, id: u64) -> Option<VerificationRequest> {
        env.storage().temporary().get(&DataKey::Request(id))
    }

    pub fn archive_old_requests(env: Env) -> u32 {
        let current_ledger = env.ledger().sequence();
        let last_archival: u32 = env.storage().persistent()
            .get(&DataKey::LastArchivalLedger)
            .unwrap_or(0u32);

        if current_ledger < last_archival + ARCHIVAL_THRESHOLD_LEDGERS {
            return 0;
        }

        let mut archived_count = 0u32;
        let next_id: u64 = env.storage().instance()
            .get(&DataKey::NextRequestId)
            .unwrap_or(0u64);

        for i in 1..=next_id {
            if let Some(req) = env.storage().temporary().get::<_, VerificationRequest>(&DataKey::Request(i)) {
                let archived = ArchivedRequest {
                    request: req,
                    archived_at_ledger: current_ledger,
                };
                env.storage().persistent().set(&DataKey::ArchivedRequest(i), &archived);
                env.storage().temporary().remove(&DataKey::Request(i));
                env.events().publish((Symbol::new(&env, "archived"),), i);
                archived_count += 1;
            }
        }

        env.storage().persistent().set(&DataKey::LastArchivalLedger, &current_ledger);
        archived_count as u32
    }

    pub fn get_archived_request(env: Env, id: u64) -> Option<ArchivedRequest> {
        env.storage().persistent().get(&DataKey::ArchivedRequest(id))
    }

    pub fn get_last_archival_ledger(env: Env) -> u32 {
        env.storage().persistent()
            .get(&DataKey::LastArchivalLedger)
            .unwrap_or(0u32)
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

    // Issue #156: Batch Processing
    pub fn submit_batch_request(
        env:      Env,
        requests: Vec<(Bytes, Bytes, Address, Priority)>,
    ) -> Result<Vec<u64>, Error> {
        if requests.len() > 10 {
            return Err(Error::BatchSizeExceeded);
        }

        let mut ids = vec![&env];

        for i in 0..requests.len() {
            let (storage_ref, manifest_hash, requester, priority) = requests.get(i).unwrap();

            requester.require_auth();

            let id: u64 = env.storage().instance()
                .get(&DataKey::NextRequestId)
                .unwrap_or(0u64)
                + 1;
            env.storage().instance().set(&DataKey::NextRequestId, &id);

            let req = VerificationRequest {
                storage_ref: storage_ref.clone(),
                manifest_hash: manifest_hash.clone(),
                requester: requester.clone(),
                state: RequestState::Pending,
                priority: priority.clone(),
            };

            env.storage().temporary().set(&DataKey::Request(id), &req);
            env.storage().temporary().extend_ttl(
                &DataKey::Request(id),
                REQUEST_TTL_LEDGERS,
                REQUEST_TTL_LEDGERS,
            );

            Self::add_request_to_state_index(&env, &RequestState::Pending, id);
            ids.push_back(id);
        }

        env.events().publish((Symbol::new(&env, "batch_submitted"),), ids.clone());
        Ok(ids)
    }

    // Issue #157: Request Cancellation
    pub fn cancel_request(env: Env, id: u64) -> Result<(), Error> {
        let mut req = env.storage().temporary()
            .get(&DataKey::Request(id))
            .ok_or(Error::RequestNotFound)?;

        req.requester.require_auth();

        if req.state != RequestState::Pending {
            return Err(Error::InvalidState);
        }

        Self::remove_request_from_state_index(&env, &req.state, id);
        req.state = RequestState::Cancelled;
        Self::add_request_to_state_index(&env, &RequestState::Cancelled, id);

        env.storage().temporary().set(&DataKey::Request(id), &req);
        env.events().publish((Symbol::new(&env, "cancelled"),), id);

        Ok(())
    }

    // Issue #159: Request Status Query Pagination
    pub fn get_requests_by_state(
        env: Env,
        state: RequestState,
        offset: u32,
        limit: u32,
        requester: Option<Address>,
    ) -> PaginatedRequests {
        let all_ids: Vec<u64> = env.storage().persistent()
            .get(&DataKey::RequestsByState(state.clone()))
            .unwrap_or(vec![&env]);

        let mut results = vec![&env];
        let mut count = 0u32;
        let limit_val = if limit == 0 { 100 } else { limit.min(100) };
        let start = offset as usize;

        if start >= all_ids.len() {
            return PaginatedRequests {
                requests: results,
                total_count: all_ids.len() as u32,
            };
        }

        for i in start..all_ids.len() {
            if count >= limit_val {
                break;
            }

            let req_id = all_ids.get(i).unwrap();
            if let Some(req) = env.storage().temporary().get::<_, VerificationRequest>(&DataKey::Request(req_id)) {
                if let Some(ref addr) = requester {
                    if req.requester != *addr {
                        continue;
                    }
                }
                results.push_back(RequestWithId {
                    id: req_id,
                    request: req,
                });
                count += 1;
            }
        }

        PaginatedRequests {
            requests: results,
            total_count: all_ids.len() as u32,
        }
    }

    // Helper: Calculate fee based on priority
    fn calculate_priority_fee(_priority: &Priority) -> u64 {
        match _priority {
            Priority::Low => 100,
            Priority::Normal => 200,
            Priority::High => 400,
            Priority::Urgent => 800,
        }
    }

    // Helper: Add request ID to state index
    fn add_request_to_state_index(env: &Env, state: &RequestState, id: u64) {
        let mut ids: Vec<u64> = env.storage().persistent()
            .get(&DataKey::RequestsByState(state.clone()))
            .unwrap_or(vec![env]);
        ids.push_back(id);
        env.storage().persistent().set(&DataKey::RequestsByState(state.clone()), &ids);
    }

    // Helper: Remove request ID from state index
    fn remove_request_from_state_index(env: &Env, state: &RequestState, id: u64) {
        let mut ids: Vec<u64> = env.storage().persistent()
            .get(&DataKey::RequestsByState(state.clone()))
            .unwrap_or(vec![env]);

        let mut new_ids = vec![env];
        for i in 0..ids.len() {
            if ids.get(i).unwrap() != id {
                new_ids.push_back(ids.get(i).unwrap());
            }
        }
        env.storage().persistent().set(&DataKey::RequestsByState(state.clone()), &new_ids);
    }
}

mod test;
