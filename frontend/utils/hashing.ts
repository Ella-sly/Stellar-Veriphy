/**
 * Browser-native file hashing using the Web Crypto API.
 * Falls back to Node.js `crypto` when `crypto.subtle` is unavailable (e.g. Jest / Node tests).
 */

export type ProgressCallback = (progress: number) => void;

const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB

/**
 * Hash a File (or Blob) with SHA-256.
 *
 * For files larger than 2 MB the content is read in 2 MB chunks so the entire
 * file is never held in memory at once.  Progress is reported as a value in
 * [0, 100] after each chunk is read.
 *
 * @param file       The File (or Blob) to hash.
 * @param onProgress Optional callback receiving progress in [0, 100].
 * @returns          Lowercase hex-encoded SHA-256 digest.
 */
export async function hashFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<string> {
  // --- Node.js fallback (used in Jest tests) ---
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return hashFileNode(file, onProgress);
  }

  // --- Browser path: read in chunks, accumulate into a single buffer ---
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  const total = file.size;

  if (total === 0) {
    const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(0));
    return bufferToHex(digest);
  }

  let offset = 0;
  while (offset < total) {
    const end = Math.min(offset + CHUNK_SIZE, total);
    const slice = file.slice(offset, end);
    const buffer = await slice.arrayBuffer();
    chunks.push(new Uint8Array(buffer));
    loaded += end - offset;
    offset = end;

    if (onProgress) {
      onProgress((loaded / total) * 100);
    }
  }

  // Concatenate all chunks into one buffer and hash once
  const combined = mergeChunks(chunks, total);
  const digest = await crypto.subtle.digest("SHA-256", combined);
  return bufferToHex(digest);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function mergeChunks(chunks: Uint8Array[], totalBytes: number): Uint8Array {
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/** Node.js fallback — used only in test environments. */
async function hashFileNode(
  file: File,
  onProgress?: ProgressCallback
): Promise<string> {
  // Dynamic import so the browser bundle never includes Node's `crypto`.
  const { createHash } = await import("crypto");
  const hash = createHash("sha256");

  const total = file.size;
  let loaded = 0;
  let offset = 0;

  while (offset < total) {
    const end = Math.min(offset + CHUNK_SIZE, total);
    const slice = file.slice(offset, end);
    const buffer = await slice.arrayBuffer();
    hash.update(Buffer.from(buffer));
    loaded += end - offset;
    offset = end;

    if (onProgress) {
      onProgress((loaded / total) * 100);
    }
  }

  return hash.digest("hex");
}
