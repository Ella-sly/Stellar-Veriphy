#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    vec, Bytes, BytesN, Env, Symbol, Address, Vec,
};

const MINIMUM_STAKE: u128 = 1_000_000_000; // 1 billion stroops (10 XLM)
const WITHDRAWAL_COOLDOWN_LEDGERS: u32 = 7200; // ~1 hour
const ARCHIVAL_THRESHOLD_LEDGERS: u32 = 1000; // Archive after 1000 ledgers
const DEFAULT_REQUEST_TTL_LEDGERS: u32 = 100;
const DEFAULT_EXPIRATION_WARNING_LEDGERS: u32 = 10;
// Load balancing: max consecutive failures before a provider is skipped
const MAX_RECENT_FAILURES: u32 = 5;
// Load balancing: how many ledgers to consider a provider "recently failed"
const FAILURE_COOLDOWN_LEDGERS: u32 = 500;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotInitialized            = 1,
    UnauthorizedSigner        = 2,
    AlreadyInitialized        = 3,
    RegistryNotConfigured     = 4,
    TeeNotVerified            = 5,
    ProviderNotRegistered     = 6,
    BatchSizeExceeded         = 7,
    RequestNotFound           = 8,
    Unauthorized              = 9,
    InvalidState              = 10,
    InsufficientStake         = 11,
    NoStake                   = 12,
    WithdrawalCooldown        = 13,
    ContractPaused            = 14,
    NoAvailableProvider       = 15,
    DisputeNotFound           = 16,
    DisputeAlreadyResolved    = 17,
    InvalidTTL                = 18,
    InvalidThreshold          = 19,
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

#[contracttype]
pub enum DataKey {
    Registry,
    Provenance,
    Admin,
    Paused,
    Provider(Address),
    ProviderList,
    ProviderStake(Address),
    ProviderWithdrawalCooldown(Address),
    ProviderMetrics(Address),
    ProviderLastFailureLedger(Address),
    RoundRobinIndex,
    NextRequestId,
    Request(u64),
    RequestsByState(RequestState),
    ArchivedRequest(u64),
    LastArchivalLedger,
    RequestTTL,
    ExpirationWarningLedgers,
    NextDisputeId,
    Dispute(u64),
    DisputesByProvider(Address),
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
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DisputeState {
    Open,
    Resolved,
    Dismissed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DisputeResolution {
    ProviderFault,
    RequesterFault,
    Inconclusive,
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
    pub request:            VerificationRequest,
    pub archived_at_ledger: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TTLConfig {
    pub default_ttl:      u32,
    pub high_priority_ttl: u32,
    pub low_priority_ttl:  u32,
}

/// Tracks verification performance metrics for a provider.
/// Used by the weighted/round-robin selection algorithm.
#[contracttype]
#[derive(Clone, Debug)]
pub struct ProviderMetrics {
    pub total_verifications:      u64,
    pub successful_verifications: u64,
    pub failed_verifications:     u64,
    /// Ledger sequence of the last recorded activity.
    pub last_activity:            u64,
}

/// Dispute record filed against a provider or about a verification result.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Dispute {
    pub id:               u64,
    pub request_id:       u64,
    pub provider:         Address,
    pub requester:        Address,
    pub reason:           Bytes,
    pub state:            DisputeState,
    pub resolution:       Option<DisputeResolution>,
    pub filed_at_ledger:  u32,
    pub resolved_at_ledger: Option<u32>,
    /// Reputation penalty applied (in basis points, e.g. 500 = 5%).
    pub reputation_penalty: u32,
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct OracleContract;

#[contractimpl]
impl OracleContract {
    // -----------------------------------------------------------------------
    // Initialisation
    // -----------------------------------------------------------------------

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

        let default_config = TTLConfig {
            default_ttl:       DEFAULT_REQUEST_TTL_LEDGERS,
            high_priority_ttl: 200,
            low_priority_ttl:  50,
        };
        env.storage().instance().set(&DataKey::RequestTTL, &default_config);
        env.storage().instance().set(
            &DataKey::ExpirationWarningLedgers,
            &DEFAULT_EXPIRATION_WARNING_LEDGERS,
        );
        Ok(())
    }

    // -----------------------------------------------------------------------
    // TTL & expiration config
    // -----------------------------------------------------------------------

    pub fn update_ttl_config(
        env:    Env,
        config: TTLConfig,
    ) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        if config.default_ttl == 0 || config.high_priority_ttl == 0 || config.low_priority_ttl == 0 {
            return Err(Error::InvalidTTL);
        }
        env.storage().instance().set(&DataKey::RequestTTL, &config);
        Ok(())
    }

    pub fn get_ttl_config(env: Env) -> Result<TTLConfig, Error> {
        env.storage().instance()
            .get(&DataKey::RequestTTL)
            .ok_or(Error::NotInitialized)
    }

    pub fn update_warning_threshold(env: Env, ledgers: u32) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        if ledgers == 0 {
            return Err(Error::InvalidThreshold);
        }
        env.storage().instance().set(&DataKey::ExpirationWarningLedgers, &ledgers);
        Ok(())
    }

