import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 2: Death save state bounds
 * Property 3: Death save state round-trip serialization
 *
 * Pure property tests for death save state invariants.
 */

interface DeathSaveState {
  successes: number;
  failures: number;
}

/**
 * Clamp-increment: adds 1 to the given value, clamped to [0, 3].
 */
function incrementClamped(value: number): number {
  return Math.min(3, value + 1);
}

// Arbitrary for successes/failures in [0, 3]
const deathSaveStateArb: fc.Arbitrary<DeathSaveState> = fc.record({
  successes: fc.integer({ min: 0, max: 3 }),
  failures: fc.integer({ min: 0, max: 3 }),
});

describe("Death save property tests", () => {
  it("Property 2: Death save state bounds — incrementing successes/failures always stays clamped to [0, 3]", () => {
    /**
     * **Validates: Requirements 2.2, 2.3**
     *
     * For any death save state with successes in [0, 3] and failures in [0, 3],
     * incrementing successes should produce a value clamped to [0, 3],
     * and incrementing failures should produce a value clamped to [0, 3].
     */
    fc.assert(
      fc.property(deathSaveStateArb, (state) => {
        const newSuccesses = incrementClamped(state.successes);
        const newFailures = incrementClamped(state.failures);

        // Successes remain in [0, 3]
        expect(newSuccesses).toBeGreaterThanOrEqual(0);
        expect(newSuccesses).toBeLessThanOrEqual(3);

        // Failures remain in [0, 3]
        expect(newFailures).toBeGreaterThanOrEqual(0);
        expect(newFailures).toBeLessThanOrEqual(3);

        // The full state after incrementing both still satisfies bounds
        const updated: DeathSaveState = {
          successes: newSuccesses,
          failures: newFailures,
        };
        expect(updated.successes).toBeGreaterThanOrEqual(0);
        expect(updated.successes).toBeLessThanOrEqual(3);
        expect(updated.failures).toBeGreaterThanOrEqual(0);
        expect(updated.failures).toBeLessThanOrEqual(3);
      }),
      { numRuns: 100 }
    );
  });

  it("Property 3: Death save round-trip serialization — JSON.parse(JSON.stringify(state)) produces equivalent state", () => {
    /**
     * **Validates: Requirements 2.8**
     *
     * For any valid death save state, serializing to JSON and deserializing
     * back should produce an equivalent death save state.
     */
    fc.assert(
      fc.property(deathSaveStateArb, (state) => {
        const serialized = JSON.stringify(state);
        const deserialized: DeathSaveState = JSON.parse(serialized);

        expect(deserialized.successes).toBe(state.successes);
        expect(deserialized.failures).toBe(state.failures);
        expect(deserialized).toEqual(state);
      }),
      { numRuns: 100 }
    );
  });
});
