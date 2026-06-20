import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { applyEmpoweredReroll, deductEmpoweredSp } from "../empowered-spell";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const VALID_DIE_SIDES = [4, 6, 8, 10, 12] as const;

const arbDieSides = fc.constantFrom(...VALID_DIE_SIDES);

/** Generate an array of die results (1..sides) for a given die size. */
function arbRolls(dieSides: fc.Arbitrary<number>) {
  return dieSides.chain((sides) =>
    fc.tuple(
      fc.constant(sides),
      fc.array(fc.integer({ min: 1, max: sides }), { minLength: 1, maxLength: 12 }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Property 8: Empowered Spell reroll preserves high dice and rerolls low dice
// ---------------------------------------------------------------------------

describe("Feature: madea-sorcerer-features, Property 8: Empowered Spell reroll preserves high dice and rerolls low dice", () => {
  /**
   * **Validates: Requirements 5.3, 5.4**
   *
   * For any array of die results and a die size, applying the Empowered Spell
   * reroll should leave unchanged every die whose value is strictly greater
   * than dieSides / 2, and should replace every die whose value is <= dieSides / 2
   * with a new value in the range [1, dieSides].
   */
  it("preserves dice above threshold and rerolls dice at or below threshold within valid range", () => {
    fc.assert(
      fc.property(arbRolls(arbDieSides), ([sides, rolls]) => {
        const threshold = sides / 2;
        // Use a deterministic RNG so we can verify the rerolled values
        let callIndex = 0;
        const rngValues = rolls.map((_, i) => ((i * 7 + 3) % sides) / sides); // deterministic [0,1) values
        const rng = () => rngValues[callIndex++];

        const newRolls = applyEmpoweredReroll(rolls, sides, rng);

        expect(newRolls.length).toBe(rolls.length);

        for (let i = 0; i < rolls.length; i++) {
          if (rolls[i] > threshold) {
            // High dice should be preserved
            expect(newRolls[i]).toBe(rolls[i]);
          } else {
            // Low dice should be rerolled to a value in [1, sides]
            expect(newRolls[i]).toBeGreaterThanOrEqual(1);
            expect(newRolls[i]).toBeLessThanOrEqual(sides);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("with default RNG, all rerolled values are in valid range [1, dieSides]", () => {
    fc.assert(
      fc.property(arbRolls(arbDieSides), ([sides, rolls]) => {
        const newRolls = applyEmpoweredReroll(rolls, sides);

        expect(newRolls.length).toBe(rolls.length);

        for (let i = 0; i < rolls.length; i++) {
          expect(newRolls[i]).toBeGreaterThanOrEqual(1);
          expect(newRolls[i]).toBeLessThanOrEqual(sides);

          if (rolls[i] > sides / 2) {
            expect(newRolls[i]).toBe(rolls[i]);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Empowered Spell deducts exactly 1 SP
// ---------------------------------------------------------------------------

describe("Feature: madea-sorcerer-features, Property 9: Empowered Spell deducts exactly 1 SP", () => {
  /**
   * **Validates: Requirements 5.2**
   *
   * For any currentSorceryPoints >= 1, using Empowered Spell should produce
   * a new SP value of currentSorceryPoints - 1.
   */
  it("deducts exactly 1 SP from any valid starting SP", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (sp) => {
        const newSp = deductEmpoweredSp(sp);
        expect(newSp).toBe(sp - 1);
      }),
      { numRuns: 100 },
    );
  });
});
