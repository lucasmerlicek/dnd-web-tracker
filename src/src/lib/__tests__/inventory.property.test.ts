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

/** Generate a single valid UtilityItem with quantity >= 1. */
const arbUtilityItem: fc.Arbitrary<UtilityItem> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.string({ maxLength: 100 }),
  quantity: fc.integer({ min: 1, max: 99 }),
});

/** Generate an array of UtilityItems with unique names (case-insensitive). */
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

/** Generate a non-empty item name. */
const arbItemName: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 50 });

// ---------------------------------------------------------------------------
// Property 11: Inventory item quantity default and deduplication
// ---------------------------------------------------------------------------

describe("Feature: dnd-tracker-enhancements, Property 11: Inventory item quantity default and deduplication", () => {
  /**
   * **Validates: Requirements 9.4, 9.5**
   *
   * For any inventory item added without an explicit quantity, the quantity
   * should default to 1.
   */
  it("new items default to quantity 1", () => {
    fc.assert(
      fc.property(arbUniqueInventory, arbItemName, (items, newName) => {
        // Only test when the name doesn't already exist
        const alreadyExists = items.some(
          (i) => i.name.toLowerCase() === newName.toLowerCase()
        );
        if (alreadyExists) return; // skip — covered by deduplication test

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

  /**
   * **Validates: Requirements 9.4, 9.5**
   *
   * For any inventory and any item name that already exists, adding the same
   * item should increment the existing item's quantity by 1 rather than
   * creating a duplicate entry, and the total number of distinct items should
   * remain unchanged.
   */
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

          // Distinct item count unchanged
          expect(result.length).toBe(items.length);

          // Quantity incremented by 1
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

  /**
   * **Validates: Requirements 9.4, 9.5**
   *
   * Case-insensitive deduplication: adding "Healing Potion" when "healing potion"
   * exists should still deduplicate.
   */
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

          // Still no duplicates
          expect(result.length).toBe(items.length);

          // Quantity incremented
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
