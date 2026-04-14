import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { aggregateGearModifiers, getEquippedAcBonus } from "../gear-stats";
import type { GearItem, StatModifier } from "../../types/character";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const STAT_NAMES = ["ac", "attack", "damage"] as const;

const arbStatModifier: fc.Arbitrary<StatModifier> = fc.record({
  stat: fc.constantFrom(...STAT_NAMES),
  value: fc.integer({ min: -5, max: 5 }),
});

const arbGearItem: fc.Arbitrary<GearItem> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.string({ maxLength: 100 }),
  quantity: fc.integer({ min: 1, max: 99 }),
  equipped: fc.boolean(),
  requiresAttunement: fc.boolean(),
  attuned: fc.boolean(),
  statModifiers: fc.array(arbStatModifier, { minLength: 0, maxLength: 5 }),
});

const arbGearItems: fc.Arbitrary<GearItem[]> = fc.array(arbGearItem, {
  minLength: 0,
  maxLength: 20,
});

// ---------------------------------------------------------------------------
// Property 12: Gear equip/unequip stat modifier round-trip
// ---------------------------------------------------------------------------

describe("Feature: dnd-tracker-enhancements, Property 12: Gear equip/unequip stat modifier round-trip", () => {
  it("equipping then unequipping returns stats to original (no modifiers from unequipped items)", () => {
    fc.assert(
      fc.property(arbGearItems, (items) => {
        const allUnequipped = items.map((item) => ({ ...item, equipped: false }));
        const modsUnequipped = aggregateGearModifiers(allUnequipped);
        expect(modsUnequipped).toEqual([]);

        const allEquipped = items.map((item) => ({ ...item, equipped: true }));
        const reUnequipped = allEquipped.map((item) => ({ ...item, equipped: false }));
        const modsAfterRoundTrip = aggregateGearModifiers(reUnequipped);

        expect(modsAfterRoundTrip).toEqual(modsUnequipped);
      }),
      { numRuns: 100 }
    );
  });

  it("aggregateGearModifiers for equipped items equals the sum of individual item modifiers", () => {
    fc.assert(
      fc.property(arbGearItems, (items) => {
        const equippedItems = items.filter((item) => item.equipped);
        const aggregated = aggregateGearModifiers(items);
        const expectedModifiers = equippedItems.flatMap((item) => item.statModifiers);
        expect(aggregated).toEqual(expectedModifiers);
      }),
      { numRuns: 100 }
    );
  });

  it("getEquippedAcBonus equals the sum of AC modifiers from equipped items", () => {
    fc.assert(
      fc.property(arbGearItems, (items) => {
        const acBonus = getEquippedAcBonus(items);
        const expectedAcBonus = items
          .filter((item) => item.equipped)
          .flatMap((item) => item.statModifiers)
          .filter((mod) => mod.stat === "ac")
          .reduce((sum, mod) => sum + mod.value, 0);
        expect(acBonus).toBe(expectedAcBonus);
      }),
      { numRuns: 100 }
    );
  });

  it("unequipping a single item removes only that item's modifiers", () => {
    fc.assert(
      fc.property(
        arbGearItems.filter((items) => items.some((i) => i.equipped)),
        fc.nat(),
        (items, rawIdx) => {
          const equippedIndices = items
            .map((item, idx) => (item.equipped ? idx : -1))
            .filter((idx) => idx >= 0);
          const targetIdx = equippedIndices[rawIdx % equippedIndices.length];

          const modsBefore = aggregateGearModifiers(items);
          const removedMods = items[targetIdx].statModifiers;

          const afterUnequip = items.map((item, idx) =>
            idx === targetIdx ? { ...item, equipped: false } : item
          );
          const modsAfter = aggregateGearModifiers(afterUnequip);

          expect(modsAfter.length).toBe(modsBefore.length - removedMods.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
