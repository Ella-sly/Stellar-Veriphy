import { faker } from "@faker-js/faker";
import type { CertificateDetails, ContentManifest, ProvenanceCert, VerificationJob, VerificationStatus } from "../types";
import { buildManifestHash } from "../utils/hash";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".split("");

/** Generates a syntactically valid-looking Stellar public key (G... + 55 base32 chars). */
export function fakeStellarPublicKey(): string {
  return "G" + faker.string.fromCharacters(BASE32_ALPHABET, 55);
}

/** Reseeds the shared faker instance so a test run produces repeatable data. */
export function seedFactories(seed: number = 1337): void {
  faker.seed(seed);
}

type Factory<T, Options = void> = ((overrides?: Partial<T>, options?: Options) => T) & {
  buildList: (count: number, overrides?: Partial<T>, options?: Options) => T[];
};

function createFactory<T, Options = void>(
  build: (overrides: Partial<T>, options: Options | undefined) => T
): Factory<T, Options> {
  const factory = ((overrides: Partial<T> = {}, options?: Options) =>
    build(overrides, options)) as Factory<T, Options>;
  factory.buildList = (count, overrides = {}, options?) =>
    Array.from({ length: count }, () => factory(overrides, options));
  return factory;
}

export const DEVICE_OPTIONS = ["Camera Model X", "iPhone 15 Pro", "DSLR Mark IV", undefined];
export const AI_MODEL_OPTIONS = ["None", "Stable Diffusion", "Midjourney", "DALL-E 3"];
export const SCHEMA_VERSION_OPTIONS = ["1.0.0", "2.0.0"];
export const FILE_TYPE_OPTIONS = ["image/jpeg", "image/png", "video/mp4", "application/pdf"];

export const contentManifestFactory: Factory<ContentManifest> = createFactory<ContentManifest>((overrides) => {
  // exactOptionalPropertyTypes forbids `device: undefined`; only include the
  // key at all when a device was actually picked.
  const device = faker.helpers.arrayElement(DEVICE_OPTIONS);
  return {
    schemaVersion: faker.helpers.arrayElement(SCHEMA_VERSION_OPTIONS),
    contentHash: `sha256:${faker.string.hexadecimal({ length: 64, prefix: "", casing: "lower" })}`,
    creator: fakeStellarPublicKey(),
    timestamp: faker.date.recent().toISOString(),
    metadata: {
      ...(device !== undefined ? { device } : {}),
      location: `${faker.location.latitude()},${faker.location.longitude()}`,
      aiModel: faker.helpers.arrayElement(AI_MODEL_OPTIONS),
    },
    media: {
      fileName: faker.system.commonFileName(),
      fileType: faker.helpers.arrayElement(FILE_TYPE_OPTIONS),
      fileSizeBytes: faker.number.int({ min: 1_024, max: 50_000_000 }),
    },
    ...overrides,
  };
});

interface CertificateOptions {
  /** Derive manifestHash/creator from this manifest instead of a fresh random one. */
  manifest?: ContentManifest;
}

/**
 * Builds a certificate matching both `ProvenanceCert` (the on-chain shape) and
 * `CertificateDetails` (its camelCase frontend mirror) — the two types are
 * structurally identical, so one builder serves both.
 */
function buildCertificate(overrides: Partial<ProvenanceCert>, options: CertificateOptions | undefined): ProvenanceCert {
  const manifest = options?.manifest ?? contentManifestFactory();
  return {
    id: faker.string.uuid(),
    storageRef: `ipfs://${faker.string.alphanumeric(46)}`,
    manifestHash: buildManifestHash(manifest),
    attestationHash: `sha256:${faker.string.hexadecimal({ length: 64, prefix: "", casing: "lower" })}`,
    creator: manifest.creator,
    timestamp: Math.floor(new Date(manifest.timestamp).getTime() / 1000),
    ...overrides,
  };
}

export const provenanceCertFactory: Factory<ProvenanceCert, CertificateOptions> = createFactory(buildCertificate);
export const certificateDetailsFactory: Factory<CertificateDetails, CertificateOptions> = createFactory(buildCertificate);

interface VerificationJobOptions {
  /** Derive contentHash/manifestHash from this manifest instead of a fresh random one. */
  manifest?: ContentManifest;
}

export const verificationJobFactory: Factory<VerificationJob, VerificationJobOptions> = createFactory<
  VerificationJob,
  VerificationJobOptions
>((overrides, options) => {
  const manifest = options?.manifest ?? contentManifestFactory();
  return {
    jobId: faker.string.uuid(),
    status: "pending",
    contentHash: manifest.contentHash,
    manifestHash: buildManifestHash(manifest),
    ...overrides,
  };
});

const VERIFICATION_STATUSES: VerificationStatus[] = ["pending", "processing", "certified", "failed"];

export function verificationStatusFactory(): VerificationStatus {
  return faker.helpers.arrayElement(VERIFICATION_STATUSES);
}
