#![no_std]
use soroban_sdk::{
    contract, contractevent, contracterror, contractimpl, contracttype,
    symbol_short, Address, Env, String, Vec, Map,
};

// #16 — typed error enum
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum ProvenanceError {
    CertificateNotFound = 1,
    Unauthorized = 2,
    DuplicateCertificate = 3,
    BatchSizeExceeded = 4,
    CollectionNotFound = 5,
    CertificateLocked = 6,
}

// #14 — String fields (was Bytes)
#[contracttype]
pub struct ProvenanceCert {
    pub storage_ref:      String,
    pub manifest_hash:    String,
    pub attestation_hash: String,
    pub creator:          Address,
    pub timestamp:        u64,
    pub revoked:          bool,
    pub revocation_reason: Option<RevocationReason>,
    pub revocation_timestamp: Option<u64>,
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
        env.storage().persistent().set(&symbol_short!("ADMIN"), &admin);
    }

    pub fn get_admin(env: Env) -> Option<Address> {
        env.storage().persistent().get(&symbol_short!("ADMIN"))
    }

    /// Mint a provenance certificate. Only the oracle may call this.
    pub fn mint(
        env:              Env,
        storage_ref:      String,
        manifest_hash:    String,
        attestation_hash: String,
        to:               Address,
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
        let id: u64 = env
            .storage()
            .persistent()
            .get(&cnt_key)
            .unwrap_or(0u64)
            + 1;
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
            locked: false,
        };
        env.storage().persistent().set(&id, &cert);

        // #13 — store manifest → id mapping
        env.storage().persistent().set(&mani_key, &id);

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
    pub fn get_certificate(
        env: Env,
        id:  u64,
    ) -> Result<ProvenanceCert, ProvenanceError> {
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
        let mut cert = env.storage()
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
        let transfer_count: u64 = env.storage()
            .persistent()
            .get(&transfer_key)
            .unwrap_or(0u64);
        env.storage().persistent().set(&transfer_key, &(transfer_count + 1));

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
        let cert = env.storage()
            .persistent()
            .get::<u64, ProvenanceCert>(&certificate_id)
            .ok_or(ProvenanceError::CertificateNotFound)?;

        cert.creator.require_auth();

        if cert.locked {
            return Err(ProvenanceError::CertificateLocked);
        }

        let metadata_key = (symbol_short!("META"), certificate_id);
        let mut metadata: CertificateMetadata = env.storage()
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
        let total_certs: u64 = env.storage()
            .persistent()
            .get(&cnt_key)
            .unwrap_or(0u64);

        let mut results: Vec<(u64, ProvenanceCert)> = Vec::new();
        let mut count = 0u32;
        let mut skipped = 0u32;

        let mut i = total_certs;
        while i > 0 && count < limit {
            if let Ok(cert) = env.storage()
                .persistent()
                .get::<u64, ProvenanceCert>(&i)
            {
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

        if storage_refs.len() > max_batch_size as usize {
            return Err(ProvenanceError::BatchSizeExceeded);
        }

        let oracle: Address = env
            .storage()
            .persistent()
            .get(&symbol_short!("ORACLE"))
            .expect("Not initialized");
        oracle.require_auth();

        let mut certificate_ids: Vec<u64> = Vec::new();
        let cnt_key = symbol_short!("CERT_CNT");

        for i in 0..storage_refs.len() {
            let storage_ref = storage_refs.get_unchecked(i);
            let manifest_hash = manifest_hashes.get_unchecked(i);
            let attestation_hash = attestation_hashes.get_unchecked(i);

            let mani_key = (symbol_short!("MANI"), manifest_hash.clone());
            if env.storage().persistent().has(&mani_key) {
                return Err(ProvenanceError::DuplicateCertificate);
            }

            let id: u64 = env
                .storage()
                .persistent()
                .get(&cnt_key)
                .unwrap_or(0u64)
                + 1;
            env.storage().persistent().set(&cnt_key, &id);

            let cert = ProvenanceCert {
                storage_ref,
                manifest_hash: manifest_hash.clone(),
                attestation_hash,
                creator: to.clone(),
                timestamp: env.ledger().timestamp(),
            };
            env.storage().persistent().set(&id, &cert);
            env.storage().persistent().set(&mani_key, &id);
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
