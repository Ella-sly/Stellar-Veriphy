/**
 * manifestUseCases.ts
 *
 * Business-logic layer for manifest generation, validation, and export.
 * This module is framework-agnostic (no React imports) so it can be used
 * from both UI components and server-side code.
 *
 * Dependencies:
 *   - fast-xml-parser  (XML serialisation)
 *   - packages/shared  (ContentManifest type)
 *
 * NOTE: fast-xml-parser is a lightweight, zero-dependency XML library.
 * Install it with:  npm install fast-xml-parser
 */

import { XMLBuilder } from "fast-xml-parser";
import type { ContentManifest } from "../../packages/shared/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Parameters accepted by generateManifest. */
export interface GenerateManifestParams {
  /** SHA-256 hex digest of the media file. */
  contentHash: string;
  /** Stellar public key of the content creator. */
  creator: string;
  /**
   * ISO 8601 creation timestamp.
   * Defaults to the current UTC time when omitted.
   */
  timestamp?: string;
  /** Optional device / location / AI-model metadata. */
  metadata?: {
    device?: string;
    location?: string;
    aiModel?: string;
  };
}

/** Supported export formats. */
export type ManifestFormat = "json" | "xml";

// ---------------------------------------------------------------------------
// generateManifest
// ---------------------------------------------------------------------------

/**
 * Build a `ContentManifest` object from user-supplied parameters.
 *
 * @param params  Input values from the manifest builder form.
 * @returns       A fully-formed `ContentManifest` ready for hashing and
 *                on-chain submission.
 */
export function generateManifest(params: GenerateManifestParams): ContentManifest {
  const manifest: ContentManifest = {
    contentHash: params.contentHash,
    creator: params.creator,
    timestamp: params.timestamp ?? new Date().toISOString(),
  };

  // Only attach the metadata block when at least one field is provided.
  if (params.metadata) {
    const { device, location, aiModel } = params.metadata;
    const hasAnyField =
      (device !== undefined && device !== "") ||
      (location !== undefined && location !== "") ||
      (aiModel !== undefined && aiModel !== "");

    if (hasAnyField) {
      manifest.metadata = {};
      if (device !== undefined && device !== "") manifest.metadata.device = device;
      if (location !== undefined && location !== "") manifest.metadata.location = location;
      if (aiModel !== undefined && aiModel !== "") manifest.metadata.aiModel = aiModel;
    }
  }

  return manifest;
}

// ---------------------------------------------------------------------------
// exportManifestAsJSON
// ---------------------------------------------------------------------------

/**
 * Serialise a manifest to a pretty-printed JSON string.
 *
 * @param manifest  The manifest to serialise.
 * @returns         Indented JSON string (2-space indent).
 */
export function exportManifestAsJSON(manifest: ContentManifest): string {
  return JSON.stringify(manifest, null, 2);
}

// ---------------------------------------------------------------------------
// exportManifestAsXML
// ---------------------------------------------------------------------------

/**
 * Serialise a manifest to an XML string using fast-xml-parser.
 *
 * Output format:
 * ```xml
 * <?xml version="1.0" encoding="UTF-8"?>
 * <manifest>
 *   <contentHash>…</contentHash>
 *   <creator>…</creator>
 *   <timestamp>…</timestamp>
 *   <metadata>
 *     <device>…</device>
 *     …
 *   </metadata>
 * </manifest>
 * ```
 *
 * @param manifest  The manifest to serialise.
 * @returns         Well-formed XML string.
 */
export function exportManifestAsXML(manifest: ContentManifest): string {
  const builder = new XMLBuilder({
    format: true,
    indentBy: "  ",
    ignoreAttributes: false,
    suppressEmptyNode: true,
  });

  // fast-xml-parser expects the root element to be a key in the object.
  const xmlObject = { manifest };

  const body: string = builder.build(xmlObject);

  // Prepend the XML declaration (fast-xml-parser does not add it by default).
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}

// ---------------------------------------------------------------------------
// downloadManifest
// ---------------------------------------------------------------------------

/**
 * Trigger a browser file download for the given manifest.
 *
 * This function is a no-op in non-browser environments (e.g. Jest / Node).
 *
 * @param manifest  The manifest to download.
 * @param format    `"json"` (default) or `"xml"`.
 * @param filename  Optional base filename (without extension).
 *                  Defaults to `"manifest"`.
 */
export function downloadManifest(
  manifest: ContentManifest,
  format: ManifestFormat = "json",
  filename = "manifest"
): void {
  // Guard: skip in non-browser environments.
  if (typeof document === "undefined") return;

  let content: string;
  let mimeType: string;
  let extension: string;

  if (format === "xml") {
    content = exportManifestAsXML(manifest);
    mimeType = "application/xml";
    extension = "xml";
  } else {
    content = exportManifestAsJSON(manifest);
    mimeType = "application/json";
    extension = "json";
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}.${extension}`;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Release the object URL after a short delay to allow the download to start.
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
