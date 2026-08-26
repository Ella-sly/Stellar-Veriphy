/**
 * manifestTemplates.ts
 *
 * Pre-built manifest templates for common content types.
 * Each template provides sensible defaults and metadata hints
 * that users can customise before exporting.
 */

import type { ContentManifest } from "@stellarveriphy/shared/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Identifies a built-in template. */
export type TemplateId = "image" | "video" | "audio" | "document" | "custom";

/** Describes a single template option. */
export interface ManifestTemplate {
  /** Unique identifier for the template. */
  id: TemplateId;
  /** Human-readable label shown in the UI. */
  label: string;
  /** Short description of when to use this template. */
  description: string;
  /** Icon / emoji hint for the template selector. */
  icon: string;
  /** The partial manifest that will be applied when the template is chosen. */
  manifest: Partial<ContentManifest>;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const now = new Date().toISOString();

const IMAGE_TEMPLATE: ManifestTemplate = {
  id: "image",
  label: "Image",
  description: "Photographs, illustrations, screenshots, and other raster/vector images",
  icon: "🖼️",
  manifest: {
    contentHash: "",
    creator: "",
    timestamp: now,
    metadata: {
      device: "Camera / Scanner model",
      location: "GPS coordinates or place name",
      aiModel: "e.g., Stable Diffusion, DALL·E, Midjourney",
    },
  },
};

const VIDEO_TEMPLATE: ManifestTemplate = {
  id: "video",
  label: "Video",
  description: "Recorded footage, animations, screencasts, and short-form clips",
  icon: "🎬",
  manifest: {
    contentHash: "",
    creator: "",
    timestamp: now,
    metadata: {
      device: "Camera / recording device",
      location: "Filming location",
      aiModel: "e.g., Runway, Pika, Sora",
    },
  },
};

const AUDIO_TEMPLATE: ManifestTemplate = {
  id: "audio",
  label: "Audio",
  description: "Music, podcasts, voice recordings, and sound effects",
  icon: "🎵",
  manifest: {
    contentHash: "",
    creator: "",
    timestamp: now,
    metadata: {
      device: "Microphone / recording setup",
      location: "Recording studio or venue",
      aiModel: "e.g., ElevenLabs, Jukebox",
    },
  },
};

const DOCUMENT_TEMPLATE: ManifestTemplate = {
  id: "document",
  label: "Document",
  description: "PDFs, articles, whitepapers, legal documents, and text files",
  icon: "📄",
  manifest: {
    contentHash: "",
    creator: "",
    timestamp: now,
    metadata: {
      device: "Authoring tool (e.g., Word, LaTeX)",
      location: "",
      aiModel: "e.g., ChatGPT, Claude, Gemini",
    },
  },
};

const CUSTOM_TEMPLATE: ManifestTemplate = {
  id: "custom",
  label: "Custom (Empty)",
  description: "Start from scratch with no pre-filled metadata",
  icon: "✨",
  manifest: {
    contentHash: "",
    creator: "",
    timestamp: now,
    metadata: {},
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/** All available templates, keyed by id for O(1) lookup. */
export const TEMPLATES_BY_ID: Record<TemplateId, ManifestTemplate> = {
  image: IMAGE_TEMPLATE,
  video: VIDEO_TEMPLATE,
  audio: AUDIO_TEMPLATE,
  document: DOCUMENT_TEMPLATE,
  custom: CUSTOM_TEMPLATE,
};

/** Ordered list of templates for rendering in a selector. */
export const ALL_TEMPLATES: ManifestTemplate[] = [
  IMAGE_TEMPLATE,
  VIDEO_TEMPLATE,
  AUDIO_TEMPLATE,
  DOCUMENT_TEMPLATE,
  CUSTOM_TEMPLATE,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return a deep-cloned copy of a template's manifest so the caller can mutate
 * it without affecting the original template definition.
 */
export function loadTemplate(id: TemplateId): Partial<ContentManifest> {
  const template = TEMPLATES_BY_ID[id];
  if (!template) {
    // Fall back to the custom template for unknown ids.
    return JSON.parse(JSON.stringify(CUSTOM_TEMPLATE.manifest));
  }
  return JSON.parse(JSON.stringify(template.manifest));
}

/**
 * Return the template object for a given id, or `undefined` if not found.
 */
export function getTemplate(id: TemplateId): ManifestTemplate | undefined {
  return TEMPLATES_BY_ID[id];
}
