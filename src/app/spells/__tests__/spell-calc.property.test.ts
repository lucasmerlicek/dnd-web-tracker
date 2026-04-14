import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { AbilityName } from "@/types/character";
import type { SpellData } from "@/types/spell";
import { METAMAGIC_OPTIONS } from "@/types/spell";
import {
  calcSpellAttackBonus,
  calcSpellSaveDC,
  calcCantripDice,
  calcUpcastDamage,
  canRitualCast,
  consumeSpellSlot,
  applyMetamagic,
  parseDiceExpression,
} from "../spell-calc";

// --- Shared Arbitraries ---

const abilityNameArb: fc.Arbitrary<AbilityName> = fc.constantFrom(
  "STR",
  "DEX",
  "CON",
  "INT",
  "WIS",
  "CHA"
);

const proficiencyArb = fc.integer({ min: 1, max: 6 });
const modifierArb = fc.integer({ min: -5, max: 5 });

/** Generate a full stats record with a controlled modifier for a specific ability. */
function statsArb(
  ability: AbilityName,
  modifier: number
): fc.Arbitrary<Record<AbilityName, { value: number; modifier: number }>> {
  return fc
    .record({
      STR: modifierArb,
      DEX: modifierArb,
      CON: modifierArb,
      INT: modifierArb,
      WIS: modifierArb,
      CHA: modifierArb,
    })
    .map((mods) => {
      const stats = {} as Record<
        AbilityName,
        { value: number; modifier: number }
      >;
      for (const key of Object.keys(mods) as AbilityName[]) {
        const mod = key === ability ? modifier : mods[key];
        stats[key] = { value: 10 + mod * 2, modifier: mod };
      }
      return stats;
    });
}

const diceCountArb = fc.integer({ min: 1, max: 12 });
const diceSidesArb = fc.constantFrom(4, 6, 8, 10, 12, 20);
const characterLevelArb = fc.integer({ min: 1, max: 20 });

const slotLevelArb = fc.constantFrom(
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th"
);

const metamagicOptionArb = fc.constantFrom(
  "empowered" as const,
  "quickened" as const
);

// --- Property 2: Spell attack bonus calculation ---
// Feature: enhanced-spell-system, Property 2: Spell attack bonus calculation

