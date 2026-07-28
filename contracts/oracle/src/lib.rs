#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, contractevent,
    vec, Bytes, BytesN, Env, Symbol, Address, Vec,
};

const REQUEST_TTL_LEDGERS: u32 = 100;
const MINIMUM_STAKE: u128 = 1_000_000_000;
const WITHDRAWAL_COOLDOWN_LEDGERS: u32 = 7200;
const ARCHIVAL_THRESHOLD_LEDGERS: u32 = 1000;
const DEFAULT_REQUEST_TTL_LEDGERS: u32 = 100;
const DEFAULT_EXPIRATION_WARNING_LEDGERS: u32 = 20;

// SLA suspension threshold: providers below this compliance % are auto-suspended
const SLA_SUSPENSION_THRESHOLD: u32 = 70;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotInitialized       = 1,
    UnauthorizedSigner   = 2,
    AlreadyInitialized   = 3,
    RegistryNotConfigured = 4,
    TeeNotVerified       = 5,
    ProviderNotRegistered = 6,
    BatchSizeExceeded    = 7,
    RequestNotFound      = 8,
    Unauthorized         = 9,
    InvalidState         = 10,
    InsufficientStake    = 11,
    NoStake              = 12,
    WithdrawalCooldown   = 13,
    ContractPaused       = 14,
    ProviderSuspended    = 15,
    PricingNotSet        = 16,
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
    Paused,
    RequestTTL,
    ExpirationWarningLedgers,
    ProviderStake(Address),
    ProviderWithdrawalCooldown(Address),
    LastArchivalLedger,
    ArchivedRequest(u64),
    // SLA keys
    ProviderSLA(Address),
    ProviderSuspended(Address),
    // Pricing key
    ProviderPricing(Address),
}

// ---------------------------------------------------------------------------
// Enums
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
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ContentComplexity {
    Simple,
    Moderate,
    Complex,
}

