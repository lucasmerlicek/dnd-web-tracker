import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { expendedSlotLevels, hasPyramidArtifact, recoverWithPyramid } from "../pyramid-artifact";
import type { CharacterData } from "../../types/character";

describe("Pyramid Artifact", () => {
  it("is only available to a character carrying it", () => {
    const withIt = { inventoryItems: { gear: [], utility: [{ name: "Pyramid Artifact" }], treasure: [] } };
    const without = { inventoryItems: { gear: [], utility: [{ name: "Scroll of Resistance" }], treasure: [] } };
    expect(hasPyramidArtifact(withIt as unknown as CharacterData)).toBe(true);
    expect(hasPyramidArtifact(without as unknown as CharacterData)).toBe(false);
  });

  it("lists only expended levels, lowest first", () => {
    expect(expendedSlotLevels({ "6th": 1, "1st": 4, "3rd": 3 }, { "6th": 0, "1st": 4, "3rd": 1 })).toEqual(["3rd", "6th"]);
  });

  it("recovers one slot of any level, including 6th", () => {
    const res = recoverWithPyramid({ "6th": 1 }, { "6th": 0 }, "6th", false);
    expect(res).toEqual({ success: true, newSlots: { "6th": 1 } });
  });

  it("fails when already used or nothing is expended", () => {
    expect(recoverWithPyramid({ "3rd": 3 }, { "3rd": 0 }, "3rd", true).success).toBe(false);
    expect(recoverWithPyramid({ "3rd": 3 }, { "3rd": 3 }, "3rd", false).success).toBe(false);
  });

  it("property: never exceeds the slot maximum and never mutates input", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 4 }), fc.integer({ min: 0, max: 4 }), fc.boolean(), (max, used, done) => {
        const spellSlots = { "5th": max };
        const current = { "5th": Math.max(0, max - used) };
        const before = JSON.stringify(current);
        const res = recoverWithPyramid(spellSlots, current, "5th", done);
        expect(res.newSlots["5th"]).toBeLessThanOrEqual(max);
        expect(JSON.stringify(current)).toBe(before);
        if (!res.success) expect(res.newSlots).toEqual(current);
      }),
      { numRuns: 200 }
    );
  });
});
