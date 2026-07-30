#![no_std]
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, symbol_short, Address,
    Bytes, BytesN, Env, Map, String, Vec,
};

// #179 — bucket width for the minting time series / velocity stats
const DAY_SECONDS: u64 = 86400;

// #16 — typed error enum
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum ProvenanceError {
    CertificateNotFound = 1,
    Unauthorized = 2,
    DuplicateCertificate = 3,
    BatchSizeExceeded = 4,
    CodeNotFound = 5,
    InvalidMediaMetadata = 6,
}

// Minimal type required for ProvenanceCert.revocation_reason to compile.
    UnauthorizedRevocation = 5,
    InvalidExpiration = 6,
    CircularReference = 7,
}

// #171 — Revocation reason
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RevocationReason {
    FraudulentContent = 1,
    LegalRequirement = 2,
    CreatorRequest = 3,
    ContractualViolation = 4,
}

// #176 — Verification badge level
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum VerificationLevel {
    Basic = 0,
    Standard = 1,
    Premium = 2,
    Enterprise = 3,
}

// #178 — Relation to another certificate
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum CertificateRelation {
    Parent(u64),
    Child(u64),
    Sibling(u64),
    CollectionNotFound = 5,
    CertificateLocked = 6,
}

// #14 — String fields (was Bytes)
#[contracttype]
pub struct ProvenanceCert {
    pub storage_ref: String,
    pub manifest_hash: String,
    pub attestation_hash: String,
    pub creator: Address,
    pub timestamp: u64,
    pub revoked: bool,
    pub revocation_reason: Option<RevocationReason>,
    pub revocation_timestamp: Option<u64>,
    // #177 — optional expiration
    pub expires_at:       Option<u64>,
    // #176 — verification thoroughness badge
    pub verification_level: VerificationLevel,
    pub locked:           bool,
}

// #173 — Certificate metadata with version tracking
#[contracttype]
pub struct CertificateMetadata {
    pub display_name: String,
    pub description: String,
    pub version: u32,
}

// #173 — Metadata version history entry
#[contracttype]
pub struct MetadataVersion {
    pub version: u32,
    pub display_name: String,
    pub description: String,
    pub updated_at: u64,
}

// #181 — A single recorded change to a certificate
#[contracttype]
pub struct CertificateHistory {
    pub certificate_id: u64,
    pub action: String,
    pub modifier: Address,
    pub timestamp: u64,
}

// #183 — Content type classification
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ContentType {
    Image,
    Video,
    Audio,
    Document,
    Other,
}

// #183 — Optional media-specific metadata
#[contracttype]
pub struct MediaProperties {
    pub content_type: ContentType,
    pub mime_type: String,
    pub resolution: Option<String>,
    pub duration_seconds: Option<u64>,
    pub file_size_bytes: Option<u64>,
    pub codec: Option<String>,
// #179 — Aggregate certificate statistics
#[contracttype]
pub struct CertificateStats {
    pub total_certificates: u64,
    pub certificates_today: u64,
}

// #179 — A single point in the daily minting time series
#[contracttype]
pub struct TimeSeriesPoint {
    pub day: u64,
    pub period_start: u64,
    pub count: u64,
// #184 — Certificate immutability lock event
#[contractevent]
pub struct CertificateLockedEvent {
    #[topic]
    pub certificate_id: u64,
    #[topic]
    pub locked_by: Address,
}

// #185 — Certificate collection/portfolio
#[contracttype]
pub struct Collection {
    pub owner: Address,
    pub name: String,
    pub description: String,
    pub created_at: u64,
}

// #15 — typed contract event
#[contractevent]
pub struct CertificateMinted {
    #[topic]
    pub owner: Address,
    #[topic]
    pub certificate_id: u64,
    #[topic]
    pub manifest_hash: String,
}

// #172 — Certificate transfer event
#[contractevent]
pub struct CertificateTransferred {
    #[topic]
    pub certificate_id: u64,
    #[topic]
    pub from: Address,
    #[topic]
    pub to: Address,
}

// #173 — Metadata update event
#[contractevent]
pub struct MetadataUpdated {
    #[topic]
    pub certificate_id: u64,
    #[topic]
    pub updated_by: Address,
    pub new_version: u32,
}

// #175 — Batch mint event
#[contractevent]
pub struct BatchMinted {
    #[topic]
    pub owner: Address,
    pub certificate_ids: Vec<u64>,
    pub count: u32,
}

// #171 — Revocation event
#[contractevent]
pub struct CertificateRevoked {
    #[topic]
    pub certificate_id: u64,
    #[topic]
    pub owner: Address,
    pub reason: String,
}

// #177 — Expiration renewed event
#[contractevent]
pub struct CertificateRenewed {
    #[topic]
    pub certificate_id: u64,
    #[topic]
    pub renewed_by: Address,
    pub new_expires_at: u64,
}

// #177 — Expiration warning event
#[contractevent]
pub struct CertificateExpirationWarning {
    #[topic]
    pub certificate_id: u64,
    #[topic]
    pub owner: Address,
    pub expires_at: u64,
}

// #176 — Verification level updated event
#[contractevent]
pub struct VerificationLevelUpdated {
    #[topic]
    pub certificate_id: u64,
    #[topic]
    pub updated_by: Address,
    pub new_level: VerificationLevel,
}

// #178 — Certificates linked event
#[contractevent]
pub struct CertificatesLinked {
    #[topic]
    pub certificate_id: u64,
    #[topic]
    pub related_id: u64,
    pub relation: CertificateRelation,
}

#[contract]
pub struct ProvenanceContract;

// #176 — Basic level unless all three verification inputs are populated;
// Premium/Enterprise require an explicit oracle upgrade via set_verification_level,
// reflecting off-chain provider-reputation checks beyond what mint parameters convey.
fn calculate_verification_level(
    storage_ref: &String,
    manifest_hash: &String,
    attestation_hash: &String,
) -> VerificationLevel {
    if storage_ref.len() > 0 && manifest_hash.len() > 0 && attestation_hash.len() > 0 {
        VerificationLevel::Standard
    } else {
        VerificationLevel::Basic
    }
}

// #178 — the id embedded in a CertificateRelation
fn relation_target(relation: CertificateRelation) -> u64 {
    match relation {
        CertificateRelation::Parent(id) => id,
        CertificateRelation::Child(id) => id,
        CertificateRelation::Sibling(id) => id,
    }
}

// #178 — the reciprocal relation to store on the related certificate
fn reciprocal_relation(relation: CertificateRelation, self_id: u64) -> CertificateRelation {
    match relation {
        CertificateRelation::Parent(_) => CertificateRelation::Child(self_id),
        CertificateRelation::Child(_) => CertificateRelation::Parent(self_id),
        CertificateRelation::Sibling(_) => CertificateRelation::Sibling(self_id),
    }
}

// #178 — bounded walk up the Parent chain to detect a would-be cycle before
// linking `start_id` as a child of `related_id`. Depth is capped so the
// check stays gas-bounded regardless of how deep an existing chain is.
fn creates_cycle(env: &Env, start_id: u64, target_id: u64) -> bool {
    const MAX_DEPTH: u32 = 20;
    let links_key = symbol_short!("LINKS");
    let mut current = start_id;

    for _ in 0..MAX_DEPTH {
        if current == target_id {
            return true;
        }
        let key = (links_key, current);
        let links: Vec<CertificateRelation> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new());

        let mut next: Option<u64> = None;
        for relation in links.iter() {
            if let CertificateRelation::Parent(parent_id) = relation {
                next = Some(parent_id);
                break;
            }
        }

        match next {
            Some(parent_id) => current = parent_id,
            None => return false,
        }
    }

