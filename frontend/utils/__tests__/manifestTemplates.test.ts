/**
 * Unit tests for utils/manifestTemplates.ts
 * Covers: ALL_TEMPLATES, TEMPLATES_BY_ID, loadTemplate, getTemplate
 */

import {
  ALL_TEMPLATES,
  TEMPLATES_BY_ID,
  loadTemplate,
  getTemplate,
  type TemplateId,
} from "../manifestTemplates";

const TEMPLATE_IDS: TemplateId[] = ["image", "video", "audio", "document", "custom"];

// ---------------------------------------------------------------------------
// ALL_TEMPLATES
// ---------------------------------------------------------------------------

describe("ALL_TEMPLATES", () => {
  it("exports exactly 5 templates", () => {
    expect(ALL_TEMPLATES.length).toBe(5);
  });

  it("includes all expected template IDs", () => {
    const ids = ALL_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(TEMPLATE_IDS));
  });

  it("each template has a non-empty label, description, and icon", () => {
    for (const t of ALL_TEMPLATES) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.icon.length).toBeGreaterThan(0);
    }
  });

  it("each template manifest has contentHash, creator, and timestamp fields", () => {
    for (const t of ALL_TEMPLATES) {
      expect("contentHash" in t.manifest).toBe(true);
      expect("creator" in t.manifest).toBe(true);
      expect("timestamp" in t.manifest).toBe(true);
    }
  });

  it("contentHash and creator start as empty strings", () => {
    for (const t of ALL_TEMPLATES) {
      expect(t.manifest.contentHash).toBe("");
      expect(t.manifest.creator).toBe("");
    }
  });
});

// ---------------------------------------------------------------------------
// TEMPLATES_BY_ID
// ---------------------------------------------------------------------------

describe("TEMPLATES_BY_ID", () => {
  it("contains an entry for each template ID", () => {
    for (const id of TEMPLATE_IDS) {
      expect(TEMPLATES_BY_ID[id]).toBeDefined();
      expect(TEMPLATES_BY_ID[id].id).toBe(id);
    }
  });
});

// ---------------------------------------------------------------------------
// loadTemplate
// ---------------------------------------------------------------------------

describe("loadTemplate", () => {
  it("returns a deep clone of the template manifest", () => {
    const m1 = loadTemplate("image");
    const m2 = loadTemplate("image");
    // Different object references
    expect(m1).not.toBe(m2);
    // But equal values
    expect(m1).toEqual(m2);
  });

  it("mutations to the clone do not affect the original template", () => {
    const clone = loadTemplate("image");
    clone.contentHash = "mutated";
    const fresh = loadTemplate("image");
    expect(fresh.contentHash).toBe("");
  });

  it("returns a manifest with metadata for non-custom templates", () => {
    for (const id of ["image", "video", "audio", "document"] as TemplateId[]) {
      const m = loadTemplate(id);
      expect(m.metadata).toBeDefined();
    }
  });

  it("returns a manifest with empty metadata for the custom template", () => {
    const m = loadTemplate("custom");
    expect(m.metadata).toBeDefined();
    // Custom template has empty metadata object
    expect(Object.keys(m.metadata ?? {})).toHaveLength(0);
  });

  it("falls back to custom template for an unknown id", () => {
    // Cast to bypass TS — simulating runtime unknown id
    const m = loadTemplate("unknown" as TemplateId);
    expect(m).toBeDefined();
    expect(m.contentHash).toBe("");
  });
});

// ---------------------------------------------------------------------------
// getTemplate
// ---------------------------------------------------------------------------

describe("getTemplate", () => {
  it("returns the correct template object for each known id", () => {
    for (const id of TEMPLATE_IDS) {
      const t = getTemplate(id);
      expect(t).toBeDefined();
      expect(t!.id).toBe(id);
    }
  });

  it("returns undefined for an unknown template id", () => {
    expect(getTemplate("unknown" as TemplateId)).toBeUndefined();
  });

  it("image template has metadata with device, location, and aiModel hints", () => {
    const t = getTemplate("image")!;
    expect(t.manifest.metadata?.device).toBeTruthy();
    expect(t.manifest.metadata?.location).toBeTruthy();
    expect(t.manifest.metadata?.aiModel).toBeTruthy();
  });
});
