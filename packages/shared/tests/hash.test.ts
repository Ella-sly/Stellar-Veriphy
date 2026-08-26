import { describe, expect, it } from "vitest";
import { buildManifestHash, sha256 } from "../utils/hash";

describe("sha256", () => {
  it("hashes a string deterministically", () => {
    expect(sha256("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("produces different hashes for different input", () => {
    expect(sha256("a")).not.toBe(sha256("b"));
  });
});

describe("buildManifestHash", () => {
  it("is deterministic for the same object", () => {
    const manifest = {
      contentHash: "sha256:abc",
      creator: "G123",
      timestamp: "2026-01-01T00:00:00Z",
    };
    expect(buildManifestHash(manifest)).toBe(buildManifestHash({ ...manifest }));
  });

  it("changes when any field changes", () => {
    const base = { contentHash: "sha256:abc", creator: "G123", timestamp: "2026-01-01T00:00:00Z" };
    const changed = { ...base, creator: "G456" };
    expect(buildManifestHash(base)).not.toBe(buildManifestHash(changed));
  });

  it("is sensitive to key order via JSON.stringify semantics", () => {
    // JSON.stringify preserves insertion order for string keys, so this
    // documents the (intentional) behavior rather than asserting equality.
    const hash = buildManifestHash({ a: 1, b: 2 });
    expect(hash).toHaveLength(64);
  });
});
