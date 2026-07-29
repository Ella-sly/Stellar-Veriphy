import type { VerificationRequest } from "@stellarveriphy/shared";

/**
 * In-memory store for verification jobs. Suitable for local development and
 * tests; a real deployment should back this with a database and the on-chain
 * oracle contract (see contracts/oracle).
 */
const store = new Map<string, VerificationRequest>();

export function saveRequest(request: VerificationRequest): void {
  store.set(request.id, request);
}

export function getRequest(id: string): VerificationRequest | undefined {
  return store.get(id);
}

export function clearStore(): void {
  store.clear();
}
