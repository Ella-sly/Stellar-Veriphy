import {
  validateAddressFormat,
  validateFileSize,
  validateFileType,
  validateHashFormat,
  validateVerificationRequest,
} from "@/lib/security/inputValidation";

const VALID_HASH = "a3f5c2e1b4d6789012345678901234567890abcdef1234567890abcdef123456";
const VALID_ADDRESS = "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNSOLXAUJVLVWXVVNQNYWGLZ";

describe("inputValidation", () => {
  it("validates supported file type/size/hash/address", () => {
    expect(validateFileType("image/png")).toBe(true);
    expect(validateFileSize(1024)).toBe(true);
    expect(validateHashFormat(VALID_HASH)).toBe(true);
    expect(validateAddressFormat(VALID_ADDRESS)).toBe(true);
  });

  it("rejects malformed verification request payload", () => {
    const result = validateVerificationRequest({
      address: "not-valid",
      contentHash: "bad-hash",
      fileName: "",
      fileType: "application/x-msdownload",
      fileSizeBytes: -1,
      manifest: {},
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("accepts valid request and returns sanitized payload", () => {
    const result = validateVerificationRequest({
      address: VALID_ADDRESS,
      contentHash: VALID_HASH,
      fileName: "test-image.png",
      fileType: "image/png",
      fileSizeBytes: 2048,
      manifest: {
        schemaVersion: "2.0.0",
        contentHash: VALID_HASH,
        creator: VALID_ADDRESS,
        timestamp: "2024-01-15T10:30:00Z",
      },
    });

    expect(result.valid).toBe(true);
    expect(result.sanitized).toBeDefined();
    expect(result.sanitized?.fileType).toBe("image/png");
  });
});
