import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { ClassResources } from "../../types/character";

// ---------------------------------------------------------------------------
// Pure helper functions mirroring Sorcerous Restoration logic from dashboard
// ---------------------------------------------------------------------------

/**
 * Apply Sorcerous Restoration: adds floor(level / 2) SP, capped at max.
 * Sets sorcerousRestorationUsed to true.
 * Returns null if preconditions are not met.
 */
function applySorcerousRestoration(
  cr: ClassResources,
  level: number
): ClassResources | null {
  if (cr.sorceryPointsMax === undefined) return null;
  if (cr.sorcerousRestorationUsed) return null;

  const restore = Math.floor(level / 2);
  const newSP = Math.min(
    cr.sorceryPointsMax,
    (cr.currentSorceryPoints ?? 0) + restore
  );

  return {
    ...cr,
    currentSorceryPoints: newSP,
    sorcerousRestorationUsed: true,
  };
}

/**
 * Apply short rest without Sorcerous Restoration.
 * Returns class resources unchanged (relative to SP and used flag).
 */
function applyShortRestWithoutRestoration(cr: ClassResources): ClassResources {
  // Other short rest effects (hit dice, action recharge) don't touch these fields
  return { ...cr };
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generate valid state for Sorcerous Restoration (has SP max, not yet used). */
const arbRestorableState = fc
  .record({
    sorceryPointsMax: fc.integer({ min: 1, max: 20 }),
    currentSorceryPoints: fc.integer({ min: 0, max: 20 }),
    sorcerousRestorationUsed: fc.constant(false),
  })
  .map((r) => ({
    ...r,
    currentSorceryPoints: Math.min(r.currentSorceryPoints, r.sorceryPointsMax),
  } as ClassResources));

/** Generate any valid sorcerer class resources state. */
const arbAnySorcererState = fc
  .record({
    sorceryPointsMax: fc.integer({ min: 1, max: 20 }),
    currentSorceryPoints: fc.integer({ min: 0, max: 20 }),
    sorcerousRestorationUsed: fc.boolean(),
  })
  .map((r) => ({
    ...r,
    currentSorceryPoints: Math.min(r.currentSorceryPoints, r.sorceryPointsMax),
  } as ClassResources));

// ---------------------------------------------------------------------------
// Property 12: Sorcerous Restoration applies correct SP recovery
// ---------------------------------------------------------------------------

describe("Feature: madea-sorcerer-features, Property 12: Sorcerous Restoration applies correct SP recovery", () => {
  /**
   * **Validates: Requirements 6.2, 6.3**
   *
   * For any character level (1-20), starting SP (0..max), max SP (1-20),
   * applying Sorcerous Restoration should produce:
   * - result SP = min(max, current + floor(level/2))
   * - sorcerousRestorationUsed = true
   */
  it("adds floor(level/2) SP capped at max and sets used flag", () => {
    fc.assert(
      fc.property(
        arbRestorableState,
        fc.integer({ min: 1, max: 20 }), // character level
        (cr, level) => {
          const result = applySorcerousRestoration(cr, level);
          expect(result).not.toBeNull();

          const restore = Math.floor(level / 2);
          const expectedSP = Math.min(
            cr.sorceryPointsMax!,
            (cr.currentSorceryPoints ?? 0) + restore
          );

          expect(result!.currentSorceryPoints).toBe(expectedSP);
          expect(result!.sorcerousRestorationUsed).toBe(true);

          // SP should never exceed max
          expect(result!.currentSorceryPoints).toBeLessThanOrEqual(cr.sorceryPointsMax!);

          // SP should be at least what it was before (restoration only adds)
          expect(result!.currentSorceryPoints).toBeGreaterThanOrEqual(cr.currentSorceryPoints ?? 0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Sorcerous Restoration opt-out preserves state
// ---------------------------------------------------------------------------

describe("Feature: madea-sorcerer-features, Property 13: Sorcerous Restoration opt-out preserves state", () => {
  /**
   * **Validates: Requirements 6.6**
   *
   * For any starting state, applying a short rest without Sorcerous
   * Restoration should leave both currentSorceryPoints and
   * sorcerousRestorationUsed unchanged.
   */
  it("preserves SP and used flag when restoration is not opted in", () => {
    fc.assert(
      fc.property(arbAnySorcererState, (cr) => {
        const result = applyShortRestWithoutRestoration(cr);

        expect(result.currentSorceryPoints).toBe(cr.currentSorceryPoints);
        expect(result.sorcerousRestorationUsed).toBe(cr.sorcerousRestorationUsed);
        expect(result.sorceryPointsMax).toBe(cr.sorceryPointsMax);
      }),
      { numRuns: 100 }
    );
  });
});
