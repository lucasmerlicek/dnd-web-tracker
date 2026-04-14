import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { UtilityItem } from "../../types/character";

// ---------------------------------------------------------------------------
// Helper: addItemToInventory (pure logic under test)
// ---------------------------------------------------------------------------

function addItemToInventory(items: UtilityItem[], name: string): UtilityItem[] {
  const existingIdx = items.findIndex(
    (i) => i.name.toLowerCase() === name.toLowerCase()
  );
  if (existingIdx >= 0) {
    return items.map((item, i) =>
      i === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
    );
  }
  return [
    ...items,
    { id: crypto.randomUUID(), name, description: "", quantity: 1 },
  ];
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const arbUtilityItem: fc.Arbitrary<UtilityItem> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.string({ maxLength: 100 }),
  quantity: fc.integer({ min: 1, max: 99 }),
});

const arbUniqueInventory: fc.Arbitrary<UtilityItem[]> = fc
  .array(arbUtilityItem, { minLength: 0, maxLength: 20 })
  .map((items) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = item.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

const arbItemName: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 50 });

// ---------------------------------------------------------------------------
// Property 11: Inventory item quantity default and deduplication
// ---------------------------------------------------------------------------

describe("Feature: dnd-tracker-enhancements, Property 11: Inventory item quantity default and deduplication", () => {
  it("new items default to quantity 1", () => {
    fc.assert(
      fc.property(arbUniqueInventory, arbItemName, (items, newName) => {
        const alreadyExists = items.some(
          (i) => i.name.toLowerCase() === newName.toLowerCase()
        );
        if (alreadyExists) return;

        const result = addItemToInventory(items, newName);
        const addedItem = result.find(
          (i) => i.name.toLowerCase() === newName.toLowerCase()
        );

        expect(addedItem).toBeDefined();
        expect(addedItem!.quantity).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  it("adding an existing item increments quantity and does not duplicate", () => {
    fc.assert(
      fc.property(
        arbUniqueInventory.filter((items) => items.length > 0),
        fc.nat(),
        (items, rawIdx) => {
          const idx = rawIdx % items.length;
          const existingName = items[idx].name;
          const originalQuantity = items[idx].quantity;

          const result = addItemToInventory(items, existingName);

          expect(result.length).toBe(items.length);

          const updatedItem = result.find(
            (i) => i.name.toLowerCase() === existingName.toLowerCase()
          );
          expect(updatedItem).toBeDefined();
          expect(updatedItem!.quantity).toBe(originalQuantity + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("deduplication is case-insensitive", () => {
    fc.assert(
      fc.property(
        arbUniqueInventory.filter((items) => items.length > 0),
        fc.nat(),
        (items, rawIdx) => {
          const idx = rawIdx % items.length;
          const existingName = items[idx].name;
          const flippedCase = existingName
            .split("")
            .map((c) =>
              c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()
            )
            .join("");
          const originalQuantity = items[idx].quantity;

          const result = addItemToInventory(items, flippedCase);

          expect(result.length).toBe(items.length);

          const updatedItem = result.find(
            (i) => i.name.toLowerCase() === existingName.toLowerCase()
          );
          expect(updatedItem).toBeDefined();
          expect(updatedItem!.quantity).toBe(originalQuantity + 1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
