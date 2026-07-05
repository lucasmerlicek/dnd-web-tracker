import { describe, it, expect } from "vitest";
import { getCmeBonusDice, cmeLabelSuffix } from "../cme";
import type { ClassResources } from "@/types/character";

describe("Conjure Minor Elementals bonus dice", () => {
  it("returns null when inactive", () => {
    expect(getCmeBonusDice({ cmeActive: false, cmeDice: "2d8" })).toBeNull();
    expect(getCmeBonusDice({ cmeDice: "2d8" })).toBeNull();
    expect(getCmeBonusDice(undefined)).toBeNull();
  });

  it("returns null when active but no dice configured", () => {
    expect(getCmeBonusDice({ cmeActive: true })).toBeNull();
  });

  it("parses 2d8 when active", () => {
    expect(getCmeBonusDice({ cmeActive: true, cmeDice: "2d8" })).toEqual({
      count: 2,
      sides: 8,
    });
  });

  it("parses upcast dice (3d8) and tolerates whitespace", () => {
    expect(getCmeBonusDice({ cmeActive: true, cmeDice: " 3d8 " })).toEqual({
      count: 3,
      sides: 8,
    });
  });

  it("rejects invalid die sizes", () => {
    expect(getCmeBonusDice({ cmeActive: true, cmeDice: "2d7" })).toBeNull();
    expect(getCmeBonusDice({ cmeActive: true, cmeDice: "garbage" })).toBeNull();
    expect(getCmeBonusDice({ cmeActive: true, cmeDice: "0d8" })).toBeNull();
  });

  it("builds a label suffix with the damage type", () => {
    const cr: ClassResources = { cmeActive: true, cmeDice: "2d8", cmeDamageType: "fire" };
    expect(cmeLabelSuffix(cr)).toBe(" + CME 2d8 fire");
    expect(cmeLabelSuffix({ cmeActive: true, cmeDice: "2d8" })).toBe(" + CME 2d8 elemental");
    expect(cmeLabelSuffix({ cmeActive: false })).toBe("");
  });
});
