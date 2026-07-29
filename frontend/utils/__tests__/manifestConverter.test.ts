/**
 * Unit tests for utils/manifestConverter.ts
 * Covers: jsonToXml
 *
 * Note: xmlToJson depends on DOMParser (browser-only). That path is covered
 * in the jsdom component test project; here we test the pure jsonToXml function.
 */

import { jsonToXml } from "../manifestConverter";

// ---------------------------------------------------------------------------
// jsonToXml
// ---------------------------------------------------------------------------

describe("jsonToXml", () => {
  it("wraps output in an XML declaration and the default root element", () => {
    const xml = jsonToXml({});
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(xml).toContain("<manifest>");
    expect(xml).toContain("</manifest>");
  });

  it("uses a custom root name when provided", () => {
    const xml = jsonToXml({ a: 1 }, "root");
    expect(xml).toContain("<root>");
    expect(xml).toContain("</root>");
    expect(xml).not.toContain("<manifest>");
  });

  it("serialises a flat object to XML elements", () => {
    const xml = jsonToXml({ contentHash: "abc123", creator: "GABC" });
    expect(xml).toContain("<contentHash>abc123</contentHash>");
    expect(xml).toContain("<creator>GABC</creator>");
  });

  it("serialises a nested object", () => {
    const xml = jsonToXml({ metadata: { device: "iPhone" } });
    expect(xml).toContain("<metadata>");
    expect(xml).toContain("<device>iPhone</device>");
    expect(xml).toContain("</metadata>");
  });

  it("renders null/undefined values as self-closing tags", () => {
    const xml = jsonToXml({ field: null });
    expect(xml).toContain("<field />");
  });

  it("renders an array of strings", () => {
    const xml = jsonToXml({ tags: ["a", "b"] });
    // Each item is serialised under the singularised tag name
    expect(xml).toContain("a");
    expect(xml).toContain("b");
  });

  it("escapes HTML entities in values", () => {
    const xml = jsonToXml({ note: '<b>bold</b> & "quoted"' });
    expect(xml).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(xml).toContain("&amp;");
    expect(xml).toContain("&quot;quoted&quot;");
  });

  it("escapes ampersands in values", () => {
    const xml = jsonToXml({ title: "Cats & Dogs" });
    expect(xml).toContain("Cats &amp; Dogs");
  });

  it("serialises numeric values as strings", () => {
    const xml = jsonToXml({ count: 42 });
    expect(xml).toContain("<count>42</count>");
  });

  it("serialises boolean values as strings", () => {
    const xml = jsonToXml({ active: true, revoked: false });
    expect(xml).toContain("<active>true</active>");
    expect(xml).toContain("<revoked>false</revoked>");
  });

  it("handles a full ContentManifest object without throwing", () => {
    const manifest = {
      contentHash: "a3f5c2e1b4d6789012345678901234567890abcdef1234567890abcdef123456",
      creator: "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNSOLXAUJVLVWXVVNQNYWGLZ",
      timestamp: "2024-06-01T00:00:00Z",
      metadata: { device: "iPhone 15 Pro", location: "NYC", aiModel: "" },
    };
    expect(() => jsonToXml(manifest)).not.toThrow();
    const xml = jsonToXml(manifest);
    expect(xml).toContain("<contentHash>");
    expect(xml).toContain("<metadata>");
  });
});
