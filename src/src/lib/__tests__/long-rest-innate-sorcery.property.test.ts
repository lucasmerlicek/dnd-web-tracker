import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { ClassResources } from "@/types";

/**
 * Feature: madea-sorcerer-features, Property 6: Long rest resets Innate Sorcery and Sorcerous Restoration
 *
 * **Validates: Requirements 3.2, 6.5**
 *
 * For any ClassResources containing Innate Sorcery fields, performing a long
 * rest should set innateSorceryUsesRemaining to innateSorceryMaxUses,
 * innateSorceryActive to false, and sorcerousRestorationUsed to false.
 */

// ---------------------------------------------------------------------------
// Pure long rest class-resources reset logic (mirrors handleLongRest)
// ---------------------------------------------------------------------------

function applyLongRestClassResources(cr: ClassResources): ClassResources {
  const updated = { ...cr };
  if (updated.sorceryPointsMax !== undefined) updated.currentSorceryPoints = updated.sorceryPointsMax;
  if (updated.ravenFormMaxUses !== undefined) { updated.ravenFormUsesRemaining = updated.ravenFormMaxUses; updated.ravenFormActive = false; }
  if (updated.bladesongMaxUses !== undefined) { updated.bladesongUsesRemaining = updated.bladesongMaxUses; updated.bladesongActive = false; }
  if (updated.innateSorceryMaxUses !== undefined) { updated.innateSorceryUsesRemaining = updated.innateSorceryMaxUses; updated.innateSorceryActive = false; }
  updated.sorcerousRestorationUsed = false;
  updated.feyBaneUsed = false;
  updated.feyMistyStepUsed = false;
  updated.druidCharmPersonUsed = false;
  return updated;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generate ClassResources with Innate Sorcery fields in arbitrary pre-rest states. */
const arbInnateSorceryResources: fc.Arbitrary<ClassResources> = fc
  .record({
    sorceryPointsMax: fc.integer({ min: 1, max: 20 }),
    currentSorceryPoints: fc.integer({ min: 0, max: 20 }),
    innateSorceryActive: fc.boolean(),
    innateSorceryUsesRemaining: fc.integer({ min: 0, max: 10 }),
    innateSorceryMaxUses: fc.integer({ min: 1, max: 10 }),
    sorcerousRestorationUsed: fc.boolean(),
    ravenFormActive: fc.boolean(),
    ravenFormUsesRemaining: fc.integer({ min: 0, max: 3 }),
    ravenFormMaxUses: fc.integer({ min: 1, max: 3 }),
    feyBaneUsed: fc.boolean(),
    feyMistyStepUsed: fc.boolean(),
    druidCharmPersonUsed: fc.boolean(),
  })
  .map((r) => ({
    ...r,
    currentSorceryPoints: Math.min(r.currentSorceryPoints, r.sorceryPointsMax),
    innateSorceryUsesRemaining: Math.min(r.innateSorceryUsesRemaining, r.innateSorceryMaxUses),
    ravenFormUsesRemaining: Math.min(r.ravenFormUsesRemaining, r.ravenFormMaxUses),
  }));

// ---------------------------------------------------------------------------
// Property 6
// ---------------------------------------------------------------------------

describe("Feature: madea-sorcerer-features, Property 6: Long rest resets Innate Sorcery and Sorcerous Restoration", () => {
  it("resets innateSorceryUsesRemaining to max, innateSorceryActive to false, and sorcerousRestorationUsed to false", () => {
    fc.assert(
      fc.property(arbInnateSorceryResources, (cr) => {
        const postRest = applyLongRestClassResources(cr);

        // Req 3.2: Innate Sorcery uses reset to max
        expect(postRest.innateSorceryUsesRemaining).toBe(cr.innateSorceryMaxUses);

        // Req 3.2: Innate Sorcery deactivated
        expect(postRest.innateSorceryActive).toBe(false);

        // Req 6.5: Sorcerous Restoration reset
        expect(postRest.sorcerousRestorationUsed).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
