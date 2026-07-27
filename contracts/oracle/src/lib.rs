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
    NotInitialized        = 1,
    UnauthorizedSigner    = 2,
    AlreadyInitialized    = 3,
    RegistryNotConfigured = 4,
    TeeNotVerified        = 5,
    ProviderNotRegistered = 6,
    ContractPaused        = 7,
    InsufficientStake      = 8,
    WithdrawalCooldown     = 9,
    NoStake                = 10,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

#[contractevent]
pub struct ContractPaused {
    #[topic]
    pub admin: Address,
}

#[contractevent]
pub struct ContractUnpaused {
    #[topic]
    pub admin: Address,
}

#[contractevent]
pub struct StakeDeposited {
    #[topic]
    pub provider: Address,
    pub amount: u128,
}

#[contractevent]
pub struct StakeSlashed {
    #[topic]
    pub provider: Address,
    pub amount: u128,
}

#[contractevent]
pub struct StakeWithdrawalInitiated {
    #[topic]
    pub provider: Address,
    pub amount: u128,
}

#[contractevent]
pub struct RequestArchived {
    pub request_id: u64,
    pub archived_at_ledger: u32,
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
    Paused,
    ProviderStake(Address),
    ProviderWithdrawalCooldown(Address),
    ArchivedRequest(u64),
    LastArchivalLedger,
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
        env:           Env,
        storage_ref:   Bytes,
        manifest_hash: Bytes,
        requester:     Address,
    ) -> Result<u64, Error> {
        requester.require_auth();

        if Self::is_paused(env.clone()) {
            return Err(Error::ContractPaused);
        }

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
        Ok(id)
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
}

mod test;
