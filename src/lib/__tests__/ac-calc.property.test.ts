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
  it("toggling Shield on then off returns AC to pre-toggle value", () => {
    fc.assert(
      fc.property(arbACInputsOff, (baseInputs) => {
        const acBefore = calculateAC(baseInputs);
        const shieldOn: ACInputs = { ...baseInputs, shieldActive: true };
        const acDuring = calculateAC(shieldOn);
        const acAfter = calculateAC({ ...baseInputs, shieldActive: false });

        expect(acAfter.ac).toBe(acBefore.ac);
        expect(acAfter.baseAc).toBe(acBefore.baseAc);
        expect(acDuring.ac).toBe(acBefore.ac + 5);
        expect(acDuring.baseAc).toBe(acBefore.baseAc);
      }),
      { numRuns: 100 }
    );
  });

  it("toggling Mage Armor on then off returns AC to pre-toggle value", () => {
    fc.assert(
      fc.property(arbACInputsOff, (baseInputs) => {
        const acBefore = calculateAC(baseInputs);
        const mageArmorOn: ACInputs = { ...baseInputs, mageArmorActive: true };
        const acDuring = calculateAC(mageArmorOn);
        const acAfter = calculateAC({ ...baseInputs, mageArmorActive: false });

        expect(acAfter.ac).toBe(acBefore.ac);
        expect(acAfter.baseAc).toBe(acBefore.baseAc);
        expect(acDuring.baseAc).toBe(13 + baseInputs.dexModifier);
      }),
      { numRuns: 100 }
    );
  });

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