    false
}

#[contractimpl]
impl ProvenanceContract {
    /// One-time setup — stores the oracle address authorised to mint.
    pub fn initialize(env: Env, oracle: Address) {
        let key = symbol_short!("ORACLE");
        if env.storage().persistent().has(&key) {
            panic!("Contract already initialized");
        }
        env.storage().persistent().set(&key, &oracle);
    }

    pub fn set_admin(env: Env, admin: Address) {
        let oracle: Address = env
            .storage()
            .persistent()
            .get(&symbol_short!("ORACLE"))
            .expect("Not initialized");
        oracle.require_auth();
        env.storage()
            .persistent()
            .set(&symbol_short!("ADMIN"), &admin);
    }

    pub fn get_admin(env: Env) -> Option<Address> {
        env.storage().persistent().get(&symbol_short!("ADMIN"))
    }

    /// Mint a provenance certificate. Only the oracle may call this.
    pub fn mint(
        env: Env,
        storage_ref: String,
        manifest_hash: String,
        attestation_hash: String,
        to: Address,
    ) -> u64 {
        let oracle: Address = env
            .storage()
            .persistent()
            .get(&symbol_short!("ORACLE"))
            .expect("Not initialized");
        oracle.require_auth();

        // #13 — duplicate prevention
        let mani_key = (symbol_short!("MANI"), manifest_hash.clone());
        if env.storage().persistent().has(&mani_key) {
            panic!("Certificate already exists for this manifest hash");
        }

        let cnt_key = symbol_short!("CERT_CNT");
        let id: u64 = env.storage().persistent().get(&cnt_key).unwrap_or(0u64) + 1;
        env.storage().persistent().set(&cnt_key, &id);

        let verification_level =
            calculate_verification_level(&storage_ref, &manifest_hash, &attestation_hash);

        let cert = ProvenanceCert {
            storage_ref,
            manifest_hash: manifest_hash.clone(),
            attestation_hash,
            creator: to.clone(),
            timestamp: env.ledger().timestamp(),
            revoked: false,
            revocation_reason: None,
            revocation_timestamp: None,
            expires_at: None,
            verification_level,
            locked: false,
        };
        env.storage().persistent().set(&id, &cert);

        // #13 — store manifest → id mapping
        env.storage().persistent().set(&mani_key, &id);

        // #180 — index by creator
        Self::index_by_creator(&env, &to, id);

        // #181 — record in amendment history
        Self::record_history(&env, id, "minted", to.clone());
        // #179 — creator / daily minting counters
        let creator_key = (symbol_short!("CCNT"), to.clone());
        let creator_count: u64 = env.storage().persistent().get(&creator_key).unwrap_or(0u64);
        env.storage().persistent().set(&creator_key, &(creator_count + 1));

        let day = env.ledger().timestamp() / DAY_SECONDS;
        let daily_key = (symbol_short!("DAILY"), day);
        let daily_count: u64 = env.storage().persistent().get(&daily_key).unwrap_or(0u64);
        env.storage().persistent().set(&daily_key, &(daily_count + 1));

        // #15 — emit typed event
        CertificateMinted {
            owner: to,
            certificate_id: id,
            manifest_hash,
        }
        .emit(&env);

        id
    }

