import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { SpellData, SpellSchool } from "@/types/spell";
import type { AbilityName } from "@/types/character";

// Feature: enhanced-spell-system, Property 9: Spell data serialization round-trip

/**
 * Property 9: Spell data serialization round-trip
 *
 * For any valid SpellData object (including those with upcast configurations,
 * damage dice, save types, and ritual flags), JSON.parse(JSON.stringify(spellData))
 * shall produce an object deeply equal to the original.
 *
 * **Validates: Requirements 10.1, 10.2**
 */

// --- Arbitraries ---

const spellSchoolArb: fc.Arbitrary<SpellSchool> = fc.constantFrom(
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation"
);

const abilityNameArb: fc.Arbitrary<AbilityName> = fc.constantFrom(
  "STR",
  "DEX",
  "CON",
  "INT",
  "WIS",
  "CHA"
);

const diceExpressionArb = fc.tuple(
  fc.integer({ min: 1, max: 12 }),
  fc.constantFrom(4, 6, 8, 10, 12)
).map(([count, sides]) => `${count}d${sides}`);

const componentsArb = fc.record(
  {
    verbal: fc.boolean(),
    somatic: fc.boolean(),
    material: fc.boolean(),
    materialDescription: fc.string({ minLength: 1, maxLength: 50 }),
  },
  { requiredKeys: ["verbal", "somatic", "material"] }
);

const spellDataArb: fc.Arbitrary<SpellData> = fc.record(
  {
    name: fc.string({ minLength: 1, maxLength: 40 }),
    level: fc.integer({ min: 0, max: 9 }),
    school: spellSchoolArb,
    castingTime: fc.constantFrom("1 action", "1 bonus action", "1 reaction", "1 minute", "10 minutes"),
    range: fc.constantFrom("Self", "Touch", "30 feet", "60 feet", "120 feet", "150 feet"),
    components: componentsArb,
    duration: fc.constantFrom("Instantaneous", "1 round", "Concentration, up to 1 minute", "1 hour", "8 hours"),
    description: fc.string({ minLength: 1, maxLength: 200 }),
    damageDice: diceExpressionArb,
    damageType: fc.constantFrom("fire", "cold", "lightning", "thunder", "acid", "poison", "necrotic", "radiant", "force"),
    saveType: abilityNameArb,
    attackRoll: fc.boolean(),
    ritual: fc.boolean(),
    upcast: fc.record({ perLevel: diceExpressionArb }),
    cantripScaling: fc.boolean(),
  },
  {
    requiredKeys: ["name", "level", "school", "castingTime", "range", "components", "duration", "description"],
  }
);

// --- Property Test ---

describe("SpellData JSON round-trip", () => {
  it("Property 9: Spell data serialization round-trip", () => {
    /**
     * **Validates: Requirements 10.1, 10.2**
     *
     * Serializing a SpellData object to JSON and parsing it back
     * must produce a deeply equal object. This ensures all fields
     * (including optional upcast configurations, damage dice, save types,
     * and ritual flags) survive the round-trip without data loss.
     */
    fc.assert(
      fc.property(spellDataArb, (original: SpellData) => {
        const serialized = JSON.stringify(original);
        const deserialized = JSON.parse(serialized) as SpellData;
        expect(deserialized).toEqual(original);
      }),
      { numRuns: 200 }
    );
  });
});
