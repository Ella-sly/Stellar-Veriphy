import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { contentManifestFactory } from "@stellarveriphy/shared";
import { POST } from "@/app/api/verify/submit/route";
import { GET } from "@/app/api/verify/status/[jobId]/route";
import { clearStore } from "@/lib/verification-store";

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/verify/submit", () => {
  beforeEach(() => clearStore());

  it("accepts a valid manifest and returns a pending job", async () => {
    const manifest = contentManifestFactory();
    const response = await POST(jsonRequest("http://localhost/api/verify/submit", { manifest }));

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.status).toBe("pending");
    expect(typeof body.id).toBe("string");
  });

  it("rejects a manifest missing required fields", async () => {
    const response = await POST(
      jsonRequest("http://localhost/api/verify/submit", { manifest: { contentHash: "sha256:abc" } })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("invalid_manifest");
  });

  it("rejects a missing manifest field entirely", async () => {
    const response = await POST(jsonRequest("http://localhost/api/verify/submit", {}));
    expect(response.status).toBe(400);
  });

  it("rejects invalid JSON bodies", async () => {
    const request = new NextRequest("http://localhost/api/verify/submit", {
      method: "POST",
      body: "not json",
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("invalid_json");
  });
});

describe("GET /api/verify/status/:jobId", () => {
  beforeEach(() => clearStore());

  it("returns 404 for an unknown job", async () => {
    const response = await GET(new NextRequest("http://localhost/api/verify/status/unknown"), {
      params: Promise.resolve({ jobId: "unknown" }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("not_found");
  });

  it("returns the stored job after submission", async () => {
    const manifest = contentManifestFactory();
    const submitResponse = await POST(jsonRequest("http://localhost/api/verify/submit", { manifest }));
    const { id } = await submitResponse.json();

    const statusResponse = await GET(new NextRequest(`http://localhost/api/verify/status/${id}`), {
      params: Promise.resolve({ jobId: id }),
    });

    expect(statusResponse.status).toBe(200);
    const body = await statusResponse.json();
    expect(body.id).toBe(id);
    expect(body.requester).toBe(manifest.creator);
    expect(body.status).toBe("pending");
  });
});
