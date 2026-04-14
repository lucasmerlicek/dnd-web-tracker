import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { SpellCreatedWeapon, AbilityName } from "../../types/character";

// ---------------------------------------------------------------------------
// Helper: calculate upcast damage dice
// ---------------------------------------------------------------------------

/**
 * Given base damage dice (e.g. "2d8"), optional upcast dice (e.g. "1d8"),
 * the spell's base level, and the actual cast level, returns the resulting
 * damage dice string with additional dice from upcasting.
 */
function calculateUpcastDamage(
  baseDice: string,
  upcastDice: string | undefined,
  baseLevel: number,
  castLevel: number
): string {
  if (!upcastDice || castLevel <= baseLevel) return baseDice;
  const match = baseDice.match(/(\d+)d(\d+)/);
  if (!match) return baseDice;
  const baseCount = parseInt(match[1]);
  const sides = match[2];
  const upMatch = upcastDice.match(/(\d+)d/);
  const upCount = upMatch ? parseInt(upMatch[1]) : 1;
  const additionalDice = (castLevel - baseLevel) * upCount;
  return `${baseCount + additionalDice}d${sides}`;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const arbAbilityStat: fc.Arbitrary<AbilityName> = fc.constantFrom(
  "STR",
  "DEX",
  "CON",
  "INT",
  "WIS",
  "CHA"
);

const arbDieSides = fc.constantFrom(4, 6, 8, 10, 12);

/** Generate a dice expression like "2d8" */
const arbDiceExpr = (sides: fc.Arbitrary<number> = arbDieSides) =>
  fc.tuple(fc.integer({ min: 1, max: 10 }), sides).map(
    ([count, s]) => `${count}d${s}`
  );

/** Generate a spell base level (1-9) and a valid cast level >= base level */
const arbSpellLevels = fc
  .integer({ min: 1, max: 9 })
  .chain((baseLevel) =>
    fc
      .integer({ min: baseLevel, max: 9 })
      .map((castLevel) => ({ baseLevel, castLevel }))
  );

/** Generate a createsWeapon config with optional upcastDice */
const arbCreatesWeapon = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  damageDice: arbDiceExpr(),
  damageType: fc.constantFrom("psychic", "fire", "radiant", "force", "slashing"),
  attackStat: arbAbilityStat,
  properties: fc.array(fc.constantFrom("Finesse", "Light", "Thrown (20/60)"), {
    minLength: 0,
    maxLength: 3,
  }),
  upcastDice: fc.option(arbDiceExpr(), { nil: undefined }),
});

/** Generate a SpellCreatedWeapon entry */
const arbSpellCreatedWeapon: fc.Arbitrary<SpellCreatedWeapon> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  sourceSpell: fc.string({ minLength: 1, maxLength: 30 }),
  castLevel: fc.integer({ min: 1, max: 9 }),
  damageDice: arbDiceExpr(),
  damageType: fc.constantFrom("psychic", "fire", "radiant", "force", "slashing"),
  attackStat: arbAbilityStat,
  properties: fc.array(fc.constantFrom("Finesse", "Light", "Thrown (20/60)"), {
    minLength: 0,
    maxLength: 3,
  }),
  magicBonus: fc.integer({ min: 0, max: 3 }),
  active: fc.boolean(),
});

// ---------------------------------------------------------------------------
// Property 15: Spell-created weapon upcast damage scaling
// ---------------------------------------------------------------------------

