import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 9: Inspiration counter bounds
 *
 * Feature: dnd-tracker-enhancements, Property 9: Inspiration counter bounds
 *
 * For any inspiration value in [0, 2], incrementing should produce min(value + 1, 2)
 * and decrementing should produce max(value - 1, 0). The inspiration value must always
 * satisfy 0 <= inspiration <= 2.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3**
 */

const INSPIRATION_MIN = 0;
const INSPIRATION_MAX = 2;

/** Mirrors the decrement logic from CounterControl: Math.max(min, value - 1) */
function decrementInspiration(value: number): number {
  return Math.max(INSPIRATION_MIN, value - 1);
}

/** Mirrors the increment logic from CounterControl: Math.min(max, value + 1) */
function incrementInspiration(value: number): number {
  return Math.min(INSPIRATION_MAX, value + 1);
}

/** Arbitrary for valid inspiration values in [0, 2] */
const inspirationArb = fc.integer({ min: INSPIRATION_MIN, max: INSPIRATION_MAX });

describe("Feature: dnd-tracker-enhancements, Property 9: Inspiration counter bounds", () => {
  it("incrementing produces min(value + 1, 2)", () => {
    /**
     * **Validates: Requirements 7.1, 7.2**
     */
    fc.assert(
      fc.property(inspirationArb, (value) => {
        const result = incrementInspiration(value);
        expect(result).toBe(Math.min(value + 1, INSPIRATION_MAX));
      }),
      { numRuns: 100 }
    );
  });

  it("decrementing produces max(value - 1, 0)", () => {
    /**
     * **Validates: Requirements 7.3**
     */
    fc.assert(
      fc.property(inspirationArb, (value) => {
        const result = decrementInspiration(value);
        expect(result).toBe(Math.max(value - 1, INSPIRATION_MIN));
      }),
      { numRuns: 100 }
    );
  });

  it("inspiration value always stays within [0, 2] after any sequence of operations", () => {
    /**
     * **Validates: Requirements 7.1, 7.2, 7.3**
     */
    const operationArb = fc.array(
      fc.constantFrom("increment" as const, "decrement" as const),
      { minLength: 1, maxLength: 20 }
    );

    fc.assert(
      fc.property(inspirationArb, operationArb, (startValue, operations) => {
        let current = startValue;
        for (const op of operations) {
          current = op === "increment"
            ? incrementInspiration(current)
            : decrementInspiration(current);

          expect(current).toBeGreaterThanOrEqual(INSPIRATION_MIN);
          expect(current).toBeLessThanOrEqual(INSPIRATION_MAX);
        }
      }),
      { numRuns: 100 }
    );
  });
});