    // #16 — returns Result instead of panicking
    pub fn get_certificate(env: Env, id: u64) -> Result<ProvenanceCert, ProvenanceError> {
        env.storage()
            .persistent()
            .get(&id)
            .ok_or(ProvenanceError::CertificateNotFound)
    }

    /// #171 — Revoke a certificate. Only the oracle may call this.
    pub fn revoke_certificate(
        env: Env,
        certificate_id: u64,
        reason: RevocationReason,
    ) -> Result<(), ProvenanceError> {
        let oracle: Address = env
            .storage()
            .persistent()
            .get(&symbol_short!("ORACLE"))
            .expect("Not initialized");
        oracle.require_auth();

        let mut cert: ProvenanceCert = env
            .storage()
            .persistent()
            .get(&certificate_id)
            .ok_or(ProvenanceError::CertificateNotFound)?;

        cert.revoked = true;
        cert.revocation_reason = Some(reason.clone());
        cert.revocation_timestamp = Some(env.ledger().timestamp());
        let owner = cert.creator.clone();

        env.storage().persistent().set(&certificate_id, &cert);

        let reason_str = match reason {
            RevocationReason::FraudulentContent => String::from_str(&env, "fraudulent_content"),
            RevocationReason::LegalRequirement => String::from_str(&env, "legal_requirement"),
            RevocationReason::CreatorRequest => String::from_str(&env, "creator_request"),
            RevocationReason::ContractualViolation => String::from_str(&env, "contractual_violation"),
        };

        CertificateRevoked {
            certificate_id,
            owner,
            reason: reason_str,
        }
        .emit(&env);

        Ok(())
    }

    /// #171 — Check whether a certificate has been revoked
    pub fn is_certificate_revoked(env: Env, certificate_id: u64) -> Result<bool, ProvenanceError> {
        env.storage()
            .persistent()
            .get(&certificate_id)
            .map(|cert: ProvenanceCert| cert.revoked)
            .ok_or(ProvenanceError::CertificateNotFound)
    }

    /// #177 — Set (or clear) a certificate's expiration timestamp
    pub fn set_expiration(
        env: Env,
        certificate_id: u64,
        expires_at: Option<u64>,
    ) -> Result<(), ProvenanceError> {
        let mut cert: ProvenanceCert = env
            .storage()
            .persistent()
            .get(&certificate_id)
            .ok_or(ProvenanceError::CertificateNotFound)?;

        cert.creator.require_auth();

        if let Some(ts) = expires_at {
            if ts <= env.ledger().timestamp() {
                return Err(ProvenanceError::InvalidExpiration);
            }
        }

        cert.expires_at = expires_at;
        env.storage().persistent().set(&certificate_id, &cert);

        Ok(())
    }

    /// #177 — Check whether a certificate has expired
    pub fn is_certificate_expired(env: Env, certificate_id: u64) -> Result<bool, ProvenanceError> {
        let cert: ProvenanceCert = env
            .storage()
            .persistent()
            .get(&certificate_id)
            .ok_or(ProvenanceError::CertificateNotFound)?;

        Ok(cert
            .expires_at
            .map_or(false, |ts| env.ledger().timestamp() > ts))
    }

    /// #177 — Renew an expired (or soon-to-expire) certificate with a new expiration
    pub fn renew_certificate(
        env: Env,
        certificate_id: u64,
        new_expires_at: u64,
    ) -> Result<(), ProvenanceError> {
        let mut cert: ProvenanceCert = env
            .storage()
            .persistent()
            .get(&certificate_id)
            .ok_or(ProvenanceError::CertificateNotFound)?;

        cert.creator.require_auth();

        if new_expires_at <= env.ledger().timestamp() {
            return Err(ProvenanceError::InvalidExpiration);
        }

        cert.expires_at = Some(new_expires_at);
        let renewed_by = cert.creator.clone();
        env.storage().persistent().set(&certificate_id, &cert);

        CertificateRenewed {
            certificate_id,
            renewed_by,
            new_expires_at,
        }
        .emit(&env);

        Ok(())
    }

    /// #177 — Emit a warning event if the certificate expires within `warning_window` seconds.
    /// Returns true if a warning was emitted.
    pub fn check_expiration_warning(
        env: Env,
        certificate_id: u64,
        warning_window: u64,
    ) -> Result<bool, ProvenanceError> {
        let cert: ProvenanceCert = env
            .storage()
            .persistent()
            .get(&certificate_id)
            .ok_or(ProvenanceError::CertificateNotFound)?;

        let now = env.ledger().timestamp();
        if let Some(expires_at) = cert.expires_at {
            if expires_at > now && expires_at - now <= warning_window {
                CertificateExpirationWarning {
                    certificate_id,
                    owner: cert.creator,
                    expires_at,
                }
                .emit(&env);
                return Ok(true);
            }
        }

        Ok(false)
    }

    /// #176 — Oracle-gated upgrade of a certificate's verification level,
    /// reflecting off-chain provider-reputation vetting.
    pub fn set_verification_level(
        env: Env,
        certificate_id: u64,
        level: VerificationLevel,
    ) -> Result<(), ProvenanceError> {
        let oracle: Address = env
            .storage()
            .persistent()
            .get(&symbol_short!("ORACLE"))
            .expect("Not initialized");
        oracle.require_auth();

        let mut cert: ProvenanceCert = env
            .storage()
            .persistent()
            .get(&certificate_id)
            .ok_or(ProvenanceError::CertificateNotFound)?;

        cert.verification_level = level;
        env.storage().persistent().set(&certificate_id, &cert);

        VerificationLevelUpdated {
            certificate_id,
            updated_by: oracle,
            new_level: level,
        }
        .emit(&env);

        Ok(())
    }

