/**
 * Unit tests for utils/cn.ts
 * Covers: cn (className merge utility)
 */

import { cn } from "../cn";

describe("cn", () => {
  it("returns a single class unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("joins multiple classes with a space", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("filters out falsy values", () => {
    expect(cn("foo", undefined, null, false, "", "bar")).toBe("foo bar");
  });

  it("handles conditional classes via objects", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  it("handles arrays", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("resolves Tailwind conflicts — last wins", () => {
    // twMerge: p-4 overrides p-2
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("resolves Tailwind text color conflict", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("does not add extra spaces for falsy inputs", () => {
    const result = cn("a", false, "b");
    expect(result).not.toMatch(/\s{2,}/);
    expect(result).toBe("a b");
  });

  it("returns an empty string when all inputs are falsy", () => {
    expect(cn(undefined, null, false)).toBe("");
  });

  it("handles no arguments", () => {
    expect(cn()).toBe("");
  });
});
