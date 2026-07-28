#[cfg(test)]
mod tests {
    use crate::{
        CertificateRelation, ProvenanceContract, ProvenanceContractClient, ProvenanceError,
        RevocationReason, VerificationLevel,
    };
    use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, Env, String};

    fn s(env: &Env, v: &str) -> String {
        String::from_str(env, v)
    }

    // --- Issue #38 ---

    #[test]
    fn test_double_initialization() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);
        assert!(client.try_initialize(&oracle).is_err());
    }

    #[test]
    fn test_mint_without_initialization() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let to = soroban_sdk::Address::generate(&env);
        assert!(client
            .try_mint(&s(&env, "sid"), &s(&env, "mhash"), &s(&env, "ahash"), &to)
            .is_err());
    }

    // --- Issue #39 ---

    #[test]
    fn test_mint_certificate() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let to = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let id = client.mint(
            &s(&env, "storage_ref"),
            &s(&env, "manifest_hash"),
            &s(&env, "attestation_hash"),
            &to,
        );
        assert_eq!(id, 1);

        let cert = client.get_certificate(&id).unwrap();
        assert_eq!(cert.storage_ref, s(&env, "storage_ref"));
        assert_eq!(cert.manifest_hash, s(&env, "manifest_hash"));
        assert_eq!(cert.attestation_hash, s(&env, "attestation_hash"));
        assert_eq!(cert.creator, to);
    }

    #[test]
    fn test_mint_multiple_certificates() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let to = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);
        assert_eq!(
            client.mint(&s(&env, "sid"), &s(&env, "mh1"), &s(&env, "ah"), &to),
            1
        );
        assert_eq!(
            client.mint(&s(&env, "sid"), &s(&env, "mh2"), &s(&env, "ah"), &to),
            2
        );
        assert_eq!(
            client.mint(&s(&env, "sid"), &s(&env, "mh3"), &s(&env, "ah"), &to),
            3
        );
    }

    #[test]
    fn test_get_nonexistent_certificate() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        assert_eq!(
            client.try_get_certificate(&999u64).unwrap_err().unwrap(),
            ProvenanceError::CertificateNotFound
        );
    }

    // --- Issue #40 ---

    #[test]
    fn test_prevent_duplicate_manifest_hash() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let to = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);
        client.mint(&s(&env, "sid"), &s(&env, "mhash"), &s(&env, "ahash"), &to);
        assert!(client
            .try_mint(&s(&env, "sid"), &s(&env, "mhash"), &s(&env, "ahash"), &to)
            .is_err());
    }

    // --- Issue #171 --- Certificate Revocation

    #[test]
    fn test_revoke_certificate() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let id = client.mint(&s(&env, "sid"), &s(&env, "mhash_rev1"), &s(&env, "ahash"), &owner);
        assert!(!client.is_certificate_revoked(&id));

        client.revoke_certificate(&id, &RevocationReason::FraudulentContent);

        assert!(client.is_certificate_revoked(&id));
        let cert = client.get_certificate(&id).unwrap();
        assert!(cert.revoked);
        assert_eq!(cert.revocation_reason, Some(RevocationReason::FraudulentContent));
    }

    #[test]
    fn test_revoke_nonexistent_certificate() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        assert_eq!(
            client
                .try_revoke_certificate(&999u64, &RevocationReason::LegalRequirement)
                .unwrap_err()
                .unwrap(),
            ProvenanceError::CertificateNotFound
        );
    }

    // --- Issue #177 --- Certificate Expiration

    #[test]
    fn test_certificate_not_expired_by_default() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let id = client.mint(&s(&env, "sid"), &s(&env, "mhash_exp1"), &s(&env, "ahash"), &owner);
        assert!(!client.is_certificate_expired(&id));
    }

    #[test]
    fn test_set_expiration_and_expire() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let id = client.mint(&s(&env, "sid"), &s(&env, "mhash_exp2"), &s(&env, "ahash"), &owner);
        let now = env.ledger().timestamp();
        client.set_expiration(&id, &Some(now + 100));
        assert!(!client.is_certificate_expired(&id));

        env.ledger().with_mut(|li| li.timestamp = now + 200);
        assert!(client.is_certificate_expired(&id));
    }

    #[test]
    fn test_set_expiration_in_past_rejected() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let id = client.mint(&s(&env, "sid"), &s(&env, "mhash_exp3"), &s(&env, "ahash"), &owner);
        let now = env.ledger().timestamp();
        assert_eq!(
            client.try_set_expiration(&id, &Some(now)).unwrap_err().unwrap(),
            ProvenanceError::InvalidExpiration
        );
    }

    #[test]
    fn test_renew_certificate() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let id = client.mint(&s(&env, "sid"), &s(&env, "mhash_exp4"), &s(&env, "ahash"), &owner);
        let now = env.ledger().timestamp();
        client.set_expiration(&id, &Some(now + 10));
        env.ledger().with_mut(|li| li.timestamp = now + 20);
        assert!(client.is_certificate_expired(&id));

        client.renew_certificate(&id, &(now + 1000));
        assert!(!client.is_certificate_expired(&id));
    }

    #[test]
    fn test_check_expiration_warning() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let id = client.mint(&s(&env, "sid"), &s(&env, "mhash_exp5"), &s(&env, "ahash"), &owner);
        let now = env.ledger().timestamp();
        client.set_expiration(&id, &Some(now + 50));

        assert!(!client.check_expiration_warning(&id, &10));
        assert!(client.check_expiration_warning(&id, &100));
    }

    #[test]
    fn test_expired_certificate_filtered_from_time_range_query() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let id1 = client.mint(&s(&env, "sid"), &s(&env, "mhash_exp6"), &s(&env, "ahash"), &owner);
        client.mint(&s(&env, "sid"), &s(&env, "mhash_exp7"), &s(&env, "ahash"), &owner);

        let now = env.ledger().timestamp();
        client.set_expiration(&id1, &Some(now + 10));
        env.ledger().with_mut(|li| li.timestamp = now + 20);

        let results = client.get_certificates_by_time_range(&0, &(now + 1000), &0, &10);
        assert_eq!(results.len(), 1);
    }

    // --- Issue #176 --- Verification Badge Levels

    #[test]
    fn test_default_verification_level_is_standard() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let id = client.mint(&s(&env, "sid"), &s(&env, "mhash_lvl1"), &s(&env, "ahash"), &owner);
        assert_eq!(client.get_verification_level(&id), VerificationLevel::Standard);
    }

    #[test]
    fn test_basic_verification_level_when_fields_incomplete() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let id = client.mint(&s(&env, "sid"), &s(&env, "mhash_lvl2"), &s(&env, ""), &owner);
        assert_eq!(client.get_verification_level(&id), VerificationLevel::Basic);
    }

    #[test]
    fn test_set_verification_level_by_oracle() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let id = client.mint(&s(&env, "sid"), &s(&env, "mhash_lvl3"), &s(&env, "ahash"), &owner);
        client.set_verification_level(&id, &VerificationLevel::Enterprise);
        assert_eq!(client.get_verification_level(&id), VerificationLevel::Enterprise);
    }

    #[test]
    fn test_get_certificates_by_verification_level() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let id1 = client.mint(&s(&env, "sid"), &s(&env, "mhash_lvl4"), &s(&env, "ahash"), &owner);
        client.mint(&s(&env, "sid"), &s(&env, "mhash_lvl5"), &s(&env, "ahash"), &owner);
        client.set_verification_level(&id1, &VerificationLevel::Premium);

        let results = client.get_certificates_by_verification_level(&VerificationLevel::Premium, &0, &10);
        assert_eq!(results.len(), 1);
        assert_eq!(results.get_unchecked(0).0, id1);

        let standard_results =
            client.get_certificates_by_verification_level(&VerificationLevel::Standard, &0, &10);
        assert_eq!(standard_results.len(), 1);
    }

    #[test]
    fn test_get_verification_level_nonexistent_certificate() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        assert_eq!(
            client.try_get_verification_level(&999u64).unwrap_err().unwrap(),
            ProvenanceError::CertificateNotFound
        );
    }

    // --- Issue #178 --- Certificate Linking

    #[test]
    fn test_link_parent_child_reciprocal() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let a = client.mint(&s(&env, "sid"), &s(&env, "mhash_lnk1"), &s(&env, "ahash"), &owner);
        let b = client.mint(&s(&env, "sid"), &s(&env, "mhash_lnk2"), &s(&env, "ahash"), &owner);

        client.link_certificates(&b, &CertificateRelation::Parent(a));

        let b_links = client.get_linked_certificates(&b);
        assert_eq!(b_links.len(), 1);
        assert_eq!(b_links.get_unchecked(0), CertificateRelation::Parent(a));

        let a_links = client.get_linked_certificates(&a);
        assert_eq!(a_links.len(), 1);
        assert_eq!(a_links.get_unchecked(0), CertificateRelation::Child(b));
    }

    #[test]
    fn test_link_sibling_reciprocal() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let c = client.mint(&s(&env, "sid"), &s(&env, "mhash_lnk3"), &s(&env, "ahash"), &owner);
        let d = client.mint(&s(&env, "sid"), &s(&env, "mhash_lnk4"), &s(&env, "ahash"), &owner);

        client.link_certificates(&c, &CertificateRelation::Sibling(d));

        assert_eq!(client.get_linked_certificates(&c).get_unchecked(0), CertificateRelation::Sibling(d));
        assert_eq!(client.get_linked_certificates(&d).get_unchecked(0), CertificateRelation::Sibling(c));
    }

    #[test]
    fn test_link_self_rejected() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let a = client.mint(&s(&env, "sid"), &s(&env, "mhash_lnk5"), &s(&env, "ahash"), &owner);

        assert_eq!(
            client.try_link_certificates(&a, &CertificateRelation::Parent(a)).unwrap_err().unwrap(),
            ProvenanceError::CircularReference
        );
    }

    #[test]
    fn test_link_nonexistent_related_certificate_rejected() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let a = client.mint(&s(&env, "sid"), &s(&env, "mhash_lnk6"), &s(&env, "ahash"), &owner);

        assert_eq!(
            client.try_link_certificates(&a, &CertificateRelation::Parent(999u64)).unwrap_err().unwrap(),
            ProvenanceError::CertificateNotFound
        );
    }

    #[test]
    fn test_link_circular_reference_rejected() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let a = client.mint(&s(&env, "sid"), &s(&env, "mhash_lnk7"), &s(&env, "ahash"), &owner);
        let b = client.mint(&s(&env, "sid"), &s(&env, "mhash_lnk8"), &s(&env, "ahash"), &owner);
        let c = client.mint(&s(&env, "sid"), &s(&env, "mhash_lnk9"), &s(&env, "ahash"), &owner);

        // chain: C -> parent B -> parent A
        client.link_certificates(&b, &CertificateRelation::Parent(a));
        client.link_certificates(&c, &CertificateRelation::Parent(b));

        // A -> parent C would close the loop A -> C -> B -> A
        assert_eq!(
            client.try_link_certificates(&a, &CertificateRelation::Parent(c)).unwrap_err().unwrap(),
            ProvenanceError::CircularReference
        );
    }

    // --- Issue #179 --- Certificate Statistics and Analytics

    #[test]
    fn test_get_certificate_stats() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        client.mint(&s(&env, "sid"), &s(&env, "mhash_stat1"), &s(&env, "ahash"), &owner);
        client.mint(&s(&env, "sid"), &s(&env, "mhash_stat2"), &s(&env, "ahash"), &owner);

        let stats = client.get_certificate_stats();
        assert_eq!(stats.total_certificates, 2);
        assert_eq!(stats.certificates_today, 2);
    }

    #[test]
    fn test_get_creator_certificate_count() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner1 = soroban_sdk::Address::generate(&env);
        let owner2 = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        client.mint(&s(&env, "sid"), &s(&env, "mhash_stat3"), &s(&env, "ahash"), &owner1);
        client.mint(&s(&env, "sid"), &s(&env, "mhash_stat4"), &s(&env, "ahash"), &owner1);
        client.mint(&s(&env, "sid"), &s(&env, "mhash_stat5"), &s(&env, "ahash"), &owner2);

        assert_eq!(client.get_creator_certificate_count(&owner1), 2);
        assert_eq!(client.get_creator_certificate_count(&owner2), 1);
    }

    #[test]
    fn test_get_creator_certificate_count_includes_batch() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let storage_refs = soroban_sdk::vec![&env, s(&env, "sid1"), s(&env, "sid2")];
        let manifest_hashes = soroban_sdk::vec![&env, s(&env, "mhash_stat6"), s(&env, "mhash_stat7")];
        let attestation_hashes = soroban_sdk::vec![&env, s(&env, "ah1"), s(&env, "ah2")];
        client.mint_batch(&storage_refs, &manifest_hashes, &attestation_hashes, &owner);

        assert_eq!(client.get_creator_certificate_count(&owner), 2);
        let stats = client.get_certificate_stats();
        assert_eq!(stats.total_certificates, 2);
        assert_eq!(stats.certificates_today, 2);
    }

    #[test]
    fn test_get_minting_time_series() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        client.mint(&s(&env, "sid"), &s(&env, "mhash_stat8"), &s(&env, "ahash"), &owner);
        client.mint(&s(&env, "sid"), &s(&env, "mhash_stat9"), &s(&env, "ahash"), &owner);

        let today = env.ledger().timestamp() / 86400;
        let series = client.get_minting_time_series(&today, &today);
        assert_eq!(series.len(), 1);
        assert_eq!(series.get_unchecked(0).count, 2);

        let empty_series = client.get_minting_time_series(&(today + 1), &(today + 1));
        assert_eq!(empty_series.get_unchecked(0).count, 0);
    }

    // --- Issue #172 --- Certificate Transfer

    #[test]
    fn test_transfer_certificate() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner1 = soroban_sdk::Address::generate(&env);
        let owner2 = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let id = client.mint(
            &s(&env, "sid"),
            &s(&env, "mhash1"),
            &s(&env, "ahash"),
            &owner1,
        );
        assert!(client.transfer_certificate(&id, &owner2).is_ok());

        let cert = client.get_certificate(&id).unwrap();
        assert_eq!(cert.creator, owner2);
    }

    #[test]
    fn test_transfer_nonexistent_certificate() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let new_owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        assert_eq!(
            client
                .try_transfer_certificate(&999u64, &new_owner)
                .unwrap_err()
                .unwrap(),
            ProvenanceError::CertificateNotFound
        );
    }

    // --- Issue #173 --- Certificate Metadata Updates

    #[test]
    fn test_update_metadata() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let id = client.mint(
            &s(&env, "sid"),
            &s(&env, "mhash2"),
            &s(&env, "ahash"),
            &owner,
        );
        assert!(client
            .update_metadata(&id, &s(&env, "Display Name"), &s(&env, "Description"))
            .is_ok());

        let metadata = client.get_metadata(&id).unwrap();
        assert_eq!(metadata.display_name, s(&env, "Display Name"));
        assert_eq!(metadata.description, s(&env, "Description"));
        assert_eq!(metadata.version, 1);
    }

    #[test]
    fn test_update_metadata_multiple_times() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let id = client.mint(
            &s(&env, "sid"),
            &s(&env, "mhash3"),
            &s(&env, "ahash"),
            &owner,
        );

        client
            .update_metadata(&id, &s(&env, "v1"), &s(&env, "desc1"))
            .ok();
        client
            .update_metadata(&id, &s(&env, "v2"), &s(&env, "desc2"))
            .ok();

        let metadata = client.get_metadata(&id).unwrap();
        assert_eq!(metadata.version, 2);
        assert_eq!(metadata.display_name, s(&env, "v2"));
    }

    #[test]
    fn test_update_nonexistent_certificate_metadata() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        assert_eq!(
            client
                .try_update_metadata(&999u64, &s(&env, "name"), &s(&env, "desc"))
                .unwrap_err()
                .unwrap(),
            ProvenanceError::CertificateNotFound
        );
    }

    // --- Issue #174 --- Query by Time Range

    #[test]
    fn test_get_certificates_by_time_range() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        client.mint(
            &s(&env, "sid"),
            &s(&env, "mhash4"),
            &s(&env, "ahash"),
            &owner,
        );
        client.mint(
            &s(&env, "sid"),
            &s(&env, "mhash5"),
            &s(&env, "ahash"),
            &owner,
        );

        let current_time = env.ledger().timestamp();
        let results = client.get_certificates_by_time_range(&0, &(current_time + 1000), &0, &10);

        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_get_certificates_by_time_range_pagination() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        client.mint(
            &s(&env, "sid"),
            &s(&env, "mhash6"),
            &s(&env, "ahash"),
            &owner,
        );
        client.mint(
            &s(&env, "sid"),
            &s(&env, "mhash7"),
            &s(&env, "ahash"),
            &owner,
        );
        client.mint(
            &s(&env, "sid"),
            &s(&env, "mhash8"),
            &s(&env, "ahash"),
            &owner,
        );

        let current_time = env.ledger().timestamp();

        let page1 = client.get_certificates_by_time_range(&0, &(current_time + 1000), &0, &2);
        assert_eq!(page1.len(), 2);

        let page2 = client.get_certificates_by_time_range(&0, &(current_time + 1000), &2, &2);
        assert_eq!(page2.len(), 1);
    }

    // --- Issue #175 --- Batch Minting

    #[test]
    fn test_mint_batch() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let storage_refs =
            soroban_sdk::vec![&env, s(&env, "sid1"), s(&env, "sid2"), s(&env, "sid3")];
        let manifest_hashes = soroban_sdk::vec![
            &env,
            s(&env, "mhash9"),
            s(&env, "mhash10"),
            s(&env, "mhash11")
        ];
        let attestation_hashes =
            soroban_sdk::vec![&env, s(&env, "ah1"), s(&env, "ah2"), s(&env, "ah3")];

        let ids = client
            .mint_batch(&storage_refs, &manifest_hashes, &attestation_hashes, &owner)
            .unwrap();

        assert_eq!(ids.len(), 3);
        assert_eq!(ids.get_unchecked(0), 1);
        assert_eq!(ids.get_unchecked(1), 2);
        assert_eq!(ids.get_unchecked(2), 3);
    }

    #[test]
    fn test_mint_batch_exceed_max_size() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let mut storage_refs = soroban_sdk::vec![&env];
        let mut manifest_hashes = soroban_sdk::vec![&env];
        let mut attestation_hashes = soroban_sdk::vec![&env];

        for i in 0..51 {
            storage_refs.push_back(s(&env, &format!("sid{}", i)));
            manifest_hashes.push_back(s(&env, &format!("mhash{}", i)));
            attestation_hashes.push_back(s(&env, &format!("ah{}", i)));
        }

        let result =
            client.try_mint_batch(&storage_refs, &manifest_hashes, &attestation_hashes, &owner);
        assert_eq!(
            result.unwrap_err().unwrap(),
            ProvenanceError::BatchSizeExceeded
        );
    }

    #[test]
    fn test_mint_batch_prevent_duplicates() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, ProvenanceContract);
        let client = ProvenanceContractClient::new(&env, &cid);
        let oracle = soroban_sdk::Address::generate(&env);
        let owner = soroban_sdk::Address::generate(&env);
        client.initialize(&oracle);

        let storage_refs = soroban_sdk::vec![&env, s(&env, "sid1"), s(&env, "sid2")];
        let manifest_hashes = soroban_sdk::vec![&env, s(&env, "duplicate"), s(&env, "duplicate")];
        let attestation_hashes = soroban_sdk::vec![&env, s(&env, "ah1"), s(&env, "ah2")];

        let result =
            client.try_mint_batch(&storage_refs, &manifest_hashes, &attestation_hashes, &owner);
        assert_eq!(
            result.unwrap_err().unwrap(),
            ProvenanceError::DuplicateCertificate
        );
    }
}
