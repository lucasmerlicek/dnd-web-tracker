import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { spendHitDie, longRestRestore } from "../hit-dice";
import type { HitDicePool } from "../../types/character";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const dndClassNames = [
  "Fighter", "Wizard", "Rogue", "Cleric", "Barbarian", "Sorcerer",
  "Paladin", "Ranger", "Bard", "Warlock", "Druid", "Monk",
];

const arbHitDicePool: fc.Arbitrary<HitDicePool> = fc
  .record({
    className: fc.constantFrom(...dndClassNames),
    dieSize: fc.constantFrom(6, 8, 10, 12),
    total: fc.integer({ min: 1, max: 20 }),
  })
  .chain(({ className, dieSize, total }) =>
    fc.integer({ min: 0, max: total }).map((available) => ({
      className, dieSize, total, available,
    }))
  );

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
              className: name, dieSize, total, available,
            }))
          )
      )
    )
  );

// ---------------------------------------------------------------------------
// Property 7: Hit dice pool spend correctness
// ---------------------------------------------------------------------------

describe("Feature: dnd-tracker-enhancements, Property 7: Hit dice pool spend correctness", () => {
  it("spending decrements only the target pool by 1, others unchanged", () => {
    fc.assert(
      fc.property(arbPools, (pools) => {
        const targetIdx = Math.floor(Math.random() * pools.length);
        const target = pools[targetIdx];
        const result = spendHitDie(pools, target.className);

        if (target.available === 0) {
          expect(result).toBeNull();
        } else {
          expect(result).not.toBeNull();
          const updated = result!;
          expect(updated.length).toBe(pools.length);

          for (let i = 0; i < pools.length; i++) {
            if (pools[i].className === target.className) {
              expect(updated[i].available).toBe(pools[i].available - 1);
              expect(updated[i].className).toBe(pools[i].className);
              expect(updated[i].dieSize).toBe(pools[i].dieSize);
              expect(updated[i].total).toBe(pools[i].total);
            } else {
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
  it("restores floor(total/2) dice (min 1), no pool exceeds its total", () => {
    fc.assert(
      fc.property(arbPools, (pools) => {
        const result = longRestRestore(pools);
        expect(result.length).toBe(pools.length);

        const totalDice = pools.reduce((sum, p) => sum + p.total, 0);
        const maxRestorable = Math.max(1, Math.floor(totalDice / 2));
        const totalRestored = result.reduce(
          (sum, p, i) => sum + (p.available - pools[i].available), 0
        );
        const totalMissing = pools.reduce(
          (sum, p) => sum + (p.total - p.available), 0
        );

        expect(totalRestored).toBeLessThanOrEqual(maxRestorable);
        expect(totalRestored).toBe(Math.min(maxRestorable, totalMissing));

        for (let i = 0; i < result.length; i++) {
          expect(result[i].available).toBeLessThanOrEqual(result[i].total);
          expect(result[i].available).toBeGreaterThanOrEqual(pools[i].available);
          expect(result[i].className).toBe(pools[i].className);
          expect(result[i].dieSize).toBe(pools[i].dieSize);
          expect(result[i].total).toBe(pools[i].total);
        }
      }),
      { numRuns: 100 }
    );
  });
});
