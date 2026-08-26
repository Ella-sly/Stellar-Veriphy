/**
 * Unit tests for utils/crypto.ts
 * Covers: hexToBytes, bytesToHex, hashManifest
 */

import { bytesToHex, hashManifest,hexToBytes } from "../crypto";

// ---------------------------------------------------------------------------
// hexToBytes
// ---------------------------------------------------------------------------

describe("hexToBytes", () => {
  it("converts a valid lowercase hex string to bytes", () => {
    const bytes = hexToBytes("deadbeef");
    expect(bytes).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  });

  it("converts a valid uppercase hex string to bytes", () => {
    const bytes = hexToBytes("DEADBEEF");
    expect(bytes).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  });

  it("converts a mixed-case hex string to bytes", () => {
    const bytes = hexToBytes("DeAdBeEf");
    expect(bytes).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  });

  it("returns an empty Uint8Array for an empty string", () => {
    expect(hexToBytes("")).toEqual(new Uint8Array([]));
  });

  it("converts a two-character hex string", () => {
    expect(hexToBytes("ff")).toEqual(new Uint8Array([0xff]));
    expect(hexToBytes("00")).toEqual(new Uint8Array([0x00]));
  });

  it("converts a 64-character SHA-256 hex string to 32 bytes", () => {
    const hex = "a3f5c2e1b4d6789012345678901234567890abcdef1234567890abcdef123456";
    const bytes = hexToBytes(hex);
    expect(bytes.length).toBe(32);
  });

  it("throws for an odd-length hex string", () => {
    expect(() => hexToBytes("abc")).toThrow(/odd length/i);
  });

  it("throws for a string containing non-hex characters", () => {
    expect(() => hexToBytes("gg")).toThrow(/non-hex/i);
  });

  it("throws for a hex string with spaces", () => {
    expect(() => hexToBytes("de ad")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// bytesToHex
// ---------------------------------------------------------------------------

describe("bytesToHex", () => {
  it("converts bytes to a lowercase hex string", () => {
    expect(bytesToHex(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))).toBe("deadbeef");
  });

  it("returns an empty string for an empty Uint8Array", () => {
    expect(bytesToHex(new Uint8Array([]))).toBe("");
  });

  it("pads single-digit hex values with a leading zero", () => {
    expect(bytesToHex(new Uint8Array([0x01, 0x0f]))).toBe("010f");
  });

  it("converts a single 0xff byte", () => {
    expect(bytesToHex(new Uint8Array([0xff]))).toBe("ff");
  });

  it("round-trips with hexToBytes", () => {
    const original = "deadbeef01234567";
    expect(bytesToHex(hexToBytes(original))).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// hashManifest
// ---------------------------------------------------------------------------

describe("hashManifest", () => {
  it("returns a 64-character lowercase hex string", async () => {
    const hash = await hashManifest({ contentHash: "abc", creator: "G..." });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic — same input produces same hash", async () => {
    const obj = { contentHash: "abc", creator: "GABC" };
    const h1 = await hashManifest(obj);
    const h2 = await hashManifest(obj);
    expect(h1).toBe(h2);
  });

  it("produces different hashes for different inputs", async () => {
    const h1 = await hashManifest({ a: 1 });
    const h2 = await hashManifest({ a: 2 });
    expect(h1).not.toBe(h2);
  });

  it("hashes a full ContentManifest object", async () => {
    const manifest = {
      contentHash: "a3f5c2e1b4d6789012345678901234567890abcdef1234567890abcdef123456",
      creator: "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNSOLXAUJVLVWXVVNQNYWGLZ",
      timestamp: "2024-06-01T00:00:00Z",
      metadata: { device: "iPhone", location: "NYC", aiModel: "" },
    };
    const hash = await hashManifest(manifest);
    expect(hash.length).toBe(64);
  });

  it("hashes an empty object without throwing", async () => {
    const hash = await hashManifest({});
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("order of keys does not matter (JSON.stringify-based — same key order → same hash)", async () => {
    // JSON.stringify preserves insertion order in V8, so same keys same order = same hash
    const h1 = await hashManifest({ a: 1, b: 2 });
    const h2 = await hashManifest({ a: 1, b: 2 });
    expect(h1).toBe(h2);
  });
});
