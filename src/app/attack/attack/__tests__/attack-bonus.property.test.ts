import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calcAttackBonus, getWeaponAbilityMod } from "../attack-calc";
import type { Weapon, AbilityName, CharacterData } from "@/types";

/**
 * Property 5: Attack bonus equals proficiency + ability modifier + magic bonus
 * for all weapon configurations.
 *
 * **Validates: Requirements 5.2, 5.4**
 *
 * Tests the pure attack bonus calculation:
 *   attackBonus = proficiencyBonus + abilityModifier + magicBonus
 *
 * Where abilityModifier is:
 *   - stats[weapon.attackStat].modifier normally
 *   - stats.INT.modifier when Bladesong is active AND weapon.attackStat !== "STR"
 */

const abilityNameArb: fc.Arbitrary<AbilityName> = fc.constantFrom(
  "STR",
  "DEX",
  "CON",
  "INT",
  "WIS",
  "CHA"
);

const statBlockArb: fc.Arbitrary<CharacterData["stats"]> = fc.record({
  STR: fc.record({ value: fc.integer({ min: 1, max: 30 }), modifier: fc.integer({ min: -5, max: 10 }) }),
  DEX: fc.record({ value: fc.integer({ min: 1, max: 30 }), modifier: fc.integer({ min: -5, max: 10 }) }),
  CON: fc.record({ value: fc.integer({ min: 1, max: 30 }), modifier: fc.integer({ min: -5, max: 10 }) }),
  INT: fc.record({ value: fc.integer({ min: 1, max: 30 }), modifier: fc.integer({ min: -5, max: 10 }) }),
  WIS: fc.record({ value: fc.integer({ min: 1, max: 30 }), modifier: fc.integer({ min: -5, max: 10 }) }),
  CHA: fc.record({ value: fc.integer({ min: 1, max: 30 }), modifier: fc.integer({ min: -5, max: 10 }) }),
});

const weaponArb: fc.Arbitrary<Weapon> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  damageDice: fc.constantFrom("1d4", "1d6", "1d8", "2d6", "1d10", "1d12"),
  damageType: fc.constantFrom("slashing", "piercing", "bludgeoning"),
  attackStat: abilityNameArb,
  properties: fc.array(fc.constantFrom("finesse", "light", "thrown", "versatile", "heavy"), { maxLength: 3 }),
  magicBonus: fc.integer({ min: 0, max: 3 }),
  usesDueling: fc.boolean(),
  twoHanded: fc.boolean(),
});

describe("Attack bonus property tests", () => {
  it("Property 5: Attack bonus equals proficiency + ability modifier + magic bonus for all weapon configurations", () => {
    /**
     * **Validates: Requirements 5.2, 5.4**
     */
    fc.assert(
      fc.property(
        weaponArb,
        fc.integer({ min: 2, max: 6 }),  // proficiencyBonus (D&D range)
        statBlockArb,
        fc.boolean(),                      // bladesongActive
        (weapon, proficiencyBonus, stats, bladesongActive) => {
          const attackBonus = calcAttackBonus(weapon, proficiencyBonus, stats, bladesongActive);

          // Determine expected ability modifier per Requirement 5.4
          let expectedAbilityMod: number;
          if (bladesongActive && weapon.attackStat !== "STR") {
            // INT when Bladesong is active for non-STR weapons
            expectedAbilityMod = stats.INT.modifier;
          } else {
            // Use the weapon's attack stat (DEX for finesse, STR otherwise)
            expectedAbilityMod = stats[weapon.attackStat].modifier;
          }

          // Requirement 5.2: attack bonus = proficiency + ability mod + magic bonus
          const expectedBonus = proficiencyBonus + expectedAbilityMod + weapon.magicBonus;
          expect(attackBonus).toBe(expectedBonus);

          // Also verify getWeaponAbilityMod returns the correct modifier
          const abilityMod = getWeaponAbilityMod(weapon, stats, bladesongActive);
          expect(abilityMod).toBe(expectedAbilityMod);
        }
      ),
      { numRuns: 500 }
    );
  });

  it("Property 5a: Bladesong only overrides non-STR weapons to use INT", () => {
    /**
     * **Validates: Requirements 5.4**
     *
     * When Bladesong is active, STR-based weapons still use STR.
     * Non-STR weapons use INT instead of their normal stat.
     */
    fc.assert(
      fc.property(
        weaponArb,
        statBlockArb,
        (weapon, stats) => {
          const modWithBladesong = getWeaponAbilityMod(weapon, stats, true);
          const modWithoutBladesong = getWeaponAbilityMod(weapon, stats, false);

          if (weapon.attackStat === "STR") {
            // STR weapons are unaffected by Bladesong
            expect(modWithBladesong).toBe(stats.STR.modifier);
            expect(modWithBladesong).toBe(modWithoutBladesong);
          } else {
            // Non-STR weapons use INT when Bladesong is active
            expect(modWithBladesong).toBe(stats.INT.modifier);
            // Without Bladesong, they use their normal stat
            expect(modWithoutBladesong).toBe(stats[weapon.attackStat].modifier);
          }
        }
      ),
      { numRuns: 300 }
    );
  });
});