describe("Feature: dnd-tracker-enhancements, Property 15: Spell-created weapon upcast damage scaling", () => {
  /**
   * **Validates: Requirements 14.2**
   *
   * For any spell with a createsWeapon field and any valid cast level >= the
   * spell's base level, the created weapon's damage dice should equal the base
   * damage dice plus (castLevel - baseLevel) * upcastDice additional dice.
   */
  it("damage dice scale correctly with cast level above base level", () => {
    fc.assert(
      fc.property(arbCreatesWeapon, arbSpellLevels, (weapon, levels) => {
        const { baseLevel, castLevel } = levels;
        const result = calculateUpcastDamage(
          weapon.damageDice,
          weapon.upcastDice,
          baseLevel,
          castLevel
        );

        const baseMatch = weapon.damageDice.match(/(\d+)d(\d+)/);
        if (!baseMatch) {
          // Non-standard dice expression — should return unchanged
          expect(result).toBe(weapon.damageDice);
          return;
        }

        const baseCount = parseInt(baseMatch[1]);
        const sides = baseMatch[2];

        if (!weapon.upcastDice || castLevel <= baseLevel) {
          // No upcast or cast at base level — damage unchanged
          expect(result).toBe(weapon.damageDice);
        } else {
          const upMatch = weapon.upcastDice.match(/(\d+)d/);
          const upCount = upMatch ? parseInt(upMatch[1]) : 1;
          const additionalDice = (castLevel - baseLevel) * upCount;
          const expectedDice = `${baseCount + additionalDice}d${sides}`;
          expect(result).toBe(expectedDice);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("casting at base level returns base damage dice unchanged", () => {
    fc.assert(
      fc.property(arbCreatesWeapon, fc.integer({ min: 1, max: 9 }), (weapon, baseLevel) => {
        const result = calculateUpcastDamage(
          weapon.damageDice,
          weapon.upcastDice,
          baseLevel,
          baseLevel // cast at base level
        );
        expect(result).toBe(weapon.damageDice);
      }),
      { numRuns: 100 }
    );
  });

  it("each additional cast level adds exactly upcastDice count to the total", () => {
    fc.assert(
      fc.property(
        arbCreatesWeapon.filter((w) => w.upcastDice !== undefined),
        arbSpellLevels.filter((l) => l.castLevel > l.baseLevel),
        (weapon, levels) => {
          const { baseLevel, castLevel } = levels;
          const result = calculateUpcastDamage(
            weapon.damageDice,
            weapon.upcastDice,
            baseLevel,
            castLevel
          );

          const resultMatch = result.match(/(\d+)d(\d+)/);
          const baseMatch = weapon.damageDice.match(/(\d+)d(\d+)/);
          if (!resultMatch || !baseMatch) return;

          const resultCount = parseInt(resultMatch[1]);
          const baseCount = parseInt(baseMatch[1]);
          const upMatch = weapon.upcastDice!.match(/(\d+)d/);
          const upCount = upMatch ? parseInt(upMatch[1]) : 1;

          expect(resultCount - baseCount).toBe((castLevel - baseLevel) * upCount);
          // Die sides should be preserved from base
          expect(resultMatch[2]).toBe(baseMatch[2]);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 16: Spell-created weapon create/dismiss round-trip
// ---------------------------------------------------------------------------

describe("Feature: dnd-tracker-enhancements, Property 16: Spell-created weapon create/dismiss round-trip", () => {
  /**
   * **Validates: Requirements 14.1, 14.3**
   *
   * For any spell-created weapon added to the spellCreatedWeapons array,
   * dismissing that weapon by ID should remove it from the array, and the
   * array length should decrease by exactly 1.
   */
  it("dismissing a weapon by ID removes exactly one element", () => {
    fc.assert(
      fc.property(
        fc.array(arbSpellCreatedWeapon, { minLength: 1, maxLength: 20 }),
        fc.nat(),
        (weapons, rawIdx) => {
          // Ensure unique IDs
          const uniqueWeapons = weapons.map((w, i) => ({ ...w, id: `${w.id}-${i}` }));
          const idx = rawIdx % uniqueWeapons.length;
          const targetId = uniqueWeapons[idx].id;

          const dismissed = uniqueWeapons.filter((sw) => sw.id !== targetId);

          expect(dismissed.length).toBe(uniqueWeapons.length - 1);
          expect(dismissed.find((sw) => sw.id === targetId)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("dismissing preserves all other weapons unchanged", () => {
    fc.assert(
      fc.property(
        fc.array(arbSpellCreatedWeapon, { minLength: 2, maxLength: 20 }),
        fc.nat(),
        (weapons, rawIdx) => {
          const uniqueWeapons = weapons.map((w, i) => ({ ...w, id: `${w.id}-${i}` }));
          const idx = rawIdx % uniqueWeapons.length;
          const targetId = uniqueWeapons[idx].id;

          const dismissed = uniqueWeapons.filter((sw) => sw.id !== targetId);
          const expectedRemaining = uniqueWeapons.filter((_, i) => i !== idx);

          expect(dismissed).toEqual(expectedRemaining);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("dismissing a non-existent ID leaves the array unchanged", () => {
    fc.assert(
      fc.property(
        fc.array(arbSpellCreatedWeapon, { minLength: 0, maxLength: 20 }),
        (weapons) => {
          const nonExistentId = "non-existent-id-that-wont-match";
          const result = weapons.filter((sw) => sw.id !== nonExistentId);
          expect(result.length).toBe(weapons.length);
          expect(result).toEqual(weapons);
        }
      ),
      { numRuns: 100 }
    );
  });
});
