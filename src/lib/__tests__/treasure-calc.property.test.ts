import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { totalTreasureValue } from "../treasure-calc";
import type { TreasureItem } from "../../types/character";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const arbTreasureItem: fc.Arbitrary<TreasureItem> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.string({ maxLength: 100 }),
  quantity: fc.integer({ min: 1, max: 99 }),
  estimatedValue: fc.integer({ min: 0, max: 100_000 }),
});

const arbTreasureItems: fc.Arbitrary<TreasureItem[]> = fc.array(arbTreasureItem, {
  minLength: 0,
  maxLength: 30,
});

// ---------------------------------------------------------------------------
// Property 13: Treasure total value calculation
// ---------------------------------------------------------------------------

describe("Feature: dnd-tracker-enhancements, Property 13: Treasure total value calculation", () => {
  it("returns the exact sum of all estimatedValue fields", () => {
    fc.assert(
      fc.property(arbTreasureItems, (items) => {
        const expectedSum = items.reduce((sum, item) => sum + item.estimatedValue, 0);
        expect(totalTreasureValue(items)).toBe(expectedSum);
      }),
      { numRuns: 100 }
    );
  });

  it("adding an item increases the total by exactly that item's value", () => {
    fc.assert(
      fc.property(arbTreasureItems, arbTreasureItem, (items, newItem) => {
        const totalBefore = totalTreasureValue(items);
        const totalAfter = totalTreasureValue([...items, newItem]);
        expect(totalAfter).toBe(totalBefore + newItem.estimatedValue);
      }),
      { numRuns: 100 }
    );
  });

  it("removing an item decreases the total by exactly that item's value", () => {
    fc.assert(
      fc.property(
        arbTreasureItems.filter((items) => items.length > 0),
        fc.nat(),
        (items, rawIdx) => {
          const idx = rawIdx % items.length;
          const removedItem = items[idx];
          const remaining = [...items.slice(0, idx), ...items.slice(idx + 1)];

          const totalBefore = totalTreasureValue(items);
          const totalAfter = totalTreasureValue(remaining);
          expect(totalAfter).toBe(totalBefore - removedItem.estimatedValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns 0 for an empty list", () => {
    expect(totalTreasureValue([])).toBe(0);
  });
});
