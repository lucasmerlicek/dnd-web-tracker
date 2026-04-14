import { describe, it, expect } from "vitest";
import { deriveIconFilename } from "../icon-utils";

describe("deriveIconFilename", () => {
  it("converts a simple two-word name", () => {
    expect(deriveIconFilename("Fire Bolt")).toBe("fire-bolt.png");
  });

  it("lowercases all characters", () => {
    expect(deriveIconFilename("MAGIC MISSILE")).toBe("magic-missile.png");
  });

  it("handles single word", () => {
    expect(deriveIconFilename("Fireball")).toBe("fireball.png");
  });

  it("strips non-alphanumeric characters", () => {
    expect(deriveIconFilename("Melf's Acid Arrow")).toBe(
      "melfs-acid-arrow.png"
    );
  });

  it("collapses consecutive hyphens", () => {
    expect(deriveIconFilename("Ray  of   Frost")).toBe("ray-of-frost.png");
  });

  it("trims leading and trailing hyphens from special chars", () => {
    expect(deriveIconFilename("--hello--")).toBe("hello.png");
  });

  it("returns null for empty string", () => {
    expect(deriveIconFilename("")).toBeNull();
  });

  it("returns null for special characters only", () => {
    expect(deriveIconFilename("@#$%^&*")).toBeNull();
  });

  it("handles names with numbers", () => {
    expect(deriveIconFilename("Cure Wounds 2")).toBe("cure-wounds-2.png");
  });

  it("handles parentheses and other punctuation", () => {
    expect(deriveIconFilename("Shield (Spell)")).toBe("shield-spell.png");
  });
});
