# Content Manifest Schema Documentation

This document defines the Stellar Veriphy content manifest contract used by verification services and contract-facing clients.

## Schema Definitions

- `content-manifest.schema.v1.json`: baseline schema for existing manifests.
- `content-manifest.schema.v2.json`: current schema with explicit `schemaVersion` and media metadata.

Both schemas use JSON Schema Draft 2020-12 and set `additionalProperties: false` to reject malformed requests.

## Field Documentation

### Top-level fields

- `schemaVersion` (`string`, optional in v1, required in v2): semantic schema version, e.g. `2.0.0`.
- `contentHash` (`string`, required): SHA-256 hash in 64-char hexadecimal format.
- `creator` (`string`, required): Stellar public key in `G...` base32 format.
- `timestamp` (`string`, required): ISO 8601 UTC timestamp (`date-time` format).
- `metadata` (`object`, optional): descriptive capture metadata.
- `media` (`object`, optional in v2): media validation metadata used for abuse prevention and sanity checks.

### `metadata` fields

- `device` (`string`, optional): capture device; 1-256 chars.
- `location` (`string`, optional): location descriptor; 1-256 chars.
- `aiModel` (`string`, optional): model attribution; 1-256 chars.

### `media` fields (v2)

- `fileName` (`string`, optional): original filename; 1-128 chars.
- `fileType` (`string`, optional): MIME type allowlist:
  - `image/jpeg`, `image/png`, `image/webp`, `image/gif`
  - `video/mp4`, `video/webm`
  - `audio/mpeg`, `audio/wav`
- `fileSizeBytes` (`integer`, optional): must be `1..104857600` (100 MB max).

## Required vs Optional

### v1 (`content-manifest.schema.v1.json`)

- Required: `contentHash`, `creator`, `timestamp`
- Optional: `schemaVersion`, `metadata`

### v2 (`content-manifest.schema.v2.json`)

- Required: `schemaVersion`, `contentHash`, `creator`, `timestamp`
- Optional: `metadata`, `media`

## Validation Rules

- Reject unknown top-level fields and unknown nested fields.
- `contentHash` must match `^[a-fA-F0-9]{64}$`.
- `creator` must match `^G[A-Z2-7]{55}$`.
- `timestamp` must be a valid ISO 8601 date-time.
- String fields are length-limited and sanitized before downstream processing.
- Media type and file size are validated for anti-abuse and malformed payload protection.

## Example Manifests

- v1 example: `examples.manifest.v1.json`
- v2 example: `examples.manifest.v2.json`

## Schema Versioning Guide

- Use semantic versions in `schemaVersion`.
- Backward-compatible changes (adding optional fields) increment **minor** version.
- Breaking changes (new required fields, field removals, stricter constraints) increment **major** version.
- Consumers should:
  1. Read `schemaVersion`.
  2. Validate against matching schema.
  3. Reject unknown/unsupported major versions.

## Migration Guide

### v1 -> v2 (`1.0.0` to `2.0.0`)

1. Add required field: `"schemaVersion": "2.0.0"`.
2. Keep existing `contentHash`, `creator`, `timestamp`, and `metadata` unchanged.
3. Optionally add `media.fileName`, `media.fileType`, `media.fileSizeBytes` for stronger verification service controls.
4. Validate resulting payload against `content-manifest.schema.v2.json`.

### Suggested migration strategy in services

1. Introduce dual-validation period (accept v1 and v2).
2. Emit deprecation warning for v1 payloads.
3. Migrate SDK/UI generators to default to v2.
4. Sunset v1 support after agreed cutover date.
