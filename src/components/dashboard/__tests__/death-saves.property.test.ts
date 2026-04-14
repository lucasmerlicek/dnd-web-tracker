import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 4: Death save accumulation never exceeds 3 successes or 3 failures
 * Validates: Requirements 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 *
 * Tests the pure death save state machine extracted from DeathSaveTracker:
 *   ≥10 → +1 success, <10 → +1 failure, nat 20 → HP=1 + reset, nat 1 → +2 failures
 *   Clamped to max 3 successes and 3 failures
 */

interface DeathSaveState {
  successes: number;
  failures: number;
}

interface DeathSaveResult {
  deathSaves: DeathSaveState;
  hpSetTo1?: boolean;
}

function processDeathSave(
  current: DeathSaveState,
  natural: number
): DeathSaveResult {
  if (natural === 20) {
    return { deathSaves: { successes: 0, failures: 0 }, hpSetTo1: true };
  }

  let newSuccesses = current.successes;
  let newFailures = current.failures;

  if (natural === 1) {
    newFailures += 2;
  } else if (natural >= 10) {
    newSuccesses += 1;
  } else {
    newFailures += 1;
  }

  newSuccesses = Math.min(3, newSuccesses);
  newFailures = Math.min(3, newFailures);

  return { deathSaves: { successes: newSuccesses, failures: newFailures } };
}

// Arbitrary for a valid d20 roll (1-20)
const d20Arb = fc.integer({ min: 1, max: 20 });

// Arbitrary for a valid starting death save state (0-3 each)
const deathSaveStateArb: fc.Arbitrary<DeathSaveState> = fc.record({
  successes: fc.integer({ min: 0, max: 3 }),
  failures: fc.integer({ min: 0, max: 3 }),
});

describe("Death save state machine property tests", () => {
  it("Property 4: Death save accumulation never exceeds 3 successes or 3 failures", () => {
    /**
     * **Validates: Requirements 4.3, 4.4, 4.5, 4.6, 4.7, 4.8**
     *
     * After processing any sequence of d20 rolls from any valid starting state,
     * successes and failures are always in [0, 3].
     */
    fc.assert(
      fc.property(
        deathSaveStateArb,
        fc.array(d20Arb, { minLength: 1, maxLength: 20 }),
        (initialState, rolls) => {
          let state = { ...initialState };

          for (const roll of rolls) {
            const result = processDeathSave(state, roll);
            const ds = result.deathSaves;

            // Core invariant: never exceed bounds
            expect(ds.successes).toBeGreaterThanOrEqual(0);
            expect(ds.successes).toBeLessThanOrEqual(3);
            expect(ds.failures).toBeGreaterThanOrEqual(0);
            expect(ds.failures).toBeLessThanOrEqual(3);

            // Verify roll semantics
            if (roll === 20) {
              // Req 4.5: nat 20 resets saves
              expect(ds.successes).toBe(0);
              expect(ds.failures).toBe(0);
              expect(result.hpSetTo1).toBe(true);
            } else if (roll === 1) {
              // Req 4.6: nat 1 adds 2 failures (clamped)
              expect(ds.failures).toBe(Math.min(3, state.failures + 2));
              expect(ds.successes).toBe(state.successes);
            } else if (roll >= 10) {
              // Req 4.3: ≥10 adds 1 success (clamped)
              expect(ds.successes).toBe(Math.min(3, state.successes + 1));
              expect(ds.failures).toBe(state.failures);
            } else {
              // Req 4.4: <10 adds 1 failure (clamped)
              expect(ds.failures).toBe(Math.min(3, state.failures + 1));
              expect(ds.successes).toBe(state.successes);
            }

            state = ds;
          }
        }
      ),
      { numRuns: 300 }
    );
  });
});