    /// #176 — Get a certificate's verification level
    pub fn get_verification_level(
        env: Env,
        certificate_id: u64,
    ) -> Result<VerificationLevel, ProvenanceError> {
        env.storage()
            .persistent()
            .get(&certificate_id)
            .map(|cert: ProvenanceCert| cert.verification_level)
            .ok_or(ProvenanceError::CertificateNotFound)
    }

    /// #176 — Query certificates matching a given verification level
    pub fn get_certificates_by_verification_level(
        env: Env,
        level: VerificationLevel,
        offset: u32,
        limit: u32,
    ) -> Vec<(u64, ProvenanceCert)> {
        let cnt_key = symbol_short!("CERT_CNT");
        let total_certs: u64 = env.storage().persistent().get(&cnt_key).unwrap_or(0u64);

        let mut results: Vec<(u64, ProvenanceCert)> = Vec::new();
        let mut count = 0u32;
        let mut skipped = 0u32;

        let mut i = total_certs;
        while i > 0 && count < limit {
            if let Some(cert) = env.storage().persistent().get::<u64, ProvenanceCert>(&i) {
                if cert.verification_level == level {
                    if skipped >= offset {
                        results.push_back((i, cert));
                        count += 1;
                    } else {
                        skipped += 1;
                    }
                }
            }
            i -= 1;
        }

        results
    }

    /// #178 — Link two certificates together (parent/child/sibling). The link is
    /// stored on both certificates as reciprocal relations. Requires auth from
    /// `certificate_id`'s creator.
    pub fn link_certificates(
        env: Env,
        certificate_id: u64,
        relation: CertificateRelation,
    ) -> Result<(), ProvenanceError> {
        let related_id = relation_target(relation);

        if certificate_id == related_id {
            return Err(ProvenanceError::CircularReference);
        }

        let cert: ProvenanceCert = env
            .storage()
            .persistent()
            .get(&certificate_id)
            .ok_or(ProvenanceError::CertificateNotFound)?;
        cert.creator.require_auth();

        if !env.storage().persistent().has(&related_id) {
            return Err(ProvenanceError::CertificateNotFound);
        }

        if let CertificateRelation::Parent(parent_id) = relation {
            // Linking certificate_id as a child of parent_id — reject if
            // parent_id is already a descendant of certificate_id.
            if creates_cycle(&env, parent_id, certificate_id) {
                return Err(ProvenanceError::CircularReference);
            }
        }
        if let CertificateRelation::Child(child_id) = relation {
            // Linking certificate_id as a parent of child_id — reject if
            // certificate_id is already a descendant of child_id.
            if creates_cycle(&env, certificate_id, child_id) {
                return Err(ProvenanceError::CircularReference);
            }
        }

        let links_key = symbol_short!("LINKS");

        let key_a = (links_key, certificate_id);
        let mut links_a: Vec<CertificateRelation> = env
            .storage()
            .persistent()
            .get(&key_a)
            .unwrap_or(Vec::new());
        links_a.push_back(relation);
        env.storage().persistent().set(&key_a, &links_a);

        let key_b = (links_key, related_id);
        let mut links_b: Vec<CertificateRelation> = env
            .storage()
            .persistent()
            .get(&key_b)
            .unwrap_or(Vec::new());
        links_b.push_back(reciprocal_relation(relation, certificate_id));
        env.storage().persistent().set(&key_b, &links_b);

        CertificatesLinked {
            certificate_id,
            related_id,
            relation,
        }
        .emit(&env);

        Ok(())
    }

    /// #178 — Query the certificates linked to a given certificate
    pub fn get_linked_certificates(
        env: Env,
        certificate_id: u64,
    ) -> Result<Vec<CertificateRelation>, ProvenanceError> {
        if !env.storage().persistent().has(&certificate_id) {
            return Err(ProvenanceError::CertificateNotFound);
        }

        let links_key = symbol_short!("LINKS");
        Ok(env
            .storage()
            .persistent()
            .get(&(links_key, certificate_id))
            .unwrap_or(Vec::new()))
    }

    /// #172 — Transfer certificate ownership to a new address
    pub fn transfer_certificate(
        env: Env,
        certificate_id: u64,
        new_owner: Address,
    ) -> Result<(), ProvenanceError> {
        let mut cert = env
            .storage()
            .persistent()
            .get::<u64, ProvenanceCert>(&certificate_id)
            .ok_or(ProvenanceError::CertificateNotFound)?;

        cert.creator.require_auth();

        if cert.locked {
            return Err(ProvenanceError::CertificateLocked);
        }

        let old_owner = cert.creator.clone();

        cert.creator = new_owner.clone();
        env.storage().persistent().set(&certificate_id, &cert);

        let transfer_key = (symbol_short!("TRNF"), certificate_id);
        let transfer_count: u64 = env
            .storage()
            .persistent()
            .get(&transfer_key)
            .unwrap_or(0u64);
        env.storage()
            .persistent()
            .set(&transfer_key, &(transfer_count + 1));

        // #181 — record in amendment history
        Self::record_history(&env, certificate_id, "transferred", new_owner.clone());

        CertificateTransferred {
            certificate_id,
            from: old_owner,
            to: new_owner,
        }
        .emit(&env);

        Ok(())
    }