// ---------------------------------------------------------------------------
// Core structs
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug)]
pub struct TTLConfig {
    pub default_ttl: u32,
    pub high_priority_ttl: u32,
    pub low_priority_ttl: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct VerificationRequest {
    pub storage_ref:   Bytes,
    pub manifest_hash: Bytes,
    pub requester:     Address,
    pub state:         RequestState,
    pub priority:      Priority,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct RequestWithId {
    pub id:      u64,
    pub request: VerificationRequest,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct PaginatedRequests {
    pub requests:    Vec<RequestWithId>,
    pub total_count: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct AttestationData {
    pub provider:  Address,
    pub tee_hash:  BytesN<32>,
    pub signature: BytesN<64>,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ProviderStakeInfo {
    pub amount:                    u128,
    pub withdrawal_cooldown_until: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ArchivedRequest {
    pub request:           VerificationRequest,
    pub archived_at_ledger: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct AggregatedRequest {
    pub primary_id:    u64,
    pub member_ids:    Vec<u64>,
    pub manifest_hash: Bytes,
    pub total_fee:     u128,
}

// ---------------------------------------------------------------------------
// SLA structs  (Feature 1)
// ---------------------------------------------------------------------------

/// Target and actual performance metrics for a single provider.
/// All percentage fields are in the range [0, 100].
/// `actual_response_time` is the rolling average in seconds.
/// `actual_uptime` and `actual_success_rate` are percentages (0–100).
#[contracttype]
#[derive(Clone, Debug)]
pub struct ProviderSLA {
    // ── Targets ────────────────────────────────────────────────────────────
    /// Maximum acceptable average response time (seconds).
    pub target_response_time_seconds: u32,
    /// Minimum uptime percentage the provider must maintain.
    pub target_uptime_percentage: u32,
    /// Minimum success rate the provider must maintain.
    pub target_success_rate: u32,

    // ── Actuals ────────────────────────────────────────────────────────────
    /// Rolling average response time (seconds) based on recent verifications.
    pub actual_response_time: u32,
    /// Measured uptime percentage over the tracking window.
    pub actual_uptime: u32,
    /// Measured verification success rate over the tracking window.
    pub actual_success_rate: u32,

    // ── Counters used to compute actuals ───────────────────────────────────
    pub total_requests:    u64,
    pub successful:        u64,
    pub total_response_sum: u64,
}

/// SLA compliance summary returned to callers.
#[contracttype]
#[derive(Clone, Debug)]
pub struct SLACompliance {
    pub response_time_ok:   bool,
    pub uptime_ok:          bool,
    pub success_rate_ok:    bool,
    /// Overall compliance percentage (0–100): fraction of targets met × 100.
    pub compliance_percent: u32,
    pub suspended:          bool,
}

/// Event emitted when an SLA violation is detected.
#[contractevent]
pub struct SLAViolationEvent {
    #[topic]
    pub provider:    Address,
    pub metric:      Symbol,
    pub actual:      u32,
    pub target:      u32,
}

/// Event emitted when a provider is auto-suspended for falling below threshold.
#[contractevent]
pub struct ProviderAutoSuspendedEvent {
    #[topic]
    pub provider:           Address,
    pub compliance_percent: u32,
}

// ---------------------------------------------------------------------------
// Cost estimation structs  (Feature 2)
// ---------------------------------------------------------------------------

/// Per-provider pricing configuration.
/// All amounts are in stroops (1 XLM = 10_000_000 stroops).
#[contracttype]
#[derive(Clone, Debug)]
pub struct ProviderPricing {
    /// Base cost for a standard verification.
    pub base_fee_stroops: u128,
    /// Extra cost added per KB of content (0 to disable).
    pub per_kb_fee_stroops: u128,
}

/// Detailed cost breakdown returned by `estimate_cost`.
#[contracttype]
#[derive(Clone, Debug)]
pub struct CostEstimate {
    pub base_fee:      u128,
    pub size_fee:      u128,
    pub priority_fee:  u128,
    pub complexity_fee: u128,
    pub total:         u128,
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
        env.storage().instance().set(&DataKey::Provenance, &provenance);
        env.storage().instance().set(&DataKey::Admin, &admin);

        let default_config = TTLConfig {
            default_ttl: DEFAULT_REQUEST_TTL_LEDGERS,
            high_priority_ttl: 200,
            low_priority_ttl: 50,
        };
        env.storage().instance().set(&DataKey::RequestTTL, &default_config);
        env.storage().instance().set(
            &DataKey::ExpirationWarningLedgers,
            &DEFAULT_EXPIRATION_WARNING_LEDGERS,
        );
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
        env.storage().instance().get(&DataKey::Paused).unwrap_or(false)
    }

    pub fn deposit_stake(env: Env, provider: Address, amount: u128) -> Result<(), Error> {
        provider.require_auth();
        if amount < MINIMUM_STAKE {
            return Err(Error::InsufficientStake);
        }
        let current: ProviderStakeInfo = env.storage().persistent()
            .get(&DataKey::ProviderStake(provider.clone()))
            .unwrap_or(ProviderStakeInfo { amount: 0, withdrawal_cooldown_until: 0 });
        let stake_info = ProviderStakeInfo {
            amount: current.amount.saturating_add(amount),
            withdrawal_cooldown_until: current.withdrawal_cooldown_until,
        };
        env.storage().persistent().set(&DataKey::ProviderStake(provider.clone()), &stake_info);
        env.events().publish((Symbol::new(&env, "stake_deposited"),), (provider, amount));
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
        let cooldown_until = env.ledger().sequence() + WITHDRAWAL_COOLDOWN_LEDGERS;
        let updated = ProviderStakeInfo {
            amount: stake_info.amount.saturating_sub(amount),
            withdrawal_cooldown_until: cooldown_until,
        };
        env.storage().persistent().set(&DataKey::ProviderStake(provider.clone()), &updated);
        env.storage().persistent().set(
            &DataKey::ProviderWithdrawalCooldown(provider.clone()),
            &(cooldown_until, amount),
        );
        env.events().publish((Symbol::new(&env, "withdrawal_initiated"),), (provider, amount));
        Ok(())
    }

    pub fn complete_withdrawal(env: Env, provider: Address) -> Result<u128, Error> {
        provider.require_auth();
        let (cooldown_until, amount): (u32, u128) = env.storage().persistent()
            .get(&DataKey::ProviderWithdrawalCooldown(provider.clone()))
            .ok_or(Error::NoStake)?;
        if env.ledger().sequence() < cooldown_until {
            return Err(Error::WithdrawalCooldown);
        }
        env.storage().persistent().remove(&DataKey::ProviderWithdrawalCooldown(provider));
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
        let slashed = if stake_info.amount >= amount { amount } else { stake_info.amount };
        let updated = ProviderStakeInfo {
            amount: stake_info.amount.saturating_sub(slashed),
            withdrawal_cooldown_until: stake_info.withdrawal_cooldown_until,
        };
        env.storage().persistent().set(&DataKey::ProviderStake(provider.clone()), &updated);
        env.events().publish((Symbol::new(&env, "stake_slashed"),), (provider, slashed));
        Ok(())
    }

    pub fn submit_request(
        env: Env,
        storage_ref: Bytes,
        manifest_hash: Bytes,
        requester: Address,
        priority: Priority,
    ) -> Result<u64, Error> {
        requester.require_auth();
        if Self::is_paused(env.clone()) {
            return Err(Error::ContractPaused);
        }

        let ttl_config: TTLConfig = env.storage().instance()
            .get(&DataKey::RequestTTL)
            .unwrap_or(TTLConfig {
                default_ttl: DEFAULT_REQUEST_TTL_LEDGERS,
                high_priority_ttl: 200,
                low_priority_ttl: 50,
            });
        let ttl = match priority {
            Priority::High | Priority::Urgent => ttl_config.high_priority_ttl,
            Priority::Low  => ttl_config.low_priority_ttl,
            Priority::Normal => ttl_config.default_ttl,
        };

        let id: u64 = env.storage().instance()
            .get(&DataKey::NextRequestId)
            .unwrap_or(0u64) + 1;
        env.storage().instance().set(&DataKey::NextRequestId, &id);

        let req = VerificationRequest {
            storage_ref,
            manifest_hash,
            requester: requester.clone(),
            state: RequestState::Pending,
            priority,
        };

        env.storage().temporary().set(&DataKey::Request(id), &req);
        env.storage().temporary().extend_ttl(&DataKey::Request(id), ttl, ttl);
        Self::add_request_to_state_index(&env, &RequestState::Pending, id);

        let fee = Self::calculate_priority_fee(&req.priority);
        env.events().publish((Symbol::new(&env, "submitted"),), (id, fee));
        Ok(id)
    }

    pub fn get_request(env: Env, id: u64) -> Option<VerificationRequest> {
        env.storage().temporary().get(&DataKey::Request(id))
    }

    pub fn get_ttl_config(env: Env) -> TTLConfig {
        env.storage().instance()
            .get(&DataKey::RequestTTL)
            .unwrap_or(TTLConfig {
                default_ttl: DEFAULT_REQUEST_TTL_LEDGERS,
                high_priority_ttl: 200,
                low_priority_ttl: 50,
            })
    }

    pub fn update_ttl_config(
        env: Env,
        default_ttl: u32,
        high_priority_ttl: u32,
        low_priority_ttl: u32,
    ) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        if default_ttl == 0 || high_priority_ttl == 0 || low_priority_ttl == 0 {
            return Err(Error::InvalidState);
        }
        env.storage().instance().set(&DataKey::RequestTTL, &TTLConfig {
            default_ttl,
            high_priority_ttl,
            low_priority_ttl,
        });
        Ok(())
    }

    pub fn get_warning_threshold(env: Env) -> u32 {
        env.storage().instance()
            .get(&DataKey::ExpirationWarningLedgers)
            .unwrap_or(DEFAULT_EXPIRATION_WARNING_LEDGERS)
    }

    pub fn update_warning_threshold(env: Env, ledgers: u32) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        if ledgers == 0 {
            return Err(Error::InvalidState);
        }
        env.storage().instance().set(&DataKey::ExpirationWarningLedgers, &ledgers);
        Ok(())
    }

    pub fn check_expiration_warning(env: Env, id: u64) -> bool {
        let threshold = Self::get_warning_threshold(env.clone());
        let ttl = env.storage().temporary().get_ttl(&DataKey::Request(id));
        if ttl <= threshold {
            env.events().publish(
                (Symbol::new(&env, "expiring_soon"),),
                (id, ttl),
            );
            return true;
        }
        false
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
            if let Some(req) = env.storage().temporary()
                .get::<_, VerificationRequest>(&DataKey::Request(i))
            {
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
        archived_count
    }

    pub fn get_archived_request(env: Env, id: u64) -> Option<ArchivedRequest> {
        env.storage().persistent().get(&DataKey::ArchivedRequest(id))
    }

    pub fn get_last_archival_ledger(env: Env) -> u32 {
        env.storage().persistent()
            .get(&DataKey::LastArchivalLedger)
            .unwrap_or(0u32)
    }

    pub fn get_provider_metrics(env: Env, provider: Address) -> Option<ProviderSLA> {
        env.storage().persistent().get(&DataKey::ProviderSLA(provider))
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
        if !approved { return Err(Error::TeeNotVerified); }
        Ok(())
    }

    pub fn verify_attestation(
        env: Env,
        provider: BytesN<32>,
        tee_hash: BytesN<32>,
        payload: Bytes,
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
        if !provider_ok { return Err(Error::UnauthorizedSigner); }
        let tee_ok: bool = env.invoke_contract(
            &registry,
            &Symbol::new(&env, "is_tee_hash_approved"),
            vec![&env, tee_hash.into()],
        );
        if !tee_ok { return Err(Error::TeeNotVerified); }
        env.crypto().ed25519_verify(&provider, &payload, &signature);
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Batch processing
    // -----------------------------------------------------------------------

    pub fn submit_batch_request(
        env: Env,
        requests: Vec<(Bytes, Bytes, Address, Priority)>,
    ) -> Result<Vec<u64>, Error> {
        if requests.len() > 10 {
            return Err(Error::BatchSizeExceeded);
        }
        let mut ids: Vec<u64> = vec![&env];
        for i in 0..requests.len() {
            let (storage_ref, manifest_hash, requester, priority) = requests.get(i).unwrap();
            requester.require_auth();
            let id: u64 = env.storage().instance()
                .get(&DataKey::NextRequestId)
                .unwrap_or(0u64) + 1;
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

    // -----------------------------------------------------------------------
    // Request cancellation
    // -----------------------------------------------------------------------

    pub fn cancel_request(env: Env, id: u64) -> Result<(), Error> {
        let mut req: VerificationRequest = env.storage().temporary()
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

    // -----------------------------------------------------------------------
    // Pagination
    // -----------------------------------------------------------------------

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
        let mut results: Vec<RequestWithId> = vec![&env];
        let mut count = 0u32;
        let limit_val = if limit == 0 { 100 } else { limit.min(100) };
        let start = offset as usize;
        if start < all_ids.len() {
            for i in start..all_ids.len() {
                if count >= limit_val { break; }
                let req_id = all_ids.get(i).unwrap();
                if let Some(req) = env.storage().temporary()
                    .get::<_, VerificationRequest>(&DataKey::Request(req_id))
                {
                    if let Some(ref addr) = requester {
                        if req.requester != *addr { continue; }
                    }
                    results.push_back(RequestWithId { id: req_id, request: req });
                    count += 1;
                }
            }
        }
        PaginatedRequests { requests: results, total_count: all_ids.len() as u32 }
    }

    // -----------------------------------------------------------------------
    // Feature 1 — SLA metrics, compliance, alerts, auto-suspend
    // -----------------------------------------------------------------------

    /// Admin sets or resets SLA targets for a provider.
    pub fn set_provider_sla(
        env: Env,
        provider: Address,
        target_response_time_seconds: u32,
        target_uptime_percentage: u32,
        target_success_rate: u32,
    ) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let existing: ProviderSLA = env.storage().persistent()
            .get(&DataKey::ProviderSLA(provider.clone()))
            .unwrap_or(ProviderSLA {
                target_response_time_seconds: 0,
                target_uptime_percentage: 0,
                target_success_rate: 0,
                actual_response_time: 0,
                actual_uptime: 100,
                actual_success_rate: 100,
                total_requests: 0,
                successful: 0,
                total_response_sum: 0,
            });

        let updated = ProviderSLA {
            target_response_time_seconds,
            target_uptime_percentage,
            target_success_rate,
            ..existing
        };
        env.storage().persistent().set(&DataKey::ProviderSLA(provider), &updated);
        Ok(())
    }

    /// Called after each verification to update actual performance metrics.
    /// `response_time_seconds` is how long the provider took to respond.
    /// `uptime_sample` is 100 if the provider was reachable, 0 if it was down.
    pub fn record_verification(
        env: Env,
        provider: Address,
        success: bool,
        response_time_seconds: u32,
        uptime_sample: u32,
    ) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let mut sla: ProviderSLA = env.storage().persistent()
            .get(&DataKey::ProviderSLA(provider.clone()))
            .ok_or(Error::ProviderNotRegistered)?;

        sla.total_requests += 1;
        if success { sla.successful += 1; }
        sla.total_response_sum += response_time_seconds as u64;

        // Rolling averages
        sla.actual_response_time = (sla.total_response_sum / sla.total_requests) as u32;
        sla.actual_success_rate  = ((sla.successful * 100) / sla.total_requests) as u32;

        // Uptime: exponential moving average (weight = 1 / total_requests, capped at 0.1)
        // For simplicity use a simple running mean capped to [0, 100].
        let n = sla.total_requests;
        sla.actual_uptime = (((sla.actual_uptime as u64).saturating_mul(n - 1)
            + uptime_sample as u64) / n) as u32;

        env.storage().persistent().set(&DataKey::ProviderSLA(provider.clone()), &sla);

        // Emit violation events for each breached target
        if sla.actual_response_time > sla.target_response_time_seconds
            && sla.target_response_time_seconds > 0
        {
            SLAViolationEvent {
                provider: provider.clone(),
                metric: Symbol::new(&env, "response_time"),
                actual: sla.actual_response_time,
                target: sla.target_response_time_seconds,
            }.emit(&env);
        }
        if sla.actual_success_rate < sla.target_success_rate
            && sla.target_success_rate > 0
        {
            SLAViolationEvent {
                provider: provider.clone(),
                metric: Symbol::new(&env, "success_rate"),
                actual: sla.actual_success_rate,
                target: sla.target_success_rate,
            }.emit(&env);
        }
        if sla.actual_uptime < sla.target_uptime_percentage
            && sla.target_uptime_percentage > 0
        {
            SLAViolationEvent {
                provider: provider.clone(),
                metric: Symbol::new(&env, "uptime"),
                actual: sla.actual_uptime,
                target: sla.target_uptime_percentage,
            }.emit(&env);
        }

        // Auto-suspend check
        let compliance = Self::_compliance_percent(&sla);
        if compliance < SLA_SUSPENSION_THRESHOLD {
            env.storage().persistent().set(&DataKey::ProviderSuspended(provider.clone()), &true);
            ProviderAutoSuspendedEvent { provider, compliance_percent: compliance }.emit(&env);
        }

        Ok(())
    }

    /// Returns SLA compliance summary for a provider.
    pub fn get_sla_compliance(env: Env, provider: Address) -> Result<SLACompliance, Error> {
        let sla: ProviderSLA = env.storage().persistent()
            .get(&DataKey::ProviderSLA(provider.clone()))
            .ok_or(Error::ProviderNotRegistered)?;

        let response_time_ok = sla.target_response_time_seconds == 0
            || sla.actual_response_time <= sla.target_response_time_seconds;
        let uptime_ok = sla.target_uptime_percentage == 0
            || sla.actual_uptime >= sla.target_uptime_percentage;
        let success_rate_ok = sla.target_success_rate == 0
            || sla.actual_success_rate >= sla.target_success_rate;

        let suspended: bool = env.storage().persistent()
            .get(&DataKey::ProviderSuspended(provider))
            .unwrap_or(false);

        Ok(SLACompliance {
            response_time_ok,
            uptime_ok,
            success_rate_ok,
            compliance_percent: Self::_compliance_percent(&sla),
            suspended,
        })
    }

    /// Admin can manually reinstate a suspended provider after remediation.
    pub fn reinstate_provider(env: Env, provider: Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        env.storage().persistent().remove(&DataKey::ProviderSuspended(provider));
        Ok(())
    }

    pub fn is_provider_suspended(env: Env, provider: Address) -> bool {
        env.storage().persistent()
            .get(&DataKey::ProviderSuspended(provider))
            .unwrap_or(false)
    }

    // -----------------------------------------------------------------------
    // Feature 2 — Cost estimation with per-provider pricing
    // -----------------------------------------------------------------------

    /// Admin configures pricing for a provider.
    pub fn set_provider_pricing(
        env: Env,
        provider: Address,
        base_fee_stroops: u128,
        per_kb_fee_stroops: u128,
    ) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        env.storage().persistent().set(
            &DataKey::ProviderPricing(provider),
            &ProviderPricing { base_fee_stroops, per_kb_fee_stroops },
        );
        Ok(())
    }

    pub fn get_provider_pricing(env: Env, provider: Address) -> Option<ProviderPricing> {
        env.storage().persistent().get(&DataKey::ProviderPricing(provider))
    }

    /// Estimate the cost of a verification request.
    ///
    /// - `provider`          — the provider that would fulfil the request
    /// - `content_size_bytes` — byte length of the content to be verified
    /// - `priority`          — priority level of the request
    /// - `complexity`        — content-processing complexity hint
    ///
    /// Returns a `CostEstimate` with a per-component breakdown.
    pub fn estimate_cost(
        env: Env,
        provider: Address,
        content_size_bytes: u64,
        priority: Priority,
        complexity: ContentComplexity,
    ) -> Result<CostEstimate, Error> {
        let pricing: ProviderPricing = env.storage().persistent()
            .get(&DataKey::ProviderPricing(provider))
            .ok_or(Error::PricingNotSet)?;

        let base_fee = pricing.base_fee_stroops;

        // Size fee: per-KB charge, rounded up to nearest KB
        let kb = content_size_bytes.saturating_add(1023) / 1024;
        let size_fee: u128 = pricing.per_kb_fee_stroops.saturating_mul(kb as u128);

        // Priority multiplier applied to the base fee
        let priority_fee: u128 = base_fee.saturating_mul(
            match priority {
                Priority::Low    => 0,
                Priority::Normal => 0,
                Priority::High   => 50,   // +50 %
                Priority::Urgent => 150,  // +150 %
            }
        ) / 100;

        // Complexity surcharge on the base fee
        let complexity_fee: u128 = base_fee.saturating_mul(
            match complexity {
                ContentComplexity::Simple   => 0,
                ContentComplexity::Moderate => 25,  // +25 %
                ContentComplexity::Complex  => 75,  // +75 %
            }
        ) / 100;

        let total = base_fee
            .saturating_add(size_fee)
            .saturating_add(priority_fee)
            .saturating_add(complexity_fee);

        Ok(CostEstimate { base_fee, size_fee, priority_fee, complexity_fee, total })
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    fn _compliance_percent(sla: &ProviderSLA) -> u32 {
        let mut met: u32 = 0;
        let mut total: u32 = 0;

        if sla.target_response_time_seconds > 0 {
            total += 1;
            if sla.actual_response_time <= sla.target_response_time_seconds { met += 1; }
        }
        if sla.target_uptime_percentage > 0 {
            total += 1;
            if sla.actual_uptime >= sla.target_uptime_percentage { met += 1; }
        }
        if sla.target_success_rate > 0 {
            total += 1;
            if sla.actual_success_rate >= sla.target_success_rate { met += 1; }
        }

        if total == 0 { return 100; }
        (met * 100) / total
    }

    fn calculate_priority_fee(priority: &Priority) -> u64 {
        match priority {
            Priority::Low    => 100,
            Priority::Normal => 200,
            Priority::High   => 400,
            Priority::Urgent => 800,
        }
    }

    fn add_request_to_state_index(env: &Env, state: &RequestState, id: u64) {
        let mut ids: Vec<u64> = env.storage().persistent()
            .get(&DataKey::RequestsByState(state.clone()))
            .unwrap_or(vec![env]);
        ids.push_back(id);
        env.storage().persistent().set(&DataKey::RequestsByState(state.clone()), &ids);
    }

    fn remove_request_from_state_index(env: &Env, state: &RequestState, id: u64) {
        let ids: Vec<u64> = env.storage().persistent()
            .get(&DataKey::RequestsByState(state.clone()))
            .unwrap_or(vec![env]);
        let mut new_ids: Vec<u64> = vec![env];
        for i in 0..ids.len() {
            if ids.get(i).unwrap() != id {
                new_ids.push_back(ids.get(i).unwrap());
            }
        }
        env.storage().persistent().set(&DataKey::RequestsByState(state.clone()), &new_ids);
    }
}

mod test;
