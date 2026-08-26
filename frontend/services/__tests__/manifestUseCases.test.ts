/**
 * Unit tests for services/manifestUseCases.ts
 * Covers: generateManifest, exportManifestAsJSON, exportManifestAsXML
 */

import { generateManifest, exportManifestAsJSON, exportManifestAsXML } from "../manifestUseCases";

const VALID_HASH = "a3f5c2e1b4d6789012345678901234567890abcdef1234567890abcdef123456";
const VALID_CREATOR = "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNSOLXAUJVLVWXVVNQNYWGLZ";

// ---------------------------------------------------------------------------
// generateManifest
// ---------------------------------------------------------------------------

describe("generateManifest", () => {
  it("returns a manifest with the supplied contentHash and creator", () => {
    const m = generateManifest({ contentHash: VALID_HASH, creator: VALID_CREATOR });
    expect(m.contentHash).toBe(VALID_HASH);
    expect(m.creator).toBe(VALID_CREATOR);
  });

  it("uses the supplied timestamp when provided", () => {
    const ts = "2024-01-15T10:30:00Z";
    const m = generateManifest({ contentHash: VALID_HASH, creator: VALID_CREATOR, timestamp: ts });
    expect(m.timestamp).toBe(ts);
  });

  it("falls back to the current ISO timestamp when timestamp is omitted", () => {
    const before = new Date().toISOString();
    const m = generateManifest({ contentHash: VALID_HASH, creator: VALID_CREATOR });
    const after = new Date().toISOString();
    expect(m.timestamp >= before).toBe(true);
    expect(m.timestamp <= after).toBe(true);
  });

  it("omits the metadata block when no metadata is supplied", () => {
    const m = generateManifest({ contentHash: VALID_HASH, creator: VALID_CREATOR });
    expect(m.metadata).toBeUndefined();
  });

  it("omits the metadata block when all metadata fields are empty strings", () => {
    const m = generateManifest({
      contentHash: VALID_HASH,
      creator: VALID_CREATOR,
      metadata: { device: "", location: "", aiModel: "" },
    });
    expect(m.metadata).toBeUndefined();
  });

  it("includes metadata when at least one field is non-empty", () => {
    const m = generateManifest({
      contentHash: VALID_HASH,
      creator: VALID_CREATOR,
      metadata: { device: "iPhone 15" },
    });
    expect(m.metadata).toBeDefined();
    expect(m.metadata!.device).toBe("iPhone 15");
  });

  it("only includes non-empty metadata fields", () => {
    const m = generateManifest({
      contentHash: VALID_HASH,
      creator: VALID_CREATOR,
      metadata: { device: "Camera", location: "", aiModel: undefined },
    });
    expect(m.metadata!.device).toBe("Camera");
    expect(m.metadata!.location).toBeUndefined();
    expect(m.metadata!.aiModel).toBeUndefined();
  });

  it("includes all three metadata fields when all are non-empty", () => {
    const m = generateManifest({
      contentHash: VALID_HASH,
      creator: VALID_CREATOR,
      metadata: { device: "D", location: "L", aiModel: "A" },
    });
    expect(m.metadata?.device).toBe("D");
    expect(m.metadata?.location).toBe("L");
    expect(m.metadata?.aiModel).toBe("A");
  });
});

// ---------------------------------------------------------------------------
// exportManifestAsJSON
// ---------------------------------------------------------------------------

describe("exportManifestAsJSON", () => {
  const manifest = {
    contentHash: VALID_HASH,
    creator: VALID_CREATOR,
    timestamp: "2024-01-15T10:30:00Z",
  };

  it("returns a string", () => {
    expect(typeof exportManifestAsJSON(manifest)).toBe("string");
  });

  it("returns valid JSON that round-trips", () => {
    const json = exportManifestAsJSON(manifest);
    const parsed = JSON.parse(json);
    expect(parsed.contentHash).toBe(VALID_HASH);
    expect(parsed.creator).toBe(VALID_CREATOR);
  });

  it("uses 2-space indentation", () => {
    const json = exportManifestAsJSON(manifest);
    expect(json).toContain('  "contentHash"');
  });

  it("includes metadata when present", () => {
    const m = { ...manifest, metadata: { device: "iPhone" } };
    const json = exportManifestAsJSON(m);
    expect(json).toContain("device");
    expect(json).toContain("iPhone");
  });
});

// ---------------------------------------------------------------------------
// exportManifestAsXML
// ---------------------------------------------------------------------------

describe("exportManifestAsXML", () => {
  const manifest = {
    contentHash: VALID_HASH,
    creator: VALID_CREATOR,
    timestamp: "2024-01-15T10:30:00Z",
  };

  it("returns a string starting with the XML declaration", () => {
    const xml = exportManifestAsXML(manifest);
    expect(xml.trimStart()).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  it("contains a <manifest> root element", () => {
    const xml = exportManifestAsXML(manifest);
    expect(xml).toContain("<manifest>");
    expect(xml).toContain("</manifest>");
  });

  it("includes all top-level fields as XML elements", () => {
    const xml = exportManifestAsXML(manifest);
    expect(xml).toContain("<contentHash>");
    expect(xml).toContain("<creator>");
    expect(xml).toContain("<timestamp>");
  });

  it("includes metadata elements when present", () => {
    const m = { ...manifest, metadata: { device: "Camera X" } };
    const xml = exportManifestAsXML(m);
    expect(xml).toContain("<metadata>");
    expect(xml).toContain("Camera X");
  });

  it("does not throw for a minimal manifest", () => {
    expect(() =>
      exportManifestAsXML({ contentHash: "abc", creator: "G...", timestamp: "2024" })
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// exportManifestAsJSON
// ---------------------------------------------------------------------------

describe("exportManifestAsJSON", () => {
  const manifest = {
    contentHash: VALID_HASH,
    creator: VALID_CREATOR,
    timestamp: "2024-01-15T10:30:00Z",
  };

  it("returns valid JSON that round-trips", () => {
    const parsed = JSON.parse(exportManifestAsJSON(manifest));
    expect(parsed.contentHash).toBe(VALID_HASH);
    expect(parsed.creator).toBe(VALID_CREATOR);
  });

  it("uses 2-space indentation", () => {
    expect(exportManifestAsJSON(manifest)).toContain('  "contentHash"');
  });

  it("includes metadata when present", () => {
    const json = exportManifestAsJSON({ ...manifest, metadata: { device: "iPhone" } });
    expect(json).toContain("device");
  });
});

// ---------------------------------------------------------------------------
// exportManifestAsXML
// ---------------------------------------------------------------------------

describe("exportManifestAsXML", () => {
  const manifest = {
    contentHash: VALID_HASH,
    creator: VALID_CREATOR,
    timestamp: "2024-01-15T10:30:00Z",
  };

  it("starts with the XML declaration", () => {
    expect(exportManifestAsXML(manifest).trimStart()).toMatch(/^<\?xml/);
  });

  it("contains a <manifest> root element", () => {
    const xml = exportManifestAsXML(manifest);
    expect(xml).toContain("<manifest>");
    expect(xml).toContain("</manifest>");
  });

  it("includes contentHash, creator, and timestamp elements", () => {
    const xml = exportManifestAsXML(manifest);
    expect(xml).toContain("<contentHash>");
    expect(xml).toContain("<creator>");
    expect(xml).toContain("<timestamp>");
  });

  it("includes metadata when present", () => {
    const xml = exportManifestAsXML({ ...manifest, metadata: { device: "Camera X" } });
    expect(xml).toContain("Camera X");
  });
});
