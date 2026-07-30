/**
 * Test suite for frontend/utils/validation.ts
 *
 * Achieves 100% branch coverage for every exported function:
 *   isValidSHA256, validateSHA256,
 *   isValidStellarAddress,
 *   isValidAmount, isValidAssetCode
 */

import {
  isValidSHA256,
  validateSHA256,
  isValidStellarAddress,
  isValidAmount,
  isValidAssetCode,
} from "../../../utils/validation";

// ─────────────────────────────────────────────────────────────────────────────
// isValidSHA256
// ─────────────────────────────────────────────────────────────────────────────

describe("isValidSHA256", () => {
  const VALID_HASH =
    "a3f5c2e1b4d6789012345678901234567890abcdef1234567890abcdef123456";

  it("returns true for a valid 64-character lowercase hex string", () => {
    expect(isValidSHA256(VALID_HASH)).toBe(true);
  });

  it("returns true for a valid 64-character uppercase hex string", () => {
    expect(isValidSHA256(VALID_HASH.toUpperCase())).toBe(true);
  });

  it("returns true for a mixed-case valid hex string", () => {
    const mixed =
      "A3F5C2E1b4d6789012345678901234567890ABCDEF1234567890abcdef123456";
    expect(isValidSHA256(mixed)).toBe(true);
  });

  it("returns false for a hash that is too short (63 chars)", () => {
    expect(isValidSHA256(VALID_HASH.slice(0, 63))).toBe(false);
  });

  it("returns false for a hash that is too long (65 chars)", () => {
    expect(isValidSHA256(VALID_HASH + "0")).toBe(false);
  });

  it("returns false when the string contains non-hex characters", () => {
    const withNonHex =
      "g3f5c2e1b4d6789012345678901234567890abcdef1234567890abcdef123456";
    expect(isValidSHA256(withNonHex)).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidSHA256("")).toBe(false);
  });

  // TypeScript callers can pass null via `as unknown as string`; the regex
  // coerces it to the string "null" which is not 64 hex chars.
  it("returns false for null coerced to string", () => {
    expect(isValidSHA256(null as unknown as string)).toBe(false);
  });

  it("returns false for a string of spaces", () => {
    expect(isValidSHA256("   ")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateSHA256
// ─────────────────────────────────────────────────────────────────────────────

describe("validateSHA256", () => {
  const VALID_HASH =
    "a3f5c2e1b4d6789012345678901234567890abcdef1234567890abcdef123456";

  it("returns null for a valid SHA-256 hash", () => {
    expect(validateSHA256(VALID_HASH)).toBeNull();
  });

  it('returns "Hash is required." for an empty string', () => {
    expect(validateSHA256("")).toBe("Hash is required.");
  });

  it('returns "Hash is required." for a whitespace-only string', () => {
    expect(validateSHA256("   ")).toBe("Hash is required.");
  });

  it("returns a length error message for a hash that is too short", () => {
    const short = VALID_HASH.slice(0, 32); // 32 chars
    const result = validateSHA256(short);
    expect(result).toMatch(/exactly 64 hex characters/);
    expect(result).toContain("32");
  });

  it("returns a length error message for a hash that is too long", () => {
    const long = VALID_HASH + "00"; // 66 chars
    const result = validateSHA256(long);
    expect(result).toMatch(/exactly 64 hex characters/);
    expect(result).toContain("66");
  });

  it("returns a non-hex error message when the 64-char string has invalid chars", () => {
    // Replace first char with 'z' — still 64 chars but not valid hex
    const nonHex = "z" + VALID_HASH.slice(1);
    const result = validateSHA256(nonHex);
    expect(result).toMatch(/hexadecimal characters/);
  });

  it("returns a length error (not a hex error) when the string is short AND has non-hex chars", () => {
    // Length check fires before the hex check
    const result = validateSHA256("zzzz");
    expect(result).toMatch(/exactly 64 hex characters/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isValidStellarAddress
// ─────────────────────────────────────────────────────────────────────────────

describe("isValidStellarAddress", () => {
  // A real-looking Stellar testnet address (56 chars, starts with G, base-32)
  const VALID_ADDRESS = "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNSOLXAUJVLVWXVVNQNYWGLZ";

  it("returns true for a valid G-address (56 chars, base-32)", () => {
    expect(isValidStellarAddress(VALID_ADDRESS)).toBe(true);
  });

  it("returns false for an address with the wrong prefix (starts with S)", () => {
    const sAddress = "S" + VALID_ADDRESS.slice(1);
    expect(isValidStellarAddress(sAddress)).toBe(false);
  });

  it("returns false for an address with the wrong prefix (starts with A)", () => {
    const aAddress = "A" + VALID_ADDRESS.slice(1);
    expect(isValidStellarAddress(aAddress)).toBe(false);
  });

  it("returns false for an address that is too short (55 chars)", () => {
    expect(isValidStellarAddress(VALID_ADDRESS.slice(0, 55))).toBe(false);
  });

  it("returns false for an address that is too long (57 chars)", () => {
    expect(isValidStellarAddress(VALID_ADDRESS + "A")).toBe(false);
  });

  it("returns false when the address contains lowercase letters", () => {
    const lower = VALID_ADDRESS.toLowerCase();
    expect(isValidStellarAddress(lower)).toBe(false);
  });

  it("returns false when the address contains digits outside base-32 (8, 9)", () => {
    // Replace a character with '8' which is not in Stellar's base-32 alphabet
    const invalid = VALID_ADDRESS.slice(0, 10) + "8" + VALID_ADDRESS.slice(11);
    expect(isValidStellarAddress(invalid)).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidStellarAddress("")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isValidAmount
// ─────────────────────────────────────────────────────────────────────────────

describe("isValidAmount", () => {
  it("returns true for a positive integer string", () => {
    expect(isValidAmount("100")).toBe(true);
  });

  it("returns true for a positive decimal string", () => {
    expect(isValidAmount("3.14")).toBe(true);
  });

  it("returns true for a positive number (numeric type)", () => {
    expect(isValidAmount(42)).toBe(true);
  });

  it("returns true for a decimal number (numeric type)", () => {
    expect(isValidAmount(0.001)).toBe(true);
  });

  it("returns false for zero as a string", () => {
    expect(isValidAmount("0")).toBe(false);
  });

  it("returns false for zero as a number", () => {
    expect(isValidAmount(0)).toBe(false);
  });

  it("returns false for a negative string", () => {
    expect(isValidAmount("-5")).toBe(false);
  });

  it("returns false for a negative number", () => {
    expect(isValidAmount(-1)).toBe(false);
  });

  it("returns false for a non-numeric string", () => {
    expect(isValidAmount("abc")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidAmount("")).toBe(false);
  });

  it("returns false for NaN", () => {
    expect(isValidAmount(NaN)).toBe(false);
  });

  it("returns false for Infinity", () => {
    expect(isValidAmount(Infinity)).toBe(false);
  });

  it("returns false for a string with leading/trailing spaces", () => {
    // " 5 " — the regex test on the trimmed string should still pass,
    // but the raw String(amount) includes spaces which fail /^\d+(\.\d+)?$/
    expect(isValidAmount(" 5 ")).toBe(false);
  });

  it("returns false for a string with multiple decimal points", () => {
    expect(isValidAmount("1.2.3")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isValidAssetCode
// ─────────────────────────────────────────────────────────────────────────────

describe("isValidAssetCode", () => {
  it("returns true for a single-character code", () => {
    expect(isValidAssetCode("X")).toBe(true);
  });

  it("returns true for a standard 3-character code (e.g. XLM)", () => {
    expect(isValidAssetCode("XLM")).toBe(true);
  });

  it("returns true for a 4-character code (e.g. USDC)", () => {
    expect(isValidAssetCode("USDC")).toBe(true);
  });

  it("returns true for a 12-character alphanumeric code (maximum length)", () => {
    expect(isValidAssetCode("ABCDEFGHIJ12")).toBe(true);
  });

  it("returns true for a code with digits", () => {
    expect(isValidAssetCode("TOKEN1")).toBe(true);
  });

  it("returns false for an empty string", () => {
    expect(isValidAssetCode("")).toBe(false);
  });

  it("returns false for a code longer than 12 characters", () => {
    expect(isValidAssetCode("TOOLONGASSET1")).toBe(false); // 13 chars
  });

  it("returns false for a code with a hyphen", () => {
    expect(isValidAssetCode("MY-TOKEN")).toBe(false);
  });

  it("returns false for a code with a space", () => {
    expect(isValidAssetCode("MY TOKEN")).toBe(false);
  });

  it("returns false for a code with special characters", () => {
    expect(isValidAssetCode("TOKEN!")).toBe(false);
  });
});