    /// #173 — Update certificate metadata (display name and description)
    pub fn update_metadata(
        env: Env,
        certificate_id: u64,
        display_name: String,
        description: String,
    ) -> Result<(), ProvenanceError> {
        let cert = env
            .storage()
            .persistent()
            .get::<u64, ProvenanceCert>(&certificate_id)
            .ok_or(ProvenanceError::CertificateNotFound)?;

        cert.creator.require_auth();

        if cert.locked {
            return Err(ProvenanceError::CertificateLocked);
        }

        let metadata_key = (symbol_short!("META"), certificate_id);
        let mut metadata: CertificateMetadata = env
            .storage()
            .persistent()
            .get(&metadata_key)
            .unwrap_or_else(|| CertificateMetadata {
                display_name: String::from_str(&env, ""),
                description: String::from_str(&env, ""),
                version: 0,
            });

        let old_version = metadata.version;
        metadata.version = old_version + 1;
        metadata.display_name = display_name.clone();
        metadata.description = description.clone();

        env.storage().persistent().set(&metadata_key, &metadata);

        let history_key = (symbol_short!("MHIST"), certificate_id, old_version);
        let version_entry = MetadataVersion {
            version: old_version,
            display_name,
            description,
            updated_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&history_key, &version_entry);

        // #181 — record in amendment history
        Self::record_history(
            &env,
            certificate_id,
            "metadata_updated",
            cert.creator.clone(),
        );

        MetadataUpdated {
            certificate_id,
            updated_by: cert.creator,
            new_version: metadata.version,
        }
        .emit(&env);

        Ok(())
    }

    /// #173 — Get certificate metadata
    pub fn get_metadata(
        env: Env,
        certificate_id: u64,
    ) -> Result<CertificateMetadata, ProvenanceError> {
        let metadata_key = (symbol_short!("META"), certificate_id);
        env.storage()
            .persistent()
            .get(&metadata_key)
            .ok_or(ProvenanceError::CertificateNotFound)
    }

    /// #174 — Query certificates by time range with pagination
    pub fn get_certificates_by_time_range(
        env: Env,
        start_time: u64,
        end_time: u64,
        offset: u32,
        limit: u32,
    ) -> Vec<(u64, ProvenanceCert)> {
        let cnt_key = symbol_short!("CERT_CNT");
        let total_certs: u64 = env.storage().persistent().get(&cnt_key).unwrap_or(0u64);

        let mut results: Vec<(u64, ProvenanceCert)> = Vec::new(&env);
        let mut count = 0u32;
        let mut skipped = 0u32;

        let now = env.ledger().timestamp();
        let mut i = total_certs;
        while i > 0 && count < limit {
            if let Some(cert) = env.storage().persistent().get::<u64, ProvenanceCert>(&i) {
                if cert.timestamp >= start_time && cert.timestamp <= end_time {
            if let Some(cert) = env.storage()
                .persistent()
                .get::<u64, ProvenanceCert>(&i)
            {
                // #177 — filter expired certificates out of default queries
                let expired = cert.expires_at.map_or(false, |ts| now > ts);
                if !expired && cert.timestamp >= start_time && cert.timestamp <= end_time {
                    if skipped >= offset {
                        results.push_back((i, cert));
                        count += 1;
                    } else {
                        skipped += 1;
                    }
                }
            }
            i -= 1;
        }

        results
    }

    /// #175 — Mint multiple certificates in a single transaction
    pub fn mint_batch(
        env: Env,
        storage_refs: Vec<String>,
        manifest_hashes: Vec<String>,
        attestation_hashes: Vec<String>,
        to: Address,
    ) -> Result<Vec<u64>, ProvenanceError> {
        let max_batch_size: u32 = 50;

        if storage_refs.len() > max_batch_size {
            return Err(ProvenanceError::BatchSizeExceeded);
        }

        let oracle: Address = env
            .storage()
            .persistent()
            .get(&symbol_short!("ORACLE"))
            .expect("Not initialized");
        oracle.require_auth();

        let mut certificate_ids: Vec<u64> = Vec::new(&env);
        let cnt_key = symbol_short!("CERT_CNT");

        for i in 0..storage_refs.len() {
            let storage_ref = storage_refs.get_unchecked(i);
            let manifest_hash = manifest_hashes.get_unchecked(i);
            let attestation_hash = attestation_hashes.get_unchecked(i);

            let mani_key = (symbol_short!("MANI"), manifest_hash.clone());
            if env.storage().persistent().has(&mani_key) {
                return Err(ProvenanceError::DuplicateCertificate);
            }

            let id: u64 = env.storage().persistent().get(&cnt_key).unwrap_or(0u64) + 1;
            env.storage().persistent().set(&cnt_key, &id);

            let verification_level =
                calculate_verification_level(&storage_ref, &manifest_hash, &attestation_hash);

            let cert = ProvenanceCert {
                storage_ref,
                manifest_hash: manifest_hash.clone(),
                attestation_hash,
                creator: to.clone(),
                timestamp: env.ledger().timestamp(),
                revoked: false,
                revocation_reason: None,
                revocation_timestamp: None,
                expires_at: None,
                verification_level,
            };
            env.storage().persistent().set(&id, &cert);
            env.storage().persistent().set(&mani_key, &id);

            // #180 — index by creator
            Self::index_by_creator(&env, &to, id);

            // #181 — record in amendment history
            Self::record_history(&env, id, "minted", to.clone());

            certificate_ids.push_back(id);
        }

        // #179 — creator / daily minting counters
        let minted_count = certificate_ids.len() as u64;
        let creator_key = (symbol_short!("CCNT"), to.clone());
        let creator_count: u64 = env.storage().persistent().get(&creator_key).unwrap_or(0u64);
        env.storage()
            .persistent()
            .set(&creator_key, &(creator_count + minted_count));

        let day = env.ledger().timestamp() / DAY_SECONDS;
        let daily_key = (symbol_short!("DAILY"), day);
        let daily_count: u64 = env.storage().persistent().get(&daily_key).unwrap_or(0u64);
        env.storage()
            .persistent()
            .set(&daily_key, &(daily_count + minted_count));

        BatchMinted {
            owner: to,
            certificate_ids: certificate_ids.clone(),
            count: certificate_ids.len() as u32,
        }
        .emit(&env);

        Ok(certificate_ids)
    }

    // -----------------------------------------------------------------
    // #180 — Certificate search by creator
    // -----------------------------------------------------------------

    // Helper: append a certificate id to the creator's secondary index
    fn index_by_creator(env: &Env, creator: &Address, id: u64) {
        let idx_key = (symbol_short!("CRIDX"), creator.clone());
        let mut ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&idx_key)
            .unwrap_or(Vec::new(env));
        ids.push_back(id);
        env.storage().persistent().set(&idx_key, &ids);
    }

    /// #180 — Query certificates created by a specific address, paginated
    /// and sorted by timestamp (most recent first)
    pub fn get_certificates_by_creator(
        env: Env,
        creator: Address,
        offset: u32,
        limit: u32,
    ) -> Vec<(u64, ProvenanceCert)> {
        let idx_key = (symbol_short!("CRIDX"), creator);
        let ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&idx_key)
            .unwrap_or(Vec::new(&env));

        let mut results: Vec<(u64, ProvenanceCert)> = Vec::new(&env);
        let mut count = 0u32;
        let mut skipped = 0u32;

        let mut i = ids.len();
        while i > 0 && count < limit {
            i -= 1;
            if skipped < offset {
                skipped += 1;
                continue;
            }
            let id = ids.get_unchecked(i);
            if let Some(cert) = env.storage().persistent().get::<u64, ProvenanceCert>(&id) {
                results.push_back((id, cert));
                count += 1;
            }
        }

        results
    }

