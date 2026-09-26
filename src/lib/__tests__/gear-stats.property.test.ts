import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { aggregateGearModifiers, getEquippedAcBonus, getGearBonus, isGearActive } from "../gear-stats";
import type { GearItem, StatModifier } from "../../types/character";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const STAT_NAMES = ["ac", "save", "deathSave"] as const;

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
        expect(aggregateGearModifiers(reUnequipped)).toEqual(modsUnequipped);
      }),
      { numRuns: 100 }
    );
  });

  it("aggregateGearModifiers equals the modifiers of active items (equipped, and attuned if required)", () => {
    fc.assert(
      fc.property(arbGearItems, (items) => {
        const expected = items
          .filter((i) => i.equipped && (!i.requiresAttunement || i.attuned))
          .flatMap((i) => i.statModifiers);
        expect(aggregateGearModifiers(items)).toEqual(expected);
      }),
      { numRuns: 100 }
    );
  });

  it("items that require attunement give nothing until attuned", () => {
    fc.assert(
      fc.property(arbGearItems, (items) => {
        const unattuned = items.map((i) => ({ ...i, equipped: true, requiresAttunement: true, attuned: false }));
        expect(aggregateGearModifiers(unattuned)).toEqual([]);
        expect(getEquippedAcBonus(unattuned)).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it("getEquippedAcBonus / getGearBonus equal the sum of that stat from active items", () => {
    fc.assert(
      fc.property(arbGearItems, fc.constantFrom(...STAT_NAMES), (items, stat) => {
        const expected = items
          .filter(isGearActive)
          .flatMap((i) => i.statModifiers)
          .filter((m) => m.stat === stat)
          .reduce((s, m) => s + m.value, 0);
        expect(getGearBonus(items, stat)).toBe(expected);
        if (stat === "ac") expect(getEquippedAcBonus(items)).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it("deactivating a single active item removes only that item's modifiers", () => {
    fc.assert(
      fc.property(
        arbGearItems.filter((items) => items.some(isGearActive)),
        fc.nat(),
        (items, rawIdx) => {
          const activeIdx = items.map((item, idx) => (isGearActive(item) ? idx : -1)).filter((i) => i >= 0);
          const targetIdx = activeIdx[rawIdx % activeIdx.length];
          const before = aggregateGearModifiers(items);
          const removed = items[targetIdx].statModifiers;
          const after = aggregateGearModifiers(
            items.map((item, idx) => (idx === targetIdx ? { ...item, equipped: false } : item))
          );
          expect(after.length).toBe(before.length - removed.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