    pub fn get_warning_threshold(env: Env) -> u32 {
        env.storage().instance()
            .get(&DataKey::ExpirationWarningLedgers)
            .unwrap_or(DEFAULT_EXPIRATION_WARNING_LEDGERS)
    }

    pub fn check_expiration_warning(env: Env, id: u64) -> bool {
        let req = match env.storage().temporary().get::<_, VerificationRequest>(&DataKey::Request(id)) {
            Some(r) => r,
            None => return false,
        };
        if req.state != RequestState::Pending {
            return false;
        }
        let ttl = env.storage().temporary().get_ttl(&DataKey::Request(id));
        let threshold: u32 = env.storage().instance()
            .get(&DataKey::ExpirationWarningLedgers)
            .unwrap_or(DEFAULT_EXPIRATION_WARNING_LEDGERS);
        let near = ttl <= threshold;
        if near {
            env.events().publish((Symbol::new(&env, "expiration_warning"),), id);
        }
        near
    }

    // -----------------------------------------------------------------------
    // Pause / unpause
    // -----------------------------------------------------------------------

    pub fn pause(env: Env) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &true);
        env.events().publish((Symbol::new(&env, "pause"),), admin);
        Ok(())
    }

    pub fn unpause(env: Env) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        env.storage().instance().remove(&DataKey::Paused);
        env.events().publish((Symbol::new(&env, "unpause"),), admin);
        Ok(())
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage().instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    // -----------------------------------------------------------------------
    // Provider registry
    // -----------------------------------------------------------------------

    pub fn add_provider(env: Env, provider: Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        env.storage().persistent().set(&DataKey::Provider(provider.clone()), &true);

        // Maintain a global provider list for round-robin iteration
        let mut list: Vec<Address> = env.storage().persistent()
            .get(&DataKey::ProviderList)
            .unwrap_or(vec![&env]);
        // Only add if not already present
        let mut found = false;
        for i in 0..list.len() {
            if list.get(i).unwrap() == provider {
                found = true;
                break;
            }
        }
        if !found {
            list.push_back(provider.clone());
            env.storage().persistent().set(&DataKey::ProviderList, &list);
        }
        env.events().publish((Symbol::new(&env, "provider_added"),), provider);
        Ok(())
    }

    pub fn remove_provider(env: Env, provider: Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        env.storage().persistent().remove(&DataKey::Provider(provider.clone()));

        // Remove from provider list
        let list: Vec<Address> = env.storage().persistent()
            .get(&DataKey::ProviderList)
            .unwrap_or(vec![&env]);
        let mut new_list: Vec<Address> = vec![&env];
        for i in 0..list.len() {
            let p = list.get(i).unwrap();
            if p != provider {
                new_list.push_back(p);
            }
        }
        env.storage().persistent().set(&DataKey::ProviderList, &new_list);
        env.events().publish((Symbol::new(&env, "provider_removed"),), provider);
        Ok(())
    }

    pub fn is_provider(env: Env, provider: Address) -> bool {
        env.storage().persistent()
            .get(&DataKey::Provider(provider))
            .unwrap_or(false)
    }

    // -----------------------------------------------------------------------
    // Staking
    // -----------------------------------------------------------------------

    pub fn deposit_stake(env: Env, provider: Address, amount: u128) -> Result<(), Error> {
        provider.require_auth();
        if amount < MINIMUM_STAKE {
            return Err(Error::InsufficientStake);
        }
        let current: u128 = env.storage().persistent()
            .get(&DataKey::ProviderStake(provider.clone()))
            .map(|s: ProviderStakeInfo| s.amount)
            .unwrap_or(0u128);
        let stake_info = ProviderStakeInfo {
            amount: current.saturating_add(amount),
            withdrawal_cooldown_until: 0,
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
        let current_ledger = env.ledger().sequence();
        let cooldown_until = current_ledger + WITHDRAWAL_COOLDOWN_LEDGERS;
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
            .map(|s: ProviderStakeInfo| s.amount)
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
        let slash = if stake_info.amount >= amount { amount } else { stake_info.amount };
        let updated = ProviderStakeInfo {
            amount: stake_info.amount.saturating_sub(slash),
            withdrawal_cooldown_until: stake_info.withdrawal_cooldown_until,
        };
        env.storage().persistent().set(&DataKey::ProviderStake(provider.clone()), &updated);
        env.events().publish((Symbol::new(&env, "stake_slashed"),), (provider, slash));
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Provider metrics (used by load-balancing algorithm)
    // -----------------------------------------------------------------------

    /// Record a successful verification by a provider.
    pub fn record_verification_success(env: Env, provider: Address) {
        let mut m: ProviderMetrics = env.storage().persistent()
            .get(&DataKey::ProviderMetrics(provider.clone()))
            .unwrap_or(ProviderMetrics {
                total_verifications:      0,
                successful_verifications: 0,
                failed_verifications:     0,
                last_activity:            0,
            });
        m.total_verifications      = m.total_verifications.saturating_add(1);
        m.successful_verifications = m.successful_verifications.saturating_add(1);
        m.last_activity            = env.ledger().timestamp();
        env.storage().persistent().set(&DataKey::ProviderMetrics(provider), &m);
    }

    /// Record a failed verification by a provider.
    pub fn record_verification_failure(env: Env, provider: Address) {
        let mut m: ProviderMetrics = env.storage().persistent()
            .get(&DataKey::ProviderMetrics(provider.clone()))
            .unwrap_or(ProviderMetrics {
                total_verifications:      0,
                successful_verifications: 0,
                failed_verifications:     0,
                last_activity:            0,
            });
        m.total_verifications  = m.total_verifications.saturating_add(1);
        m.failed_verifications = m.failed_verifications.saturating_add(1);
        m.last_activity        = env.ledger().timestamp();
        // Record ledger of last failure for cooldown check
        env.storage().persistent().set(
            &DataKey::ProviderLastFailureLedger(provider.clone()),
            &env.ledger().sequence(),
        );
        env.storage().persistent().set(&DataKey::ProviderMetrics(provider), &m);
    }

    /// Retrieve metrics for a provider.  Returns None if never recorded.
    pub fn get_provider_metrics(env: Env, provider: Address) -> Option<ProviderMetrics> {
        env.storage().persistent().get(&DataKey::ProviderMetrics(provider))
    }

    /// Compute a reputation score 0-100 for a provider.
    /// Score = (successful / total) * 100, clamped to 100.
    /// Returns 100 if no verifications recorded (new providers start trusted).
    pub fn get_reputation_score(env: Env, provider: Address) -> u32 {
        let m: ProviderMetrics = match env.storage().persistent()
            .get(&DataKey::ProviderMetrics(provider))
        {
            Some(m) => m,
            None    => return 100,
        };
        if m.total_verifications == 0 {
            return 100;
        }
        ((m.successful_verifications * 100) / m.total_verifications) as u32
    }

    // -----------------------------------------------------------------------
    // Load balancing — weighted round-robin provider selection
    // -----------------------------------------------------------------------

    /// Returns the address of the next available provider using a weighted
    /// round-robin algorithm.
    ///
    /// Selection criteria applied in order:
    ///   1. Provider must be registered (`add_provider` was called).
    ///   2. Provider must not be in a recent-failure cooldown window.
    ///   3. Among eligible providers the one with the highest reputation
    ///      score is preferred (ties broken by round-robin index).
    ///
    /// The round-robin index advances after every call so no single provider
    /// monopolises requests when scores are equal.
    pub fn get_next_available_provider(env: Env) -> Result<Address, Error> {
        let list: Vec<Address> = env.storage().persistent()
            .get(&DataKey::ProviderList)
            .unwrap_or(vec![&env]);

        if list.len() == 0 {
            return Err(Error::NoAvailableProvider);
        }

        let current_ledger = env.ledger().sequence();

        // Collect eligible providers and their reputation scores
        let mut best_provider: Option<Address> = None;
        let mut best_score: u32 = 0;

        // Start iteration from the saved round-robin index to break ties fairly
        let rr_start: u32 = env.storage().instance()
            .get(&DataKey::RoundRobinIndex)
            .unwrap_or(0u32);

        let len = list.len() as u32;

        for offset in 0..len {
            let idx = ((rr_start + offset) % len) as u32;
            let provider = list.get(idx).unwrap();

            // Skip if not registered
            if !env.storage().persistent()
                .get(&DataKey::Provider(provider.clone()))
                .unwrap_or(false)
            {
                continue;
            }

            // Skip if inside failure cooldown
            let last_failure: u32 = env.storage().persistent()
                .get(&DataKey::ProviderLastFailureLedger(provider.clone()))
                .unwrap_or(0u32);
            if last_failure > 0 && current_ledger < last_failure + FAILURE_COOLDOWN_LEDGERS {
                // Only skip if they have had recent consecutive failures
                let m: ProviderMetrics = env.storage().persistent()
                    .get(&DataKey::ProviderMetrics(provider.clone()))
                    .unwrap_or(ProviderMetrics {
                        total_verifications: 0,
                        successful_verifications: 0,
                        failed_verifications: 0,
                        last_activity: 0,
                    });
                if m.failed_verifications >= MAX_RECENT_FAILURES as u64 {
                    continue;
                }
            }

            let score = Self::get_reputation_score(env.clone(), provider.clone());
            if best_provider.is_none() || score > best_score {
                best_score    = score;
                best_provider = Some(provider);
            }
        }

        let chosen = best_provider.ok_or(Error::NoAvailableProvider)?;

        // Advance round-robin index
        let next_rr = (rr_start + 1) % len;
        env.storage().instance().set(&DataKey::RoundRobinIndex, &next_rr);

        env.events().publish(
            (Symbol::new(&env, "provider_selected"),),
            (chosen.clone(), best_score),
        );
        Ok(chosen)
    }

    /// Return all registered providers with their current capacity info.
    pub fn get_provider_list(env: Env) -> Vec<Address> {
        env.storage().persistent()
            .get(&DataKey::ProviderList)
            .unwrap_or(vec![&env])
    }

    // -----------------------------------------------------------------------
    // Dispute resolution
    // -----------------------------------------------------------------------

    /// File a dispute against a provider for a specific verification request.
    ///
    /// The requester must be the original requester of the request.
    /// Emits a `dispute_filed` event.
    pub fn file_dispute(
        env:        Env,
        request_id: u64,
        provider:   Address,
        reason:     Bytes,
    ) -> Result<u64, Error> {
        // Fetch request — accept both live and archived
        let req: VerificationRequest = env.storage().temporary()
            .get(&DataKey::Request(request_id))
            .ok_or(Error::RequestNotFound)?;

        req.requester.require_auth();

        // Assign dispute ID
        let dispute_id: u64 = env.storage().instance()
            .get(&DataKey::NextDisputeId)
            .unwrap_or(0u64)
            + 1;
        env.storage().instance().set(&DataKey::NextDisputeId, &dispute_id);

        let dispute = Dispute {
            id:                  dispute_id,
            request_id,
            provider:            provider.clone(),
            requester:           req.requester.clone(),
            reason,
            state:               DisputeState::Open,
            resolution:          None,
            filed_at_ledger:     env.ledger().sequence(),
            resolved_at_ledger:  None,
            reputation_penalty:  0,
        };

        env.storage().persistent().set(&DataKey::Dispute(dispute_id), &dispute);

        // Index by provider
        let mut by_provider: Vec<u64> = env.storage().persistent()
            .get(&DataKey::DisputesByProvider(provider.clone()))
            .unwrap_or(vec![&env]);
        by_provider.push_back(dispute_id);
        env.storage().persistent().set(&DataKey::DisputesByProvider(provider.clone()), &by_provider);

        env.events().publish(
            (Symbol::new(&env, "dispute_filed"),),
            (dispute_id, request_id, provider, req.requester),
        );
        Ok(dispute_id)
    }

    /// Admin resolves an open dispute.
    ///
    /// `resolution`        — outcome of the review.
    /// `reputation_penalty` — basis points to deduct from provider reputation
    ///                        (only applied when resolution == ProviderFault).
    /// `slash_amount`      — amount of stake to slash (0 = no slash).
    pub fn resolve_dispute(
        env:               Env,
        dispute_id:        u64,
        resolution:        DisputeResolution,
        reputation_penalty: u32,
        slash_amount:      u128,
    ) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let mut dispute: Dispute = env.storage().persistent()
            .get(&DataKey::Dispute(dispute_id))
            .ok_or(Error::DisputeNotFound)?;

        if dispute.state != DisputeState::Open {
            return Err(Error::DisputeAlreadyResolved);
        }

        dispute.state              = DisputeState::Resolved;
        dispute.resolution         = Some(resolution.clone());
        dispute.resolved_at_ledger = Some(env.ledger().sequence());
        dispute.reputation_penalty = reputation_penalty;

        // Apply penalties when the provider is at fault
        if resolution == DisputeResolution::ProviderFault {
            // Record the penalty as a synthetic failure in provider metrics
            if reputation_penalty > 0 {
                let mut m: ProviderMetrics = env.storage().persistent()
                    .get(&DataKey::ProviderMetrics(dispute.provider.clone()))
                    .unwrap_or(ProviderMetrics {
                        total_verifications:      0,
                        successful_verifications: 0,
                        failed_verifications:     0,
                        last_activity:            0,
                    });
                // Add synthetic failures proportional to the penalty
                let penalty_failures = (reputation_penalty / 10) as u64;
                m.failed_verifications = m.failed_verifications.saturating_add(penalty_failures);
                m.total_verifications  = m.total_verifications.saturating_add(penalty_failures);
                env.storage().persistent().set(
                    &DataKey::ProviderMetrics(dispute.provider.clone()),
                    &m,
                );
            }

            // Slash stake if requested
            if slash_amount > 0 {
                let stake_info: ProviderStakeInfo = env.storage().persistent()
                    .get(&DataKey::ProviderStake(dispute.provider.clone()))
                    .unwrap_or(ProviderStakeInfo { amount: 0, withdrawal_cooldown_until: 0 });
                let slash = if stake_info.amount >= slash_amount { slash_amount } else { stake_info.amount };
                let updated = ProviderStakeInfo {
                    amount: stake_info.amount.saturating_sub(slash),
                    withdrawal_cooldown_until: stake_info.withdrawal_cooldown_until,
                };
                env.storage().persistent().set(
                    &DataKey::ProviderStake(dispute.provider.clone()),
                    &updated,
                );
                env.events().publish(
                    (Symbol::new(&env, "stake_slashed"),),
                    (dispute.provider.clone(), slash),
                );
            }
        }

        env.storage().persistent().set(&DataKey::Dispute(dispute_id), &dispute);

        env.events().publish(
            (Symbol::new(&env, "dispute_resolved"),),
            (dispute_id, dispute.provider, resolution, reputation_penalty),
        );
        Ok(())
    }

    /// Dismiss an open dispute (admin only, e.g. frivolous claim).
    pub fn dismiss_dispute(env: Env, dispute_id: u64) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let mut dispute: Dispute = env.storage().persistent()
            .get(&DataKey::Dispute(dispute_id))
            .ok_or(Error::DisputeNotFound)?;

        if dispute.state != DisputeState::Open {
            return Err(Error::DisputeAlreadyResolved);
        }

        dispute.state              = DisputeState::Dismissed;
        dispute.resolved_at_ledger = Some(env.ledger().sequence());
        env.storage().persistent().set(&DataKey::Dispute(dispute_id), &dispute);

        env.events().publish(
            (Symbol::new(&env, "dispute_dismissed"),),
            (dispute_id, dispute.provider, dispute.requester),
        );
        Ok(())
    }

    /// Get a single dispute by ID.
    pub fn get_dispute(env: Env, dispute_id: u64) -> Option<Dispute> {
        env.storage().persistent().get(&DataKey::Dispute(dispute_id))
    }

    /// Get all dispute IDs filed against a provider.
    pub fn get_disputes_by_provider(env: Env, provider: Address) -> Vec<u64> {
        env.storage().persistent()
            .get(&DataKey::DisputesByProvider(provider))
            .unwrap_or(vec![&env])
    }

    // -----------------------------------------------------------------------
    // Request lifecycle
    // -----------------------------------------------------------------------

    pub fn submit_request(
        env:           Env,
        storage_ref:   Bytes,
        manifest_hash: Bytes,
        requester:     Address,
        priority:      Priority,
    ) -> Result<u64, Error> {
        requester.require_auth();

        if Self::is_paused(env.clone()) {
            return Err(Error::ContractPaused);
        }

        let ttl_config: TTLConfig = env.storage().instance()
            .get(&DataKey::RequestTTL)
            .unwrap_or(TTLConfig {
                default_ttl:       DEFAULT_REQUEST_TTL_LEDGERS,
                high_priority_ttl: 200,
                low_priority_ttl:  50,
            });

        let ttl = match priority {
            Priority::Low    => ttl_config.low_priority_ttl,
            Priority::High | Priority::Urgent => ttl_config.high_priority_ttl,
            Priority::Normal => ttl_config.default_ttl,
        };

        let id: u64 = env.storage().instance()
            .get(&DataKey::NextRequestId)
            .unwrap_or(0u64)
            + 1;
        env.storage().instance().set(&DataKey::NextRequestId, &id);

        let req = VerificationRequest {
            storage_ref,
            manifest_hash,
            requester: requester.clone(),
            state:     RequestState::Pending,
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

    pub fn submit_batch_request(
        env:      Env,
        requests: Vec<(Bytes, Bytes, Address, Priority)>,
    ) -> Result<Vec<u64>, Error> {
        if requests.len() > 10 {
            return Err(Error::BatchSizeExceeded);
        }

        if Self::is_paused(env.clone()) {
            return Err(Error::ContractPaused);
        }

        let ttl_config: TTLConfig = env.storage().instance()
            .get(&DataKey::RequestTTL)
            .unwrap_or(TTLConfig {
                default_ttl:       DEFAULT_REQUEST_TTL_LEDGERS,
                high_priority_ttl: 200,
                low_priority_ttl:  50,
            });

        let mut ids: Vec<u64> = vec![&env];

        for i in 0..requests.len() {
            let (storage_ref, manifest_hash, requester, priority) = requests.get(i).unwrap();
            requester.require_auth();

            let ttl = match priority {
                Priority::Low    => ttl_config.low_priority_ttl,
                Priority::High | Priority::Urgent => ttl_config.high_priority_ttl,
                Priority::Normal => ttl_config.default_ttl,
            };

            let id: u64 = env.storage().instance()
                .get(&DataKey::NextRequestId)
                .unwrap_or(0u64)
                + 1;
            env.storage().instance().set(&DataKey::NextRequestId, &id);

            let req = VerificationRequest {
                storage_ref:   storage_ref.clone(),
                manifest_hash: manifest_hash.clone(),
                requester:     requester.clone(),
                state:         RequestState::Pending,
                priority:      priority.clone(),
            };

            env.storage().temporary().set(&DataKey::Request(id), &req);
            env.storage().temporary().extend_ttl(&DataKey::Request(id), ttl, ttl);
            Self::add_request_to_state_index(&env, &RequestState::Pending, id);
            ids.push_back(id);
        }

        env.events().publish((Symbol::new(&env, "batch_submitted"),), ids.clone());
        Ok(ids)
    }

    // -----------------------------------------------------------------------
    // Pagination / queries
    // -----------------------------------------------------------------------

    pub fn get_requests_by_state(
        env:       Env,
        state:     RequestState,
        offset:    u32,
        limit:     u32,
        requester: Option<Address>,
    ) -> PaginatedRequests {
        let all_ids: Vec<u64> = env.storage().persistent()
            .get(&DataKey::RequestsByState(state.clone()))
            .unwrap_or(vec![&env]);

        let mut results: Vec<RequestWithId> = vec![&env];
        let mut count = 0u32;
        let limit_val = if limit == 0 { 100 } else { limit.min(100) };
        let start = offset as usize;

        if start >= all_ids.len() {
            return PaginatedRequests {
                requests:    results,
                total_count: all_ids.len() as u32,
            };
        }

        for i in start..all_ids.len() {
            if count >= limit_val { break; }
            let req_id = all_ids.get(i as u32).unwrap();
            if let Some(req) = env.storage().temporary().get::<_, VerificationRequest>(&DataKey::Request(req_id)) {
                if let Some(ref addr) = requester {
                    if req.requester != *addr { continue; }
                }
                results.push_back(RequestWithId { id: req_id, request: req });
                count += 1;
            }
        }

        PaginatedRequests {
            requests:    results,
            total_count: all_ids.len() as u32,
        }
    }

    // -----------------------------------------------------------------------
    // Archival
    // -----------------------------------------------------------------------

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
                    request:            req,
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

    // -----------------------------------------------------------------------
    // Attestation
    // -----------------------------------------------------------------------

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
    // Private helpers
    // -----------------------------------------------------------------------

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
