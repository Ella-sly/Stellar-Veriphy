/**
 * Browser-compatible cryptographic utilities using the Web Crypto API.
 * Falls back to Node.js `crypto` when `crypto.subtle` is unavailable (e.g. Jest / Node tests).
 */

// ---------------------------------------------------------------------------
// Hex helpers
// ---------------------------------------------------------------------------

/**
 * Convert a lowercase hex string to a Uint8Array.
 * Throws if the string has an odd length or contains non-hex characters.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error(`Invalid hex string: odd length (${hex.length})`);
  }
  if (hex.length > 0 && !/^[a-fA-F0-9]+$/.test(hex)) {
    throw new Error("Invalid hex string: contains non-hex characters");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert a Uint8Array to a lowercase hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Manifest hashing
// ---------------------------------------------------------------------------

/**
 * JSON-stringify a manifest object and return its SHA-256 hex digest.
 *
 * Uses `crypto.subtle` in the browser and falls back to Node.js `crypto`
 * in test / server environments where `crypto.subtle` is unavailable.
 *
 * @param manifest  Any serialisable object (typically a `ContentManifest`).
 * @returns         Lowercase hex-encoded SHA-256 digest of the JSON string.
 */
export async function hashManifest(manifest: object): Promise<string> {
  const json = JSON.stringify(manifest);

  // --- Browser path ---
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoded = new TextEncoder().encode(json);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return bytesToHex(new Uint8Array(digest));
  }

  // --- Node.js fallback (Jest / server-side) ---
  const { createHash } = await import("crypto");
  return createHash("sha256").update(json, "utf8").digest("hex");
}
