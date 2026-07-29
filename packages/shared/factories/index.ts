import { faker } from "@faker-js/faker";
import type { ContentManifest, ProvenanceCert, VerificationRequest, VerificationStatus } from "../types";
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

export const contentManifestFactory: Factory<ContentManifest> = createFactory<ContentManifest>((overrides) => ({
  contentHash: `sha256:${faker.string.hexadecimal({ length: 64, prefix: "", casing: "lower" })}`,
  creator: fakeStellarPublicKey(),
  timestamp: faker.date.recent().toISOString(),
  metadata: {
    device: faker.helpers.arrayElement(DEVICE_OPTIONS),
    location: `${faker.location.latitude()},${faker.location.longitude()}`,
    aiModel: faker.helpers.arrayElement(AI_MODEL_OPTIONS),
  },
  ...overrides,
}));

interface ProvenanceCertOptions {
  /** Derive manifestHash/creator from this manifest instead of a fresh random one. */
  manifest?: ContentManifest;
}

export const provenanceCertFactory: Factory<ProvenanceCert, ProvenanceCertOptions> = createFactory<
  ProvenanceCert,
  ProvenanceCertOptions
>((overrides, options) => {
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
});

interface VerificationRequestOptions {
  /** Derive storageRef/manifestHash/requester from this manifest instead of a fresh random one. */
  manifest?: ContentManifest;
}

export const verificationRequestFactory: Factory<VerificationRequest, VerificationRequestOptions> = createFactory<
  VerificationRequest,
  VerificationRequestOptions
>((overrides, options) => {
  const manifest = options?.manifest ?? contentManifestFactory();
  return {
    id: faker.string.uuid(),
    storageRef: `ipfs://${faker.string.alphanumeric(46)}`,
    manifestHash: buildManifestHash(manifest),
    requester: manifest.creator,
    status: "pending",
    ...overrides,
  };
});

const VERIFICATION_STATUSES: VerificationStatus[] = ["pending", "processing", "certified", "failed"];

export function verificationStatusFactory(): VerificationStatus {
  return faker.helpers.arrayElement(VERIFICATION_STATUSES);
}
