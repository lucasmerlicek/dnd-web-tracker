import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

interface DeathSaveState {
  successes: number;
  failures: number;
}

function incrementClamped(value: number): number {
  return Math.min(3, value + 1);
}

const deathSaveStateArb: fc.Arbitrary<DeathSaveState> = fc.record({
  successes: fc.integer({ min: 0, max: 3 }),
  failures: fc.integer({ min: 0, max: 3 }),
});

describe("Death save property tests", () => {
  it("Property 2: Death save state bounds — incrementing successes/failures always stays clamped to [0, 3]", () => {
    fc.assert(
      fc.property(deathSaveStateArb, (state) => {
        const newSuccesses = incrementClamped(state.successes);
        const newFailures = incrementClamped(state.failures);

        expect(newSuccesses).toBeGreaterThanOrEqual(0);
        expect(newSuccesses).toBeLessThanOrEqual(3);
        expect(newFailures).toBeGreaterThanOrEqual(0);
        expect(newFailures).toBeLessThanOrEqual(3);

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
