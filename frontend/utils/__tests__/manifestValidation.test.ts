/**
 * Test suite for manifest validation and sanitization
 */

import {
  validateManifest,
  escapeHtml,
  containsScriptOrHtml,
  validateAndSanitizeField,
  sanitizeManifest,
} from "../../../utils/manifestValidation";

// ─────────────────────────────────────────────────────────────────────────────
// escapeHtml
// ─────────────────────────────────────────────────────────────────────────────

describe("escapeHtml", () => {
  it("escapes less-than and greater-than characters", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes ampersand", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("returns the string unchanged if no escaping needed", () => {
    expect(escapeHtml("normal text")).toBe("normal text");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// containsScriptOrHtml
// ─────────────────────────────────────────────────────────────────────────────

describe("containsScriptOrHtml", () => {
  it("returns true for script tags", () => {
    expect(containsScriptOrHtml("<script>alert('xss')</script>")).toBe(true);
  });

  it("returns true for script tags with attributes", () => {
    expect(containsScriptOrHtml('<script src="evil.js"></script>')).toBe(true);
  });

  it("returns true for HTML opening tags", () => {
    expect(containsScriptOrHtml("<div>content</div>")).toBe(true);
  });

  it("returns true for HTML self-closing tags", () => {
    expect(containsScriptOrHtml("<img src=x onerror=alert(1)>")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(containsScriptOrHtml("plain text")).toBe(false);
  });

  it("returns true for text with special chars but no HTML", () => {
    expect(containsScriptOrHtml("a < b and c > d")).toBe(true);
  });

  it("returns false for normal device/location strings", () => {
    expect(containsScriptOrHtml("iPhone 15 Pro")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateAndSanitizeField
// ─────────────────────────────────────────────────────────────────────────────

describe("validateAndSanitizeField", () => {
  it("returns null for valid short strings", () => {
    expect(validateAndSanitizeField("valid value", "field")).toBeNull();
  });

  it("returns an error for strings exceeding max length", () => {
    const longString = "a".repeat(257);
    const result = validateAndSanitizeField(longString, "field");
    expect(result).toContain("must be at most 256 characters");
  });

  it("returns an error for strings containing HTML", () => {
    const result = validateAndSanitizeField("<b>bold</b>", "field");
    expect(result).toContain("disallowed HTML or script content");
  });

  it("returns an error for strings containing script tags", () => {
    const result = validateAndSanitizeField("<script>alert(1)</script>", "field");
    expect(result).toContain("disallowed HTML or script content");
  });

  it("accepts strings at exactly 256 characters", () => {
    const exactLength = "a".repeat(256);
    expect(validateAndSanitizeField(exactLength, "field")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeManifest
// ─────────────────────────────────────────────────────────────────────────────

describe("sanitizeManifest", () => {
  it("escapes HTML in contentHash", () => {
    const result = sanitizeManifest({
      contentHash: "<hash>",
      creator: "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNSOLXAUJVLVWXVVNQNYWGLZ",
      timestamp: "2024-01-15T10:30:00Z",
    });
    expect(result.contentHash).toBe("&lt;hash&gt;");
  });

  it("escapes HTML in creator", () => {
    const result = sanitizeManifest({
      contentHash: "a3f5c2e1b4d6789012345678901234567890abcdef1234567890abcdef123456",
      creator: "<GABCDEF>",
      timestamp: "2024-01-15T10:30:00Z",
    });
    expect(result.creator).toBe("&lt;GABCDEF&gt;");
  });

  it("escapes HTML in metadata.device", () => {
    const result = sanitizeManifest({
      contentHash: "a3f5c2e1b4d6789012345678901234567890abcdef1234567890abcdef123456",
      creator: "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNSOLXAUJVLVWXVVNQNYWGLZ",
      timestamp: "2024-01-15T10:30:00Z",
      metadata: { device: "<iPhone>" },
    });
    expect(result.metadata.device).toBe("&lt;iPhone&gt;");
  });

  it("escapes HTML in metadata.location", () => {
    const result = sanitizeManifest({
      contentHash: "a3f5c2e1b4d6789012345678901234567890abcdef1234567890abcdef123456",
      creator: "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNSOLXAUJVLVWXVVNQNYWGLZ",
      timestamp: "2024-01-15T10:30:00Z",
      metadata: { location: "<New York>" },
    });
    expect(result.metadata.location).toBe("&lt;New York&gt;");
  });

  it("escapes HTML in metadata.aiModel", () => {
    const result = sanitizeManifest({
      contentHash: "a3f5c2e1b4d6789012345678901234567890abcdef1234567890abcdef123456",
      creator: "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNSOLXAUJVLVWXVVNQNYWGLZ",
      timestamp: "2024-01-15T10:30:00Z",
      metadata: { aiModel: "<GPT-4>" },
    });
    expect(result.metadata.aiModel).toBe("&lt;GPT-4&gt;");
  });

  it("handles undefined metadata gracefully", () => {
    const result = sanitizeManifest({
      contentHash: "a3f5c2e1b4d6789012345678901234567890abcdef1234567890abcdef123456",
      creator: "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNSOLXAUJVLVWXVVNQNYWGLZ",
      timestamp: "2024-01-15T10:30:00Z",
    });
    expect(result.metadata).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateManifest - XSS prevention tests
// ─────────────────────────────────────────────────────────────────────────────

describe("validateManifest - XSS prevention", () => {
  const VALID_ADDRESS = "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNSOLXAUJVLVWXVVNQNYWGLZ";
  const VALID_HASH = "a3f5c2e1b4d6789012345678901234567890abcdef1234567890abcdef123456";

  it("rejects manifest with script tag in device field", () => {
    const result = validateManifest({
      contentHash: VALID_HASH,
      creator: VALID_ADDRESS,
      timestamp: "2024-01-15T10:30:00Z",
      metadata: { device: "<script>alert('xss')</script>" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("metadata.device contains disallowed HTML or script content.");
  });

  it("rejects manifest with script tag in location field", () => {
    const result = validateManifest({
      contentHash: VALID_HASH,
      creator: VALID_ADDRESS,
      timestamp: "2024-01-15T10:30:00Z",
      metadata: { location: "<script>steal()</script>" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("metadata.location contains disallowed HTML or script content.");
  });

  it("rejects manifest with HTML in aiModel field", () => {
    const result = validateManifest({
      contentHash: VALID_HASH,
      creator: VALID_ADDRESS,
      timestamp: "2024-01-15T10:30:00Z",
      metadata: { aiModel: "<img src=x onerror=alert(1)>" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("metadata.aiModel contains disallowed HTML or script content.");
  });

  it("rejects manifest with device field exceeding max length", () => {
    const longDevice = "a".repeat(257);
    const result = validateManifest({
      contentHash: VALID_HASH,
      creator: VALID_ADDRESS,
      timestamp: "2024-01-15T10:30:00Z",
      metadata: { device: longDevice },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("metadata.device must be at most 256 characters.");
  });

  it("rejects manifest with location field exceeding max length", () => {
    const longLocation = "b".repeat(257);
    const result = validateManifest({
      contentHash: VALID_HASH,
      creator: VALID_ADDRESS,
      timestamp: "2024-01-15T10:30:00Z",
      metadata: { location: longLocation },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("metadata.location must be at most 256 characters.");
  });

  it("rejects manifest with aiModel field exceeding max length", () => {
    const longAiModel = "c".repeat(257);
    const result = validateManifest({
      contentHash: VALID_HASH,
      creator: VALID_ADDRESS,
      timestamp: "2024-01-15T10:30:00Z",
      metadata: { aiModel: longAiModel },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("metadata.aiModel must be at most 256 characters.");
  });

  it("accepts manifest with valid metadata within limits", () => {
    const result = validateManifest({
      contentHash: VALID_HASH,
      creator: VALID_ADDRESS,
      timestamp: "2024-01-15T10:30:00Z",
      metadata: {
        device: "iPhone 15 Pro",
        location: "New York, USA",
        aiModel: "GPT-4",
      },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});