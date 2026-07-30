import { beforeEach, describe, expect, it } from "vitest";
import {
  AI_MODEL_OPTIONS,
  DEVICE_OPTIONS,
  certificateDetailsFactory,
  contentManifestFactory,
  fakeStellarPublicKey,
  provenanceCertFactory,
  seedFactories,
  verificationJobFactory,
  verificationStatusFactory,
} from "../factories";
import { buildManifestHash } from "../utils/hash";

describe("fakeStellarPublicKey", () => {
  it("looks like a Stellar public key", () => {
    const key = fakeStellarPublicKey();
    expect(key).toMatch(/^G[A-Z2-7]{55}$/);
  });
});

describe("contentManifestFactory", () => {
  it("builds a manifest with sensible defaults", () => {
    const manifest = contentManifestFactory();
    expect(manifest.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(manifest.creator).toMatch(/^G/);
    expect(manifest.schemaVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.media?.fileSizeBytes).toBeGreaterThan(0);
    expect(() => new Date(manifest.timestamp).toISOString()).not.toThrow();
  });

  it("applies overrides", () => {
    const manifest = contentManifestFactory({ creator: "GFIXED" });
    expect(manifest.creator).toBe("GFIXED");
  });

  it("supports buildList for configurable batch generation", () => {
    const manifests = contentManifestFactory.buildList(3);
    expect(manifests).toHaveLength(3);
    const hashes = new Set(manifests.map((m) => m.contentHash));
    expect(hashes.size).toBe(3);
  });
});

describe("relationship handling", () => {
  it("derives provenanceCert.manifestHash from the linked manifest", () => {
    const manifest = contentManifestFactory();
    const cert = provenanceCertFactory({}, { manifest });
    expect(cert.manifestHash).toBe(buildManifestHash(manifest));
    expect(cert.creator).toBe(manifest.creator);
  });

  it("derives certificateDetails fields from the linked manifest", () => {
    const manifest = contentManifestFactory();
    const details = certificateDetailsFactory({}, { manifest });
    expect(details.manifestHash).toBe(buildManifestHash(manifest));
    expect(details.creator).toBe(manifest.creator);
  });

  it("derives verificationJob fields from the linked manifest", () => {
    const manifest = contentManifestFactory();
    const job = verificationJobFactory({}, { manifest });
    expect(job.manifestHash).toBe(buildManifestHash(manifest));
    expect(job.contentHash).toBe(manifest.contentHash);
    expect(job.status).toBe("pending");
  });

  it("still overrides explicit fields even when a manifest is linked", () => {
    const manifest = contentManifestFactory();
    const cert = provenanceCertFactory({ creator: "GOVERRIDE" }, { manifest });
    expect(cert.creator).toBe("GOVERRIDE");
  });
});

describe("verificationStatusFactory", () => {
  it("returns one of the known statuses", () => {
    expect(["pending", "processing", "certified", "failed"]).toContain(verificationStatusFactory());
  });
});

describe("seedFactories", () => {
  beforeEach(() => seedFactories(42));

  it("produces repeatable data for the same seed", () => {
    // timestamp is intentionally excluded: faker.date.recent() anchors to the
    // real wall clock, so only the faker-driven fields are seed-deterministic.
    seedFactories(42);
    const { timestamp: _a, ...a } = contentManifestFactory();
    seedFactories(42);
    const { timestamp: _b, ...b } = contentManifestFactory();
    expect(a).toEqual(b);
  });
});
