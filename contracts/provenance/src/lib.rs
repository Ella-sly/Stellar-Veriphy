#![no_std]
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, symbol_short, Address,
    Bytes, BytesN, Env, Map, String, Vec,
};

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
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RevocationReason {
    FraudulentContent = 1,
    LegalRequirement = 2,
    CreatorRequest = 3,
    ContractualViolation = 4,
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

#[contract]
pub struct ProvenanceContract;

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

        let cert = ProvenanceCert {
            storage_ref,
            manifest_hash: manifest_hash.clone(),
            attestation_hash,
            creator: to.clone(),
            timestamp: env.ledger().timestamp(),
            revoked: false,
            revocation_reason: None,
            revocation_timestamp: None,
        };
        env.storage().persistent().set(&id, &cert);

        // #13 — store manifest → id mapping
        env.storage().persistent().set(&mani_key, &id);

        // #180 — index by creator
        Self::index_by_creator(&env, &to, id);

        // #181 — record in amendment history
        Self::record_history(&env, id, "minted", to.clone());

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

        let mut i = total_certs;
        while i > 0 && count < limit {
            if let Some(cert) = env.storage().persistent().get::<u64, ProvenanceCert>(&i) {
                if cert.timestamp >= start_time && cert.timestamp <= end_time {
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

            let cert = ProvenanceCert {
                storage_ref,
                manifest_hash: manifest_hash.clone(),
                attestation_hash,
                creator: to.clone(),
                timestamp: env.ledger().timestamp(),
                revoked: false,
                revocation_reason: None,
                revocation_timestamp: None,
            };
            env.storage().persistent().set(&id, &cert);
            env.storage().persistent().set(&mani_key, &id);

            // #180 — index by creator
            Self::index_by_creator(&env, &to, id);

            // #181 — record in amendment history
            Self::record_history(&env, id, "minted", to.clone());

            certificate_ids.push_back(id);
        }

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
    }
}

#[cfg(test)]
mod test;
