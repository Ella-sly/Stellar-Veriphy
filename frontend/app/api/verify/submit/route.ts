import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildManifestHash, type ContentManifest } from "@stellarveriphy/shared";
import { saveRequest } from "@/lib/verification-store";

function isValidManifest(value: unknown): value is ContentManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Record<string, unknown>;
  return (
    typeof manifest.contentHash === "string" &&
    typeof manifest.creator === "string" &&
    typeof manifest.timestamp === "string"
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const manifest = (body as { manifest?: unknown } | null)?.manifest;
  if (!isValidManifest(manifest)) {
    return NextResponse.json(
      {
        error: "invalid_manifest",
        message: "manifest.contentHash, manifest.creator and manifest.timestamp are required strings.",
      },
      { status: 400 }
    );
  }

  const id = randomUUID();
  saveRequest({
    id,
    storageRef: `pending://${id}`,
    manifestHash: buildManifestHash(manifest),
    requester: manifest.creator,
    status: "pending",
  });

  return NextResponse.json({ id, status: "pending" }, { status: 202 });
}
