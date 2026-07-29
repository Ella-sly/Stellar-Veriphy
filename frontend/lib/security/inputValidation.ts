import { isValidSHA256, isValidStellarAddress } from "@/utils/validation";
import { sanitizeManifest, validateManifest } from "@/utils/manifestValidation";

const MAX_REQUEST_BYTES = Number(process.env.MAX_VERIFICATION_FILE_SIZE_BYTES ?? 100 * 1024 * 1024);
const DEFAULT_ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
];

export interface VerificationRequestPayload {
  address: string;
  contentHash: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  manifest: unknown;
}

export interface ValidationResult<T> {
  valid: boolean;
  errors: string[];
  sanitized?: T;
}

export function sanitizeUserString(value: string): string {
  return value
    .trim()
    .replace(/[<>"'`]/g, "")
    .replace(/\s+/g, " ");
}

export function validateFileType(fileType: string): boolean {
  const configured = process.env.ALLOWED_VERIFICATION_FILE_TYPES;
  const allowList = (configured ? configured.split(",") : DEFAULT_ALLOWED_FILE_TYPES)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowList.includes(fileType.toLowerCase());
}

export function validateFileSize(fileSizeBytes: number): boolean {
  return Number.isInteger(fileSizeBytes) && fileSizeBytes > 0 && fileSizeBytes <= MAX_REQUEST_BYTES;
}

export function validateAddressFormat(address: string): boolean {
  return isValidStellarAddress(address);
}

export function validateHashFormat(hash: string): boolean {
  return isValidSHA256(hash);
}

export function validateVerificationRequest(payload: unknown): ValidationResult<VerificationRequestPayload> {
  const errors: string[] = [];
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { valid: false, errors: ["Request payload must be an object."] };
  }

  const data = payload as Record<string, unknown>;
  const address = typeof data.address === "string" ? sanitizeUserString(data.address) : "";
  const contentHash = typeof data.contentHash === "string" ? sanitizeUserString(data.contentHash) : "";
  const fileName = typeof data.fileName === "string" ? sanitizeUserString(data.fileName) : "";
  const fileType = typeof data.fileType === "string" ? sanitizeUserString(data.fileType) : "";
  const fileSizeBytes = typeof data.fileSizeBytes === "number" ? data.fileSizeBytes : -1;
  const manifest = data.manifest;

  if (!validateAddressFormat(address)) {
    errors.push("address must be a valid Stellar public key.");
  }

  if (!validateHashFormat(contentHash)) {
    errors.push("contentHash must be a valid SHA-256 hex string.");
  }

  if (!fileName) {
    errors.push("fileName is required.");
  } else if (fileName.length > 128) {
    errors.push("fileName must be at most 128 characters.");
  }

  if (!validateFileType(fileType)) {
    errors.push("fileType is not allowed.");
  }

  if (!validateFileSize(fileSizeBytes)) {
    errors.push(`fileSizeBytes must be a positive integer not greater than ${MAX_REQUEST_BYTES}.`);
  }

  const manifestResult = validateManifest(manifest);
  if (!manifestResult.valid) {
    errors.push(...manifestResult.errors.map((msg) => `manifest: ${msg}`));
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      address,
      contentHash,
      fileName,
      fileType: fileType.toLowerCase(),
      fileSizeBytes,
      manifest: sanitizeManifest(manifest as Parameters<typeof sanitizeManifest>[0]),
    },
  };
}