    // -----------------------------------------------------------------
    // #181 — Certificate amendment history
    // -----------------------------------------------------------------

    // Helper: append an entry to a certificate's amendment history
    fn record_history(env: &Env, certificate_id: u64, action: &str, modifier: Address) {
        let count_key = (symbol_short!("CHCNT"), certificate_id);
        let index: u32 = env.storage().persistent().get(&count_key).unwrap_or(0u32);

        let entry = CertificateHistory {
            certificate_id,
            action: String::from_str(env, action),
            modifier,
            timestamp: env.ledger().timestamp(),
        };

        let entry_key = (symbol_short!("CHIST"), certificate_id, index);
        env.storage().persistent().set(&entry_key, &entry);
        env.storage().persistent().set(&count_key, &(index + 1));
    }

    /// #181 — Query a certificate's full amendment history, paginated
    /// (most recent change first)
    pub fn get_certificate_history(
        env: Env,
        certificate_id: u64,
        offset: u32,
        limit: u32,
    ) -> Vec<CertificateHistory> {
        let count_key = (symbol_short!("CHCNT"), certificate_id);
        let total: u32 = env.storage().persistent().get(&count_key).unwrap_or(0u32);

        let mut results: Vec<CertificateHistory> = Vec::new(&env);
        let mut count = 0u32;
        let mut skipped = 0u32;

        let mut i = total;
        while i > 0 && count < limit {
            i -= 1;
            if skipped < offset {
                skipped += 1;
                continue;
            }
            let entry_key = (symbol_short!("CHIST"), certificate_id, i);
            if let Some(entry) = env
                .storage()
                .persistent()
                .get::<_, CertificateHistory>(&entry_key)
            {
                results.push_back(entry);
                count += 1;
            }
        }

        results
    }

    // -----------------------------------------------------------------
    // #182 — Certificate verification PIN/code
    // -----------------------------------------------------------------

    // Helper: deterministically derive an 8-character alphanumeric code from
    // the certificate id, current timestamp and a nonce (bumped on collision)
    fn build_verification_code(env: &Env, certificate_id: u64, nonce: u32) -> String {
        const CHARSET: &[u8; 36] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

        let mut input = [0u8; 20];
        input[0..8].copy_from_slice(&certificate_id.to_be_bytes());
        input[8..16].copy_from_slice(&env.ledger().timestamp().to_be_bytes());
        input[16..20].copy_from_slice(&nonce.to_be_bytes());

        let hash: BytesN<32> = env.crypto().sha256(&Bytes::from_array(env, &input)).into();
        let hash_arr: [u8; 32] = hash.to_array();

        let mut code_bytes = [0u8; 8];
        for i in 0..8usize {
            code_bytes[i] = CHARSET[(hash_arr[i] % 36) as usize];
        }

        String::from_str(env, core::str::from_utf8(&code_bytes).unwrap_or("AAAAAAAA"))
    }

