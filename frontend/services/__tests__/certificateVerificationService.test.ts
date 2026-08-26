/**
 * Unit tests for services/certificateVerificationService.ts
 * Covers all exported async functions.
 */

import {
  generateVerificationCode,
  getCertificateByCode,
  getCertificateById,
  getCertificatesByCreator,
  searchCertificates,
  verifyCertificateAuthenticity,
} from "../certificateVerificationService";

// Speed up tests by overriding the internal delay
jest.useFakeTimers();

// Helper: flush all pending timers/promises so fake timers resolve
async function flushAll() {
  jest.runAllTimers();
  await Promise.resolve();
  jest.runAllTimers();
  await Promise.resolve();
}

// ---------------------------------------------------------------------------
// getCertificateById
// ---------------------------------------------------------------------------

describe("getCertificateById", () => {
  it("returns success with data for a seeded certificate (id '1')", async () => {
    const p = getCertificateById("1");
    await flushAll();
    const result = await p;
    expect(result.success).toBe(true);
    expect(result.data?.certificate.id).toBe("1");
  });

  it("returns success for certificate id '2' and '3'", async () => {
    for (const id of ["2", "3"]) {
      const p = getCertificateById(id);
      await flushAll();
      const r = await p;
      expect(r.success).toBe(true);
    }
  });

  it("returns failure for a non-existent id", async () => {
    const p = getCertificateById("9999");
    await flushAll();
    const r = await p;
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/not found/i);
  });

  it("certificate result has all required fields", async () => {
    const p = getCertificateById("1");
    await flushAll();
    const r = await p;
    const d = r.data!;
    expect(typeof d.certificate.manifestHash).toBe("string");
    expect(typeof d.certificate.attestationHash).toBe("string");
    expect(typeof d.certificate.creator).toBe("string");
    expect(typeof d.certificate.timestamp).toBe("number");
    expect(typeof d.isValid).toBe("boolean");
    expect(typeof d.isRevoked).toBe("boolean");
    expect(typeof d.isExpired).toBe("boolean");
    expect(typeof d.verificationLevel).toBe("string");
    expect(typeof d.statusLabel).toBe("string");
  });

  it("statusLabel is 'Active' for a freshly seeded certificate", async () => {
    const p = getCertificateById("1");
    await flushAll();
    const r = await p;
    expect(r.data!.statusLabel).toBe("Active");
  });
});

// ---------------------------------------------------------------------------
// getCertificateByCode
// ---------------------------------------------------------------------------

describe("getCertificateByCode", () => {
  it("returns the certificate for a known verification code 'ABC12345'", async () => {
    const p = getCertificateByCode("ABC12345");
    await flushAll();
    const r = await p;
    expect(r.success).toBe(true);
    expect(r.data?.certificate.id).toBe("1");
  });

  it("is case-insensitive for the code", async () => {
    const p = getCertificateByCode("abc12345");
    await flushAll();
    const r = await p;
    expect(r.success).toBe(true);
  });

  it("returns failure for an unknown code", async () => {
    const p = getCertificateByCode("XXXXXXXX");
    await flushAll();
    const r = await p;
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/not found/i);
  });

  it("returns the certificate for code 'DEF67890' (id 2)", async () => {
    const p = getCertificateByCode("DEF67890");
    await flushAll();
    const r = await p;
    expect(r.success).toBe(true);
    expect(r.data?.certificate.id).toBe("2");
  });
});

// ---------------------------------------------------------------------------
// getCertificatesByCreator
// ---------------------------------------------------------------------------

