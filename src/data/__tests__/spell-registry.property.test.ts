// Feature: enhanced-spell-system, Property 1: Spell registry completeness and data consistency
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { SPELL_REGISTRY } from "@/data/spell-registry";
import { parseDiceExpression } from "@/app/spells/spell-calc";
import type { AbilityName } from "@/types/character";
import type { SpellSchool } from "@/types/spell";

// --- All spell names from both characters ---

const MADEA_CANTRIPS = ["Poison Spray", "Fire Bolt", "Mage Hand", "Infestation", "Message"];
const MADEA_SPELLS: Record<string, string[]> = {
  "1st": ["Mage Armor", "Shield", "Silvery Barbs", "Chromatic Orb", "Bane", "Thunderwave"],
  "2nd": ["Misty Step", "Darkness", "Aganazzar's Scorcher", "Web"],
  "3rd": ["Fear", "Lightning Bolt"],
};

const RAMIL_CANTRIPS = ["Guidance", "Mending", "Booming Blade", "Green Flame Blade", "Mage Hand", "Fire Bolt"];
const RAMIL_SPELLS: Record<string, string[]> = {
  "1st": ["Shield", "Absorb Elements", "Prot E&G", "Sleep", "Identify", "Mage Armor", "Burning Hands", "Ice Knife", "Charm Person", "Detect Magic"],
  "2nd": ["Misty Step", "Shadow Blade", "Invisibility"],
};

// Deduplicated list of all spell names
const ALL_SPELL_NAMES = [
  ...new Set([
    ...MADEA_CANTRIPS,
    ...Object.values(MADEA_SPELLS).flat(),
    ...RAMIL_CANTRIPS,
    ...Object.values(RAMIL_SPELLS).flat(),
  ]),
];

const VALID_ABILITY_NAMES: AbilityName[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const VALID_SCHOOLS: SpellSchool[] = [
  "Abjuration", "Conjuration", "Divination", "Enchantment",
  "Evocation", "Illusion", "Necromancy", "Transmutation",
];

// Known non-dice upcast patterns (spells that add targets instead of damage dice)
const NON_DICE_UPCAST_PATTERN = /^\d+\s+target/i;

describe("Spell registry property tests", () => {
  /**
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.8**
   *
   * Property 1: Spell registry completeness and data consistency
   * For all spell names in both characters' cantrip and spell lists, the SPELL_REGISTRY
   * must contain a SpellData entry with non-empty required fields and consistent
   * conditional fields.
   */
  it("Property 1: Every character spell exists in registry with valid, consistent data", () => {
    const spellNameArb = fc.constantFrom(...ALL_SPELL_NAMES);

    fc.assert(
      fc.property(spellNameArb, (spellName) => {
        // 1. Spell must exist in registry
        const entry = SPELL_REGISTRY[spellName];
        expect(entry).toBeDefined();

        // 2. Required fields are non-empty / valid
        expect(entry.name).toBeTruthy();
        expect(entry.name.length).toBeGreaterThan(0);

        expect(entry.level).toBeGreaterThanOrEqual(0);
        expect(entry.level).toBeLessThanOrEqual(9);

        expect(VALID_SCHOOLS).toContain(entry.school);

        expect(entry.castingTime).toBeTruthy();
        expect(entry.castingTime.length).toBeGreaterThan(0);

        expect(entry.range).toBeTruthy();
        expect(entry.range.length).toBeGreaterThan(0);

        expect(entry.duration).toBeTruthy();
        expect(entry.duration.length).toBeGreaterThan(0);

        expect(entry.description).toBeTruthy();
        expect(entry.description.length).toBeGreaterThan(0);

        // 3. Conditional consistency: damageDice ↔ damageType
        if (entry.damageDice !== undefined) {
          expect(entry.damageType).toBeDefined();
          expect(entry.damageType!.length).toBeGreaterThan(0);
        }
        if (entry.damageType !== undefined) {
          expect(entry.damageDice).toBeDefined();
          expect(entry.damageDice!.length).toBeGreaterThan(0);
        }

        // 4. saveType must be a valid AbilityName
        if (entry.saveType !== undefined) {
          expect(VALID_ABILITY_NAMES).toContain(entry.saveType);
        }

        // 5. upcast.perLevel must be a valid dice expression OR a known non-dice pattern
        if (entry.upcast !== undefined) {
          expect(entry.upcast.perLevel).toBeDefined();
          expect(entry.upcast.perLevel.length).toBeGreaterThan(0);

          const isDiceExpr = parseDiceExpression(entry.upcast.perLevel) !== null;
          const isNonDiceUpcast = NON_DICE_UPCAST_PATTERN.test(entry.upcast.perLevel);

          expect(isDiceExpr || isNonDiceUpcast).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});