describe("Spell calculation property tests", () => {
  it("Property 2: Spell attack bonus equals proficiency + ability modifier", () => {
    /**
     * **Validates: Requirements 3.2, 3.3**
     *
     * For any valid proficiency bonus (1–6) and any valid ability modifier (−5 to +5),
     * calcSpellAttackBonus returns exactly proficiency + stats[ability].modifier.
     */
    fc.assert(
      fc.property(
        proficiencyArb,
        abilityNameArb,
        modifierArb,
        (proficiency, ability, modifier) => {
          const stats = {} as Record<
            AbilityName,
            { value: number; modifier: number }
          >;
          for (const name of [
            "STR",
            "DEX",
            "CON",
            "INT",
            "WIS",
            "CHA",
          ] as AbilityName[]) {
            stats[name] = {
              value: 10,
              modifier: name === ability ? modifier : 0,
            };
          }

          const result = calcSpellAttackBonus(proficiency, ability, stats);
          expect(result).toBe(proficiency + modifier);
        }
      ),
      { numRuns: 100 }
    );
  });

  // --- Property 3: Spell save DC calculation ---
  // Feature: enhanced-spell-system, Property 3: Spell save DC calculation

  it("Property 3: Spell save DC equals 8 + proficiency + ability modifier", () => {
    /**
     * **Validates: Requirements 5.2**
     *
     * For any valid proficiency bonus (1–6) and any valid ability modifier (−5 to +5),
     * calcSpellSaveDC returns exactly 8 + proficiency + stats[ability].modifier.
     */
    fc.assert(
      fc.property(
        proficiencyArb,
        abilityNameArb,
        modifierArb,
        (proficiency, ability, modifier) => {
          const stats = {} as Record<
            AbilityName,
            { value: number; modifier: number }
          >;
          for (const name of [
            "STR",
            "DEX",
            "CON",
            "INT",
            "WIS",
            "CHA",
          ] as AbilityName[]) {
            stats[name] = {
              value: 10,
              modifier: name === ability ? modifier : 0,
            };
          }

          const result = calcSpellSaveDC(proficiency, ability, stats);
          expect(result).toBe(8 + proficiency + modifier);
        }
      ),
      { numRuns: 100 }
    );
  });

  // --- Property 4: Cantrip damage scaling ---
  // Feature: enhanced-spell-system, Property 4: Cantrip damage scaling

  it("Property 4: Cantrip dice count equals base count × scaling multiplier, die size unchanged", () => {
    /**
     * **Validates: Requirements 4.3**
     *
     * For any cantrip with a base damage dice expression and any character level (1–20),
     * calcCantripDice returns a dice expression whose count equals the base count
     * multiplied by the cantrip scaling multiplier (1 at 1–4, 2 at 5–10, 3 at 11–16,
     * 4 at 17–20), with the die size unchanged.
     */
    fc.assert(
      fc.property(
        diceCountArb,
        diceSidesArb,
        characterLevelArb,
        (baseCount, sides, level) => {
          const baseDice = `${baseCount}d${sides}`;
          const result = calcCantripDice(baseDice, level);
          const parsed = parseDiceExpression(result);

          expect(parsed).not.toBeNull();

          let expectedMultiplier: number;
          if (level >= 17) expectedMultiplier = 4;
          else if (level >= 11) expectedMultiplier = 3;
          else if (level >= 5) expectedMultiplier = 2;
          else expectedMultiplier = 1;

          expect(parsed!.count).toBe(baseCount * expectedMultiplier);
          expect(parsed!.sides).toBe(sides);
        }
      ),
      { numRuns: 100 }
    );
  });

  // --- Property 5: Upcast damage calculation ---
  // Feature: enhanced-spell-system, Property 5: Upcast damage calculation

  it("Property 5: Upcast dice count equals baseCount + (castLevel - baseLevel) × perLevelCount, die size unchanged", () => {
    /**
     * **Validates: Requirements 6.2**
     *
     * For any spell with base damage dice, a base spell level, a cast level strictly
     * greater than the base level, and an upcast perLevel dice expression,
     * calcUpcastDamage returns a dice expression whose count equals the base count
     * plus (castLevel - baseLevel) * perLevel count, with the die size unchanged.
     */
    fc.assert(
      fc.property(
        diceCountArb,
        diceSidesArb,
        fc.integer({ min: 1, max: 8 }),
        fc.integer({ min: 1, max: 8 }),
        diceCountArb,
        (baseCount, sides, baseLevel, levelDiff, perLevelCount) => {
          const castLevel = baseLevel + levelDiff; // guarantees castLevel > baseLevel
          if (castLevel > 9) return; // skip invalid D&D levels

          const baseDamage = `${baseCount}d${sides}`;
          const perLevel = `${perLevelCount}d${sides}`;
          const result = calcUpcastDamage(
            baseDamage,
            baseLevel,
            castLevel,
            perLevel
          );
          const parsed = parseDiceExpression(result);

          expect(parsed).not.toBeNull();
          expect(parsed!.count).toBe(
            baseCount + (castLevel - baseLevel) * perLevelCount
          );
          expect(parsed!.sides).toBe(sides);
        }
      ),
      { numRuns: 100 }
    );
  });

  // --- Property 6: Spell slot consumption ---
  // Feature: enhanced-spell-system, Property 6: Spell slot consumption

  it("Property 6: Slot consumption succeeds with decrement when slots >= 1, fails when slots = 0", () => {
    /**
     * **Validates: Requirements 6.3, 6.4, 8.1, 8.3**
     *
     * For any spell slot state where the slot count at a given level is at least 1,
     * consumeSpellSlot returns success with the slot count decremented by exactly 1
     * and all other levels unchanged. When the slot count is 0, it returns failure.
     */
    fc.assert(
      fc.property(
        fc.record({
          "1st": fc.integer({ min: 0, max: 4 }),
          "2nd": fc.integer({ min: 0, max: 4 }),
          "3rd": fc.integer({ min: 0, max: 4 }),
          "4th": fc.integer({ min: 0, max: 4 }),
          "5th": fc.integer({ min: 0, max: 4 }),
          "6th": fc.integer({ min: 0, max: 4 }),
          "7th": fc.integer({ min: 0, max: 4 }),
          "8th": fc.integer({ min: 0, max: 4 }),
          "9th": fc.integer({ min: 0, max: 4 }),
        }),
        slotLevelArb,
        (slots, level) => {
          const result = consumeSpellSlot(slots, level);

          if (slots[level] >= 1) {
            expect(result.success).toBe(true);
            expect(result.newSlots[level]).toBe(slots[level] - 1);
            // All other levels unchanged
            for (const otherLevel of Object.keys(slots)) {
              if (otherLevel !== level) {
                expect(result.newSlots[otherLevel]).toBe(slots[otherLevel]);
              }
            }
          } else {
            expect(result.success).toBe(false);
            expect(result.newSlots[level]).toBe(slots[level]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // --- Property 7: Ritual casting class rules ---
  // Feature: enhanced-spell-system, Property 7: Ritual casting class rules

  it("Property 7: Wizard can ritual-cast any ritual spell; Sorcerer cannot ritual-cast", () => {
    /**
     * **Validates: Requirements 7.3, 7.4**
     *
     * For any spell with ritual: true, canRitualCast returns true for a Wizard
     * regardless of whether the spell is in the prepared spell list.
     * For any spell and a Sorcerer character, canRitualCast returns false.
     */
    const spellNameArb = fc.string({ minLength: 1, maxLength: 20 });
    const preparedListArb = fc.array(
      fc.string({ minLength: 1, maxLength: 20 }),
      { minLength: 0, maxLength: 10 }
    );

    const ritualSpellArb: fc.Arbitrary<SpellData> = fc.record({
      name: spellNameArb,
      level: fc.integer({ min: 1, max: 9 }),
      school: fc.constantFrom(
        "Abjuration" as const,
        "Conjuration" as const,
        "Divination" as const,
        "Enchantment" as const,
        "Evocation" as const,
        "Illusion" as const,
        "Necromancy" as const,
        "Transmutation" as const
      ),
      castingTime: fc.constant("1 action"),
      range: fc.constant("30 feet"),
      components: fc.constant({ verbal: true, somatic: true, material: false }),
      duration: fc.constant("Instantaneous"),
      description: fc.constant("A ritual spell."),
      ritual: fc.constant(true as const),
    });

    // Wizard can ritual-cast any ritual spell regardless of preparation
    fc.assert(
      fc.property(
        ritualSpellArb,
        preparedListArb,
        spellNameArb,
        (spell, prepared, name) => {
          const result = canRitualCast(spell, "Wizard", prepared, name);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );

    // Sorcerer cannot ritual-cast
    fc.assert(
      fc.property(
        ritualSpellArb,
        preparedListArb,
        spellNameArb,
        (spell, prepared, name) => {
          const result = canRitualCast(spell, "Sorcerer", prepared, name);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 7b: Non-ritual spells cannot be ritual-cast by any class", () => {
    /**
     * **Validates: Requirements 7.3, 7.4**
     *
     * For any spell with ritual: false (or undefined), canRitualCast returns false
     * regardless of class.
     */
    const nonRitualSpellArb: fc.Arbitrary<SpellData> = fc.record({
      name: fc.string({ minLength: 1, maxLength: 20 }),
      level: fc.integer({ min: 1, max: 9 }),
      school: fc.constantFrom(
        "Abjuration" as const,
        "Conjuration" as const,
        "Divination" as const,
        "Enchantment" as const,
        "Evocation" as const,
        "Illusion" as const,
        "Necromancy" as const,
        "Transmutation" as const
      ),
      castingTime: fc.constant("1 action"),
      range: fc.constant("30 feet"),
      components: fc.constant({ verbal: true, somatic: true, material: false }),
      duration: fc.constant("Instantaneous"),
      description: fc.constant("A non-ritual spell."),
      ritual: fc.constant(false as const),
    });

    const classArb = fc.constantFrom("Wizard", "Sorcerer");

    fc.assert(
      fc.property(nonRitualSpellArb, classArb, (spell, charClass) => {
        const result = canRitualCast(spell, charClass, [], spell.name);
        expect(result).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  // --- Property 8: Metamagic sorcery point consumption ---
  // Feature: enhanced-spell-system, Property 8: Metamagic sorcery point consumption

  it("Property 8: Metamagic succeeds with newSP = currentSP - cost when SP >= cost, fails with unchanged SP otherwise", () => {
    /**
     * **Validates: Requirements 9.3, 9.4, 9.6, 9.7**
     *
     * For any Metamagic option and any current sorcery point total,
     * applyMetamagic returns success with newSP = currentSP - cost when
     * currentSP >= cost, and failure with newSP unchanged when currentSP < cost.
     */
    fc.assert(
      fc.property(
        metamagicOptionArb,
        fc.integer({ min: 0, max: 20 }),
        (option, currentSP) => {
          const cost = METAMAGIC_OPTIONS[option].cost;
          const result = applyMetamagic(option, currentSP);

          if (currentSP >= cost) {
            expect(result.success).toBe(true);
            expect(result.newSP).toBe(currentSP - cost);
          } else {
            expect(result.success).toBe(false);
            expect(result.newSP).toBe(currentSP);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
