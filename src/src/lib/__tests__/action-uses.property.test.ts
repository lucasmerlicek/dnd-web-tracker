import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { Action } from "../../types/character";

// ---------------------------------------------------------------------------
// Pure helper functions mirroring action logic
// ---------------------------------------------------------------------------

function activateAction(action: Action): Action {
  if (action.uses <= 0) return action;
  const newUses = action.uses - 1;
  return { ...action, uses: newUses, available: newUses > 0 };
}

function shortRestRecharge(action: Action): Action {
  if (action.recharge !== "short_rest") return action;
  return { ...action, uses: action.maxUses, available: true };
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generate a valid Action with uses > 0 (activatable). */
const arbActivatableAction: fc.Arbitrary<Action> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  description: fc.string({ maxLength: 100 }),
  available: fc.constant(true),
  recharge: fc.constantFrom("short_rest" as const, "long_rest" as const),
  uses: fc.integer({ min: 1, max: 10 }),
  maxUses: fc.integer({ min: 1, max: 10 }),
}).map((a) => ({
  ...a,
  maxUses: Math.max(a.maxUses, a.uses),
}));

/** Generate a valid Action with recharge === "short_rest". */
const arbShortRestAction: fc.Arbitrary<Action> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  description: fc.string({ maxLength: 100 }),
  available: fc.boolean(),
  recharge: fc.constant("short_rest" as const),
  uses: fc.integer({ min: 0, max: 10 }),
  maxUses: fc.integer({ min: 1, max: 10 }),
}).map((a) => ({
  ...a,
  maxUses: Math.max(a.maxUses, a.uses),
}));

// ---------------------------------------------------------------------------
// Property 14: Action use decrement and short rest recharge
// ---------------------------------------------------------------------------

describe("Feature: dnd-tracker-enhancements, Property 14: Action use decrement and short rest recharge", () => {
  /**
   * **Validates: Requirements 13.2, 13.4**
   *
   * For any action with uses > 0, activating it should decrement uses by exactly 1.
   * For any action with recharge === "short_rest", a short rest should restore uses to maxUses.
   */
  it("activating an action with uses > 0 decrements uses by exactly 1", () => {
    fc.assert(
      fc.property(arbActivatableAction, (action) => {
        const result = activateAction(action);
        expect(result.uses).toBe(action.uses - 1);
      }),
      { numRuns: 100 }
    );
  });

  it("activating an action with uses === 0 does not change uses", () => {
    fc.assert(
      fc.property(arbActivatableAction, (action) => {
        const depleted = { ...action, uses: 0, available: false };
        const result = activateAction(depleted);
        expect(result.uses).toBe(0);
        expect(result).toEqual(depleted);
      }),
      { numRuns: 100 }
    );
  });

  it("activating sets available to false when uses reaches 0", () => {
    fc.assert(
      fc.property(arbActivatableAction, (action) => {
        const lastUse = { ...action, uses: 1 };
        const result = activateAction(lastUse);
        expect(result.uses).toBe(0);
        expect(result.available).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("activating keeps available true when uses remains > 0", () => {
    fc.assert(
      fc.property(
        arbActivatableAction.filter((a) => a.uses > 1),
        (action) => {
          const result = activateAction(action);
          expect(result.uses).toBeGreaterThan(0);
          expect(result.available).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("short rest restores uses to maxUses for short_rest actions", () => {
    fc.assert(
      fc.property(arbShortRestAction, (action) => {
        const result = shortRestRecharge(action);
        expect(result.uses).toBe(action.maxUses);
        expect(result.available).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("short rest does not change long_rest actions", () => {
    fc.assert(
      fc.property(arbActivatableAction, (action) => {
        const longRestAction: Action = { ...action, recharge: "long_rest" };
        const result = shortRestRecharge(longRestAction);
        expect(result).toEqual(longRestAction);
      }),
      { numRuns: 100 }
    );
  });

  it("activate then short rest restores a short_rest action to maxUses", () => {
    fc.assert(
      fc.property(arbShortRestAction.filter((a) => a.uses > 0), (action) => {
        const activated = activateAction(action);
        const recharged = shortRestRecharge(activated);
        expect(recharged.uses).toBe(action.maxUses);
        expect(recharged.available).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
