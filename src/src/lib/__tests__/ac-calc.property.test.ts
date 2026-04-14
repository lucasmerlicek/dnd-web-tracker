import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculateAC, ACInputs } from "../ac-calc";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generate arbitrary ACInputs with shield and mage armor OFF. */
const arbACInputsOff: fc.Arbitrary<ACInputs> = fc.record({
  defaultBaseAc: fc.integer({ min: 5, max: 25 }),
  dexModifier: fc.integer({ min: -5, max: 10 }),
  mageArmorActive: fc.constant(false),
  shieldActive: fc.constant(false),
  bladesongActive: fc.boolean(),
  intModifier: fc.integer({ min: -5, max: 10 }),
  gearAcBonuses: fc.array(fc.integer({ min: -3, max: 5 }), {
    minLength: 0,
    maxLength: 5,
  }),
});

// ---------------------------------------------------------------------------
// Property 10: AC toggle round-trip
// ---------------------------------------------------------------------------

describe("Feature: dnd-tracker-enhancements, Property 10: AC toggle round-trip", () => {
  /**
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
   *
   * Toggling Shield on then off returns AC to its pre-toggle value.
   */
  it("toggling Shield on then off returns AC to pre-toggle value", () => {
    fc.assert(
      fc.property(arbACInputsOff, (baseInputs) => {
        // 1. Calculate AC with shield OFF
        const acBefore = calculateAC(baseInputs);

        // 2. Calculate AC with shield ON
        const shieldOn: ACInputs = { ...baseInputs, shieldActive: true };
        const acDuring = calculateAC(shieldOn);

        // 3. Calculate AC with shield OFF again
        const acAfter = calculateAC({ ...baseInputs, shieldActive: false });

        // Round-trip: AC returns to pre-toggle value
        expect(acAfter.ac).toBe(acBefore.ac);
        expect(acAfter.baseAc).toBe(acBefore.baseAc);

        // Shield should have added +5 while active
        expect(acDuring.ac).toBe(acBefore.ac + 5);
        // Shield does not change baseAc
        expect(acDuring.baseAc).toBe(acBefore.baseAc);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
   *
   * Toggling Mage Armor on then off returns both baseAc and ac to
   * their pre-toggle values.
   */
  it("toggling Mage Armor on then off returns AC to pre-toggle value", () => {
    fc.assert(
      fc.property(arbACInputsOff, (baseInputs) => {
        // 1. Calculate AC with mage armor OFF
        const acBefore = calculateAC(baseInputs);

        // 2. Calculate AC with mage armor ON
        const mageArmorOn: ACInputs = {
          ...baseInputs,
          mageArmorActive: true,
        };
        const acDuring = calculateAC(mageArmorOn);

        // 3. Calculate AC with mage armor OFF again
        const acAfter = calculateAC({
          ...baseInputs,
          mageArmorActive: false,
        });

        // Round-trip: AC returns to pre-toggle value
        expect(acAfter.ac).toBe(acBefore.ac);
        expect(acAfter.baseAc).toBe(acBefore.baseAc);

        // Mage Armor sets baseAc to 13 + dexModifier
        expect(acDuring.baseAc).toBe(13 + baseInputs.dexModifier);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
   *
   * calculateAC is deterministic: the same inputs always produce the
   * same output.
   */
  it("same inputs always produce the same output (determinism)", () => {
    fc.assert(
      fc.property(
        fc.record({
          defaultBaseAc: fc.integer({ min: 5, max: 25 }),
          dexModifier: fc.integer({ min: -5, max: 10 }),
          mageArmorActive: fc.boolean(),
          shieldActive: fc.boolean(),
          bladesongActive: fc.boolean(),
          intModifier: fc.integer({ min: -5, max: 10 }),
          gearAcBonuses: fc.array(fc.integer({ min: -3, max: 5 }), {
            minLength: 0,
            maxLength: 5,
          }),
        }),
        (inputs: ACInputs) => {
          const result1 = calculateAC(inputs);
          const result2 = calculateAC(inputs);

          expect(result1.ac).toBe(result2.ac);
          expect(result1.baseAc).toBe(result2.baseAc);
        }
      ),
      { numRuns: 100 }
    );
  });
});
