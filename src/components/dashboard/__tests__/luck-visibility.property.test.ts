import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 6: Luck points visibility matches feat presence
 * Tag: Feature: dnd-tracker-enhancements, Property 6: Luck points visibility matches feat presence
 *
 * **Validates: Requirements 5.1, 5.2**
 *
 * For any character data, the Luck_Points counter should be visible
 * if and only if the character's featsTraits array includes the string "Lucky".
 */

/**
 * Pure logic extracted from the Dashboard component:
 * The Luck counter is rendered when `featsTraits.includes("Lucky")`.
 */
function shouldShowLuckPoints(featsTraits: string[]): boolean {
  return featsTraits.includes("Lucky");
}

// Common D&D feat names to generate realistic featsTraits arrays
const sampleFeats = [
  "Alert", "Tough", "Sentinel", "War Caster", "Resilient",
  "Great Weapon Master", "Sharpshooter", "Fey Touched", "Shadow Touched",
  "Observant", "Mobile", "Ritual Caster", "Elemental Adept",
];

// Arbitrary for a feat/trait string that is NOT "Lucky"
const nonLuckyFeatArb = fc.oneof(
  fc.constantFrom(...sampleFeats),
  fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s !== "Lucky")
);

// Arbitrary for a featsTraits array that does NOT contain "Lucky"
const featsWithoutLuckyArb = fc.array(nonLuckyFeatArb, {
  minLength: 0,
  maxLength: 10,
});

// Arbitrary for a featsTraits array that DOES contain "Lucky" (at a random position)
const featsWithLuckyArb = fc
  .tuple(
    fc.array(nonLuckyFeatArb, { minLength: 0, maxLength: 5 }),
    fc.array(nonLuckyFeatArb, { minLength: 0, maxLength: 5 })
  )
  .map(([before, after]) => [...before, "Lucky", ...after]);

describe("Luck points visibility property tests", () => {
  it("Feature: dnd-tracker-enhancements, Property 6: Luck points visibility matches feat presence", () => {
    /**
     * **Validates: Requirements 5.1, 5.2**
     *
     * For any featsTraits array containing "Lucky", luck points should be visible.
     * For any featsTraits array NOT containing "Lucky", luck points should be hidden.
     */

    // Case 1: featsTraits includes "Lucky" → visible
    fc.assert(
      fc.property(featsWithLuckyArb, (featsTraits) => {
        expect(shouldShowLuckPoints(featsTraits)).toBe(true);
      }),
      { numRuns: 100 }
    );

    // Case 2: featsTraits does NOT include "Lucky" → hidden
    fc.assert(
      fc.property(featsWithoutLuckyArb, (featsTraits) => {
        expect(shouldShowLuckPoints(featsTraits)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