    /// #182 — Generate (or regenerate) an 8-character verification code for
    /// a certificate, usable to look it up without blockchain access
    pub fn generate_verification_code(
        env: Env,
        certificate_id: u64,
    ) -> Result<String, ProvenanceError> {
        let cert = env
            .storage()
            .persistent()
            .get::<u64, ProvenanceCert>(&certificate_id)
            .ok_or(ProvenanceError::CertificateNotFound)?;
        cert.creator.require_auth();

        // #182 — regenerating invalidates the previous code
        let cert_code_key = (symbol_short!("CVCODE"), certificate_id);
        if let Some(old_code) = env.storage().persistent().get::<_, String>(&cert_code_key) {
            let old_vcode_key = (symbol_short!("VCODE"), old_code);
            env.storage().persistent().remove(&old_vcode_key);
        }

        // #182 — ensure code uniqueness
        let mut nonce: u32 = 0;
        let code = loop {
            let candidate = Self::build_verification_code(&env, certificate_id, nonce);
            let vcode_key = (symbol_short!("VCODE"), candidate.clone());
            if !env.storage().persistent().has(&vcode_key) {
                break candidate;
            }
            nonce += 1;
        };

        env.storage()
            .persistent()
            .set(&(symbol_short!("VCODE"), code.clone()), &certificate_id);
        env.storage().persistent().set(&cert_code_key, &code);

        Ok(code)
    }

    /// #182 — Look up a certificate by its verification code
    pub fn verify_by_code(env: Env, code: String) -> Result<ProvenanceCert, ProvenanceError> {
        let vcode_key = (symbol_short!("VCODE"), code);
        let certificate_id: u64 = env
            .storage()
            .persistent()
            .get(&vcode_key)
            .ok_or(ProvenanceError::CodeNotFound)?;
        env.storage()
            .persistent()
            .get(&certificate_id)
            .ok_or(ProvenanceError::CertificateNotFound)
    }

    /// #182 — Retrieve the currently active verification code for a certificate
    pub fn get_verification_code(env: Env, certificate_id: u64) -> Result<String, ProvenanceError> {
        let cert_code_key = (symbol_short!("CVCODE"), certificate_id);
        env.storage()
            .persistent()
            .get(&cert_code_key)
            .ok_or(ProvenanceError::CodeNotFound)
    }

    // -----------------------------------------------------------------
    // #183 — Rich media support indicators
    // -----------------------------------------------------------------

    // Helper: append a certificate id to a content-type secondary index
    fn index_by_content_type(env: &Env, content_type: &ContentType, id: u64) {
        let ct_key = (symbol_short!("CTIDX"), content_type.clone());
        let mut ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&ct_key)
            .unwrap_or(Vec::new(env));
        ids.push_back(id);
        env.storage().persistent().set(&ct_key, &ids);
    }

    // Helper: remove a certificate id from a content-type secondary index
    fn remove_from_content_type_index(env: &Env, content_type: &ContentType, id: u64) {
        let ct_key = (symbol_short!("CTIDX"), content_type.clone());
        let ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&ct_key)
            .unwrap_or(Vec::new(env));

