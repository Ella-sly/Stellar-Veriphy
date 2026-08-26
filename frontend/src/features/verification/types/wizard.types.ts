/**
 * Centralised wizard types shared between WizardContext and the Zustand store.
 * Import from here instead of duplicating definitions across files.
 */

// ─── Primitives ──────────────────────────────────────────────────────────────

/** Which verification path the user has chosen. */
export type VerificationMode = "standard" | "advanced";

// ─── Domain objects ──────────────────────────────────────────────────────────

/** Lightweight descriptor for the file the user has selected. */
export interface FileInfo {
  /** Original filename as reported by the browser. */
  name: string;
  /** File size in bytes. */
  size: number;
  /** MIME type string (e.g. "video/mp4"). */
  type: string;
}

/** Parsed manifest payload attached to the content. */
export interface ManifestData {
  /** SHA-256 hex digest of the media file. */
  contentHash?: string;
  /** Stellar public key of the content creator. */
  creator?: string;
  /** ISO 8601 creation timestamp. */
  timestamp?: string;
  /** Optional device / location / AI-model metadata. */
  metadata?: {
    device?: string;
    location?: string;
    aiModel?: string;
  };
  /** Catch-all for any additional manifest fields. */
  [key: string]: unknown;
}

/** Result returned after a Stellar Provenance Verification (SPV) submission. */
export interface SPVResult {
  /** On-chain certificate identifier. */
  certificateId?: string;
  /** SHA-256 hex digest of the manifest. */
  manifestHash?: string;
  /** SHA-256 hex digest of the media content. */
  contentHash?: string;
  /** Hash of the TEE attestation. */
  attestationHash?: string;
  /** Stellar transaction hash. */
  transactionHash?: string;
  /** Whether the verification succeeded. */
  success?: boolean;
}

// ─── Wizard state ─────────────────────────────────────────────────────────────

/**
 * Complete shape of the wizard state used by both the React context and the
 * Zustand store.  Keep the two in sync by importing this interface.
 */
export interface WizardState {
  // ── Step tracking ──────────────────────────────────────────────────────────
  /** Zero-based index of the currently active step. */
  currentStep: number;
  /** Bitmask / array tracking which steps have been completed. */
  completedSteps: boolean[];

  // ── Mode ───────────────────────────────────────────────────────────────────
  /** Verification mode chosen by the user. */
  mode: VerificationMode | null;

  // ── Standard-mode file data ────────────────────────────────────────────────
  /**
   * Serialisable file descriptor (the raw `File` object cannot be persisted to
   * sessionStorage, so we store metadata separately).
   */
  fileInfo: FileInfo | null;
  /** SHA-256 hex digest computed from the uploaded file. */
  contentHash: string;
  /** Progress percentage (0–100) while the hash is being computed. */
  hashProgress: number;

  // ── Advanced-mode manual inputs ────────────────────────────────────────────
  /** Manually entered content hash (advanced mode). */
  advancedContentHash: string;
  /** Manually entered manifest hash (advanced mode). */
  advancedManifestHash: string;

  // ── Manifest ───────────────────────────────────────────────────────────────
  /** Parsed manifest object. */
  manifest: ManifestData | null;
  /** SHA-256 hex digest of the manifest file. */
  manifestHash: string;

  // ── SPV options & results ──────────────────────────────────────────────────
  /** Whether the user has opted in to encrypting the submission. */
  encryptionEnabled: boolean;
  /** Result of the SPV submission. */
  spvResult: SPVResult;
}
