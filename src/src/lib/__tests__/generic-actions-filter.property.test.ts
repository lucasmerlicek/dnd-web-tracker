import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Reserved keys that have dedicated UI panels and must be excluded from
// the generic actions list on the Actions page.
// ---------------------------------------------------------------------------

const RESERVED_KEYS = ["second_wind", "bladesong", "raven_form"] as const;
const RESERVED_SET = new Set<string>(RESERVED_KEYS);

/**
 * Pure filter function mirroring the generic actions filter in
 * src/app/actions/page.tsx:
 *
 *   Object.entries(data.actions).filter(
 *     ([key]) => key !== "second_wind" && key !== "bladesong" && key !== "raven_form"
 *   );
 */
function filterGenericActions<T>(actions: Record<string, T>): [string, T][] {
  return Object.entries(actions).filter(
    ([key]) => key !== "second_wind" && key !== "bladesong" && key !== "raven_form"
  );
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Arbitrary non-reserved action key (alphanumeric + underscore, avoids collisions). */
const arbNonReservedKey = fc
  .stringMatching(/^[a-z][a-z0-9_]{1,20}$/)
  .filter((k) => !RESERVED_SET.has(k));

/** Arbitrary action value (just a placeholder object — the filter only inspects keys). */
const arbActionValue = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  uses: fc.integer({ min: 0, max: 5 }),
});

/** Build an actions map that includes a random subset of reserved keys plus random other keys. */
const arbActionsMap = fc
  .record({
    reservedSubset: fc.subarray([...RESERVED_KEYS], { minLength: 0 }),
    otherKeys: fc.array(arbNonReservedKey, { minLength: 0, maxLength: 10 }),
  })
  .chain(({ reservedSubset, otherKeys }) => {
    const allKeys = [...new Set([...reservedSubset, ...otherKeys])];
    // Generate a value for each key
    return fc.tuple(
      fc.constant(allKeys),
      fc.array(arbActionValue, { minLength: allKeys.length, maxLength: allKeys.length })
    );
  })
  .map(([keys, values]) => {
    const map: Record<string, { name: string; uses: number }> = {};
    keys.forEach((k, i) => {
      map[k] = values[i];
    });
    return map;
  });

// ---------------------------------------------------------------------------
// Property 7: Generic actions exclude reserved keys
// ---------------------------------------------------------------------------

describe("Feature: madea-sorcerer-features, Property 7: Generic actions exclude reserved keys", () => {
  /**
   * **Validates: Requirements 4.1**
   *
   * For any actions map containing keys from the set
   * {"second_wind", "bladesong", "raven_form"}, the filtered generic actions
   * list should contain none of those keys, and should contain all other keys
   * from the original map.
   */
  it("filtered list contains no reserved keys and retains all non-reserved keys", () => {
    fc.assert(
      fc.property(arbActionsMap, (actions) => {
        const filtered = filterGenericActions(actions);
        const filteredKeys = new Set(filtered.map(([k]) => k));

        // No reserved key should appear in the filtered output
        for (const reserved of RESERVED_KEYS) {
          expect(filteredKeys.has(reserved)).toBe(false);
        }

        // Every non-reserved key from the original map must be present
        for (const key of Object.keys(actions)) {
          if (!RESERVED_SET.has(key)) {
            expect(filteredKeys.has(key)).toBe(true);
          }
        }

        // The filtered list size should equal total keys minus reserved keys present
        const reservedInMap = Object.keys(actions).filter((k) => RESERVED_SET.has(k)).length;
        expect(filtered.length).toBe(Object.keys(actions).length - reservedInMap);
      }),
      { numRuns: 100 }
    );
  });
});