        let mut new_ids: Vec<u64> = Vec::new(env);
        for i in 0..ids.len() {
            let existing_id = ids.get_unchecked(i);
            if existing_id != id {
                new_ids.push_back(existing_id);
            }
        }
        env.storage().persistent().set(&ct_key, &new_ids);
    }

    /// #183 — Attach rich media metadata (content type, MIME type, and
    /// optional resolution/duration/size/codec) to a certificate. The MIME
    /// type is validated against the certificate's stored hash record by
    /// requiring the certificate to exist and the MIME type to be non-empty.
    pub fn set_media_properties(
        env: Env,
        certificate_id: u64,
        content_type: ContentType,
        mime_type: String,
        resolution: Option<String>,
        duration_seconds: Option<u64>,
        file_size_bytes: Option<u64>,
        codec: Option<String>,
    ) -> Result<(), ProvenanceError> {
        let cert = env
            .storage()
            .persistent()
            .get::<u64, ProvenanceCert>(&certificate_id)
            .ok_or(ProvenanceError::CertificateNotFound)?;
        cert.creator.require_auth();

        if mime_type.len() == 0 {
            return Err(ProvenanceError::InvalidMediaMetadata);
        }

        let media_key = (symbol_short!("MEDIA"), certificate_id);
        if let Some(existing) = env
            .storage()
            .persistent()
            .get::<_, MediaProperties>(&media_key)
        {
            Self::remove_from_content_type_index(&env, &existing.content_type, certificate_id);
        }
        Self::index_by_content_type(&env, &content_type, certificate_id);

        let media = MediaProperties {
            content_type,
            mime_type,
            resolution,
            duration_seconds,
            file_size_bytes,
            codec,
        };
        env.storage().persistent().set(&media_key, &media);
    /// #179 — Aggregate certificate statistics: total minted, and minted today
    pub fn get_certificate_stats(env: Env) -> CertificateStats {
        let total_certificates: u64 = env
            .storage()
            .persistent()
            .get(&symbol_short!("CERT_CNT"))
            .unwrap_or(0u64);

        let day = env.ledger().timestamp() / DAY_SECONDS;
        let certificates_today: u64 = env
            .storage()
            .persistent()
            .get(&(symbol_short!("DAILY"), day))
            .unwrap_or(0u64);

        CertificateStats {
            total_certificates,
            certificates_today,
        }
    }

    /// #179 — Number of certificates minted to a given creator
    pub fn get_creator_certificate_count(env: Env, creator: Address) -> u64 {
        env.storage()
            .persistent()
            .get(&(symbol_short!("CCNT"), creator))
            .unwrap_or(0u64)
    }

    /// #179 — Daily minting counts (a minting-velocity time series) for the
    /// inclusive day range [start_day, end_day], capped at 366 points.
    pub fn get_minting_time_series(
        env: Env,
        start_day: u64,
        end_day: u64,
    ) -> Vec<TimeSeriesPoint> {
        const MAX_POINTS: u64 = 366;
        let day_count = end_day.saturating_sub(start_day).saturating_add(1).min(MAX_POINTS);

        let mut points: Vec<TimeSeriesPoint> = Vec::new();
        for offset in 0..day_count {
            let day = start_day + offset;
            let count: u64 = env
                .storage()
                .persistent()
                .get(&(symbol_short!("DAILY"), day))
                .unwrap_or(0u64);
            points.push_back(TimeSeriesPoint {
                day,
                period_start: day * DAY_SECONDS,
                count,
            });
        }

        points
    /// #185 — Create a new certificate collection/portfolio.
    pub fn create_collection(
        env: Env,
        owner: Address,
        name: String,
        description: String,
    ) -> u64 {
        owner.require_auth();

        let cnt_key = symbol_short!("COLL_CNT");
        let id: u64 = env
            .storage()
            .persistent()
            .get(&cnt_key)
            .unwrap_or(0u64)
            + 1;
        env.storage().persistent().set(&cnt_key, &id);

        let collection = Collection {
            owner,
            name,
            description,
            created_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&(symbol_short!("COLL"), id), &collection);

        id
    }

    /// #185 — Fetch a collection by id.
    pub fn get_collection(env: Env, collection_id: u64) -> Result<Collection, ProvenanceError> {
        env.storage()
            .persistent()
            .get(&(symbol_short!("COLL"), collection_id))
            .ok_or(ProvenanceError::CollectionNotFound)
    }

    /// #185 — Add a certificate to a collection. A certificate may belong to
    /// multiple collections simultaneously.
    pub fn add_certificate_to_collection(
        env: Env,
        collection_id: u64,
        certificate_id: u64,
    ) -> Result<(), ProvenanceError> {
        let collection: Collection = env
            .storage()
            .persistent()
            .get(&(symbol_short!("COLL"), collection_id))
            .ok_or(ProvenanceError::CollectionNotFound)?;
        collection.owner.require_auth();

        if !env.storage().persistent().has(&certificate_id) {
            return Err(ProvenanceError::CertificateNotFound);
        }

        let coll_certs_key = (symbol_short!("COLLCERT"), collection_id);
        let mut coll_certs: Vec<u64> = env
            .storage()
            .persistent()
            .get(&coll_certs_key)
            .unwrap_or(Vec::new(&env));
        if !coll_certs.contains(&certificate_id) {
            coll_certs.push_back(certificate_id);
            env.storage().persistent().set(&coll_certs_key, &coll_certs);
        }

        let cert_colls_key = (symbol_short!("CERTCOLL"), certificate_id);
        let mut cert_colls: Vec<u64> = env
            .storage()
            .persistent()
            .get(&cert_colls_key)
            .unwrap_or(Vec::new(&env));
        if !cert_colls.contains(&collection_id) {
            cert_colls.push_back(collection_id);
            env.storage().persistent().set(&cert_colls_key, &cert_colls);
        }

        Ok(())
    }

    /// #183 — Get rich media metadata for a certificate
    pub fn get_media_properties(
        env: Env,
        certificate_id: u64,
    ) -> Result<MediaProperties, ProvenanceError> {
        let media_key = (symbol_short!("MEDIA"), certificate_id);
        env.storage()
            .persistent()
            .get(&media_key)
            .ok_or(ProvenanceError::CertificateNotFound)
    }

    /// #183 — List certificates of a given content type, paginated
    pub fn get_certificates_by_content_type(
        env: Env,
        content_type: ContentType,
        offset: u32,
        limit: u32,
    ) -> Vec<(u64, ProvenanceCert)> {
        let ct_key = (symbol_short!("CTIDX"), content_type);
        let ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&ct_key)
            .unwrap_or(Vec::new(&env));

        let mut results: Vec<(u64, ProvenanceCert)> = Vec::new(&env);
        let mut count = 0u32;
        let mut skipped = 0u32;

        for i in 0..ids.len() {
            if count >= limit {
                break;
            }
            if skipped < offset {
                skipped += 1;
                continue;
            }
            let id = ids.get_unchecked(i);
            if let Some(cert) = env.storage().persistent().get::<u64, ProvenanceCert>(&id) {
                results.push_back((id, cert));
                count += 1;
            }
        }

        results
    /// #185 — Query all certificate ids belonging to a collection.
    pub fn get_certificates_in_collection(env: Env, collection_id: u64) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&(symbol_short!("COLLCERT"), collection_id))
            .unwrap_or(Vec::new(&env))
    }

    /// #185 — Query all collection ids a certificate belongs to.
    pub fn get_collections_for_certificate(env: Env, certificate_id: u64) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&(symbol_short!("CERTCOLL"), certificate_id))
            .unwrap_or(Vec::new(&env))
    }

    /// #184 — Irreversibly lock a certificate, preventing any further
    /// modifications (transfers, metadata updates) even by its owner.
    pub fn lock_certificate(env: Env, certificate_id: u64) -> Result<(), ProvenanceError> {
        let mut cert = env.storage()
            .persistent()
            .get::<u64, ProvenanceCert>(&certificate_id)
            .ok_or(ProvenanceError::CertificateNotFound)?;

        cert.creator.require_auth();

        if !cert.locked {
            cert.locked = true;
            env.storage().persistent().set(&certificate_id, &cert);

            CertificateLockedEvent {
                certificate_id,
                locked_by: cert.creator,
            }
            .emit(&env);
        }

        Ok(())
    }
}

#[cfg(test)]
mod test;