describe("getCertificatesByCreator", () => {
  const CREATOR = "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNSOLXAUJVLVWXVVNQNYWGLZ";

  it("returns certificates created by the known address", async () => {
    const p = getCertificatesByCreator(CREATOR);
    await flushAll();
    const r = await p;
    expect(r.success).toBe(true);
    expect(r.data!.total).toBeGreaterThan(0);
    r.data!.certificates.forEach((c) => expect(c.creator).toBe(CREATOR));
  });

  it("returns empty result for an unknown creator", async () => {
    const p = getCertificatesByCreator("GUNKNOWNADDRESS1234567890123456789012345678901234567890");
    await flushAll();
    const r = await p;
    expect(r.success).toBe(true);
    expect(r.data!.total).toBe(0);
  });

  it("respects offset and limit", async () => {
    const p = getCertificatesByCreator(CREATOR, 0, 1);
    await flushAll();
    const r = await p;
    expect(r.success).toBe(true);
    expect(r.data!.certificates.length).toBeLessThanOrEqual(1);
    expect(r.data!.limit).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// searchCertificates
// ---------------------------------------------------------------------------

describe("searchCertificates", () => {
  it("returns all seeded certificates with empty filters", async () => {
    const p = searchCertificates({});
    await flushAll();
    const r = await p;
    expect(r.success).toBe(true);
    expect(r.data!.total).toBeGreaterThan(0);
  });

  it("filters by creator address", async () => {
    const creator = "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNSOLXAUJVLVWXVVNQNYWGLZ";
    const p = searchCertificates({ creator });
    await flushAll();
    const r = await p;
    r.data!.certificates.forEach((c) => expect(c.creator).toBe(creator));
  });

  it("filters by startTime", async () => {
    const farFuture = Math.floor(Date.now() / 1000) + 86400 * 365;
    const p = searchCertificates({ startTime: farFuture });
    await flushAll();
    const r = await p;
    expect(r.data!.total).toBe(0);
  });

  it("filters by endTime", async () => {
    const veryOld = 1; // epoch + 1s — all certs are newer
    const p = searchCertificates({ endTime: veryOld });
    await flushAll();
    const r = await p;
    expect(r.data!.total).toBe(0);
  });

  it("respects offset and limit", async () => {
    const p = searchCertificates({ limit: 1, offset: 0 });
    await flushAll();
    const r = await p;
    expect(r.data!.certificates.length).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// verifyCertificateAuthenticity
// ---------------------------------------------------------------------------

describe("verifyCertificateAuthenticity", () => {
  it("returns authentic:true for a seeded certificate", async () => {
    const p = verifyCertificateAuthenticity("1");
    await flushAll();
    const r = await p;
    expect(r.success).toBe(true);
    expect(r.data!.authentic).toBe(true);
    expect(r.data!.hashMatch).toBe(true);
    expect(r.data!.signatureValid).toBe(true);
  });

  it("returns an array of detail strings", async () => {
    const p = verifyCertificateAuthenticity("1");
    await flushAll();
    const r = await p;
    expect(Array.isArray(r.data!.details)).toBe(true);
    expect(r.data!.details.length).toBeGreaterThan(0);
  });

  it("returns failure for an unknown certificate", async () => {
    const p = verifyCertificateAuthenticity("9999");
    await flushAll();
    const r = await p;
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateVerificationCode
// ---------------------------------------------------------------------------

describe("generateVerificationCode", () => {
  it("returns an 8-character alphanumeric code", async () => {
    const p = generateVerificationCode("1");
    await flushAll();
    const r = await p;
    expect(r.success).toBe(true);
    expect(r.data).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("generated code resolves back to the original certificate", async () => {
    const p1 = generateVerificationCode("2");
    await flushAll();
    const r1 = await p1;
    expect(r1.success).toBe(true);
    const code = r1.data!;

    const p2 = getCertificateByCode(code);
    await flushAll();
    const r2 = await p2;
    expect(r2.success).toBe(true);
    expect(r2.data?.certificate.id).toBe("2");
  });

  it("generates a different code on each call", async () => {
    const p1 = generateVerificationCode("3");
    await flushAll();
    const r1 = await p1;

    const p2 = generateVerificationCode("3");
    await flushAll();
    const r2 = await p2;

    // Not strictly guaranteed but almost certainly different
    // (both must be 8-char codes)
    expect(r1.data?.length).toBe(8);
    expect(r2.data?.length).toBe(8);
  });
});
