export interface ContentManifest {
  schemaVersion?: string;    // semantic version string (e.g. 1.0.0, 2.0.0)
  contentHash: string;       // sha256 of the media file
  creator: string;           // Stellar public key (G...)
  timestamp: string;         // ISO 8601
  metadata?: {
    device?: string;
    location?: string;
    aiModel?: string;
  };
  media?: {
    fileName?: string;
    fileType?: string;
    fileSizeBytes?: number;
  };
}

export interface ProvenanceCert {
  id: string;
  storageRef: string;
  manifestHash: string;
  attestationHash: string;
  creator: string;
  timestamp: number;
}

export type VerificationStatus = "pending" | "processing" | "certified" | "failed";

// ---------------------------------------------------------------------------
// Verification mode
// ---------------------------------------------------------------------------

/** Which verification path the user has chosen. */
export type VerificationMode = "standard" | "advanced";

// ---------------------------------------------------------------------------
// Wallet connection status
// ---------------------------------------------------------------------------

/** Current state of the Freighter wallet connection. */
export type WalletConnectionStatus = "disconnected" | "connecting" | "connected";

// ---------------------------------------------------------------------------
// CertificateDetails — mirrors the on-chain ProvenanceCert struct
// ---------------------------------------------------------------------------

/**
 * Frontend representation of a minted provenance certificate.
 * Field names are camelCase equivalents of the Soroban `ProvenanceCert` struct.
 */
export interface CertificateDetails {
  /** Auto-incrementing on-chain certificate identifier (u64 on-chain). */
  id: string;
  /** IPFS / Arweave storage reference for the original media file. */
  storageRef: string;
  /** SHA-256 hex digest of the manifest JSON. */
  manifestHash: string;
  /** SHA-256 hex digest of the TEE attestation payload. */
  attestationHash: string;
  /** Stellar public key of the content creator. */
  creator: string;
  /** Ledger timestamp (seconds since Unix epoch) at the time of minting. */
  timestamp: number;
}

// ---------------------------------------------------------------------------
// VerificationJob
// ---------------------------------------------------------------------------

/** Lifecycle status of a verification job submitted to the Oracle contract. */
export type VerificationJobStatus = "pending" | "processing" | "verified" | "rejected" | "failed";

/**
 * Tracks a single verification job from submission through to certificate
 * issuance (or failure).
 */
export interface VerificationJob {
  /** Unique job identifier returned by the Oracle `submit_request` call. */
  jobId: string;
  /** Current lifecycle status of the job. */
  status: VerificationJobStatus;
  /** SHA-256 hex digest of the media content being verified. */
  contentHash: string;
  /** SHA-256 hex digest of the attached manifest JSON. */
  manifestHash: string;
  /** On-chain certificate ID, populated once the job reaches `verified` status. */
  certificateId?: string;
}

// ---------------------------------------------------------------------------
// ApiResponse — generic wrapper for all API / service responses
// ---------------------------------------------------------------------------

/**
 * Generic wrapper returned by service functions and API routes.
 *
 * On success: `{ success: true, data: T }`
 * On failure: `{ success: false, error: string }`
 */
export type ApiResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

// ---------------------------------------------------------------------------
// SLA tracking  (mirrors oracle ProviderSLA + SLACompliance structs)
// ---------------------------------------------------------------------------

/** SLA targets and rolling actuals for a provider. */
export interface ProviderSLA {
  // Targets
  targetResponseTimeSeconds: number;
  targetUptimePercentage: number;
  targetSuccessRate: number;
  // Actuals
  actualResponseTime: number;
  actualUptime: number;
  actualSuccessRate: number;
  // Internal counters
  totalRequests: number;
  successful: number;
  totalResponseSum: number;
}

/** Per-metric compliance result, including the overall compliance percentage. */
export interface SLACompliance {
  responseTimeOk: boolean;
  uptimeOk: boolean;
  successRateOk: boolean;
  /** Fraction of met targets expressed as a value in [0, 100]. */
  compliancePercent: number;
  suspended: boolean;
}

// ---------------------------------------------------------------------------
// Cost estimation  (mirrors oracle CostEstimate + ProviderPricing structs)
// ---------------------------------------------------------------------------

export type PriorityLevel = "low" | "normal" | "high" | "urgent";
export type ContentComplexity = "simple" | "moderate" | "complex";

/** Pricing configuration for a provider (amounts in stroops). */
export interface ProviderPricing {
  baseFeeStroops: number;
  perKbFeeStroops: number;
}

/** Itemised cost breakdown returned by the oracle estimate_cost function. */
export interface CostEstimate {
  baseFee: number;
  sizeFee: number;
  priorityFee: number;
  complexityFee: number;
  total: number;
}

// ---------------------------------------------------------------------------
// TEE hash certificate references  (mirrors registry TeeHashCertRef struct)
// ---------------------------------------------------------------------------

/** Attestation certificate metadata attached to an approved TEE code hash. */
export interface TeeHashCertRef {
  /** Human-readable identifier or fingerprint for the certificate issuer. */
  issuer: string;
  /** Unix timestamp from which the certificate is valid (seconds). */
  validFrom: number;
  /** Unix timestamp at which the certificate expires (seconds). */
  validUntil: number;
  /** Optional URI pointing to the full DER/PEM certificate (e.g. IPFS). */
  certUri?: string;
  /** The TEE code hash covered by this certificate (hex string). */
  codeHash: string;
}

/** Result of querying a TEE hash together with its certificate reference. */
export interface TeeHashWithCert {
  approved: boolean;
  certRef?: TeeHashCertRef;
}
