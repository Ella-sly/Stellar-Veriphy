# Verification Workflow Tutorial Transcript

Length target: 10 minutes

## Outline

1. Explain the content verification model.
2. Show how a manifest is prepared.
3. Walk through the intended upload and verification flow.
4. Explain the oracle and registry roles.
5. Show how a certificate is read back.

## Transcript

This tutorial walks through the verification workflow StellarVeriphy is built
to support.

The workflow starts with a piece of content and a manifest. The manifest
describes the media, the creator, and the metadata that should be bound to the
file hash. That combination is what eventually becomes a provenance record.

The next step is upload. In the target flow, the media bytes are stored in the
configured backend and the system returns a storage reference.

Then the request moves into verification. The oracle contract coordinates the
request lifecycle, while the registry contract confirms that the TEE hash and
provider are trusted.

Once attestation succeeds, the provenance contract mints the on-chain
certificate. That certificate contains the storage reference, the manifest
hash, the attestation hash, and the creator address.

To read it back, query the provenance contract with the certificate ID. The
contract returns the certificate data directly, which is what makes the record
auditable by anyone later.

If verification fails, check the contract error reference in the docs. It
separates oracle, registry, and provenance failures so troubleshooting is much
faster.

