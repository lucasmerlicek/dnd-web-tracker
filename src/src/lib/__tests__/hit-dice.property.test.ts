import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { spendHitDie, longRestRestore } from "../hit-dice";
import type { HitDicePool } from "../../types/character";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const dndClassNames = [
  "Fighter",
  "Wizard",
  "Rogue",
  "Cleric",
  "Barbarian",
  "Sorcerer",
  "Paladin",
  "Ranger",
  "Bard",
  "Warlock",
  "Druid",
  "Monk",
];

/** Generate a single valid HitDicePool where available <= total. */
const arbHitDicePool: fc.Arbitrary<HitDicePool> = fc
  .record({
    className: fc.constantFrom(...dndClassNames),
    dieSize: fc.constantFrom(6, 8, 10, 12),
    total: fc.integer({ min: 1, max: 20 }),
  })
  .chain(({ className, dieSize, total }) =>
    fc.integer({ min: 0, max: total }).map((available) => ({
      className,
      dieSize,
      total,
      available,
    }))
  );

/**
 * Generate a non-empty array of pools with unique class names.
 * Uniqueness ensures spendHitDie targets exactly one pool.
 */
const arbPools: fc.Arbitrary<HitDicePool[]> = fc
  .shuffledSubarray(dndClassNames, { minLength: 1 })
  .chain((names) =>
    fc.tuple(
      ...names.map((name) =>
        fc
          .record({
            dieSize: fc.constantFrom(6, 8, 10, 12) as fc.Arbitrary<number>,
            total: fc.integer({ min: 1, max: 20 }),
          })
          .chain(({ dieSize, total }) =>
            fc.integer({ min: 0, max: total }).map((available) => ({
              className: name,
              dieSize,
              total,
              available,
            }))
          )
      )
    )
  );


// ---------------------------------------------------------------------------
// Property 7: Hit dice pool spend correctness
// ---------------------------------------------------------------------------

describe("Feature: dnd-tracker-enhancements, Property 7: Hit dice pool spend correctness", () => {
  /**
   * **Validates: Requirements 6.1, 6.3**
   *
   * For any set of hit dice pools and any valid class name, spending a hit
   * die from that class should decrement only that pool's available count
   * by 1, leaving all other pools unchanged. Spending should fail (return
   * null) if the target pool has 0 available dice.
   */
  it("spending decrements only the target pool by 1, others unchanged", () => {
    fc.assert(
      fc.property(arbPools, (pools) => {
        // Pick a random pool from the generated set
        const targetIdx = Math.floor(Math.random() * pools.length);
        const target = pools[targetIdx];

        const result = spendHitDie(pools, target.className);

        if (target.available === 0) {
          // Should fail when pool has 0 available
          expect(result).toBeNull();
        } else {
          // Should succeed
          expect(result).not.toBeNull();
          const updated = result!;

          // Same number of pools
          expect(updated.length).toBe(pools.length);

          for (let i = 0; i < pools.length; i++) {
            if (pools[i].className === target.className) {
              // Target pool decremented by exactly 1
              expect(updated[i].available).toBe(pools[i].available - 1);
              // Other fields unchanged
              expect(updated[i].className).toBe(pools[i].className);
              expect(updated[i].dieSize).toBe(pools[i].dieSize);
              expect(updated[i].total).toBe(pools[i].total);
            } else {
              // Non-target pools completely unchanged
              expect(updated[i]).toEqual(pools[i]);
            }
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it("spending from a non-existent class returns null", () => {
    fc.assert(
      fc.property(arbPools, (pools) => {
        const result = spendHitDie(pools, "NonExistentClass_XYZ");
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Hit dice long rest restoration
// ---------------------------------------------------------------------------

describe("Feature: dnd-tracker-enhancements, Property 8: Hit dice long rest restoration", () => {
  /**
   * **Validates: Requirements 6.5**
   *
   * For any set of hit dice pools, long rest restoration should restore
   * floor(totalAcrossAllPools / 2) dice (minimum 1). No pool's available
   * should exceed its total after restoration.
   */
  it("restores floor(total/2) dice (min 1), no pool exceeds its total", () => {
    fc.assert(
      fc.property(arbPools, (pools) => {
        const result = longRestRestore(pools);

        // Same number of pools
        expect(result.length).toBe(pools.length);

        const totalDice = pools.reduce((sum, p) => sum + p.total, 0);
        const maxRestorable = Math.max(1, Math.floor(totalDice / 2));

        // Calculate how many dice were actually restored
        const totalRestored = result.reduce(
          (sum, p, i) => sum + (p.available - pools[i].available),
          0
        );

        // Total restored should not exceed the allowed amount
        expect(totalRestored).toBeLessThanOrEqual(maxRestorable);

        // Total restored should equal min(maxRestorable, totalMissing)
        const totalMissing = pools.reduce(
          (sum, p) => sum + (p.total - p.available),
          0
        );
        expect(totalRestored).toBe(Math.min(maxRestorable, totalMissing));

        for (let i = 0; i < result.length; i++) {
          // No pool's available exceeds its total
          expect(result[i].available).toBeLessThanOrEqual(result[i].total);
          // Available should not decrease
          expect(result[i].available).toBeGreaterThanOrEqual(
            pools[i].available
          );
          // Class name, die size, and total unchanged
          expect(result[i].className).toBe(pools[i].className);
          expect(result[i].dieSize).toBe(pools[i].dieSize);
          expect(result[i].total).toBe(pools[i].total);
        }
      }),
      { numRuns: 100 }
    );
  });
});
