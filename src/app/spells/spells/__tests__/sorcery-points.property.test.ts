import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  SP_TO_SLOT_COST,
  slotToSpGain,
  slotLevelNumber,
  convertSpToSlot,
  convertSlotToSp,
  type ConversionState,
} from "../sorcery-points";

/**
 * Property 6: SP-to-slot and slot-to-SP conversions maintain resource conservation
 * (SP spent equals defined cost).
 *
 * **Validates: Requirements 6.10, 6.11**
 *
 * Requirement 6.10: Converting SP to slots costs 2/3/5 SP for 1st/2nd/3rd level.
 * Requirement 6.11: Converting slots to SP yields 1 SP per slot level.
 */

const slotLevelArb = fc.constantFrom("1st", "2nd", "3rd");

/** Generate a valid ConversionState with enough SP and slots for conversions. */
const stateArb: fc.Arbitrary<ConversionState> = fc.record({
  currentSorceryPoints: fc.integer({ min: 0, max: 20 }),
  sorceryPointsMax: fc.integer({ min: 5, max: 20 }),
  currentSlots: fc.record({
    "1st": fc.integer({ min: 0, max: 10 }),
    "2nd": fc.integer({ min: 0, max: 10 }),
    "3rd": fc.integer({ min: 0, max: 10 }),
  }),
}).map((s) => ({
  ...s,
  // Ensure max >= current so the state is valid
  sorceryPointsMax: Math.max(s.sorceryPointsMax, s.currentSorceryPoints),
}));

describe("Sorcery point conversion property tests", () => {
  it("Property 6: SP-to-slot conversion deducts exactly the defined cost", () => {
    /**
     * **Validates: Requirements 6.10**
     *
     * When converting SP to a slot succeeds, the SP spent equals exactly
     * the defined cost (2 for 1st, 3 for 2nd, 5 for 3rd) and the slot
     * count increases by exactly 1.
     */
    fc.assert(
      fc.property(stateArb, slotLevelArb, (state, level) => {
        const cost = SP_TO_SLOT_COST[level];
        const result = convertSpToSlot(state, level);

        if (state.currentSorceryPoints >= cost) {
          // Conversion should succeed
          expect(result.success).toBe(true);
          // SP decreases by exactly the cost
          expect(result.newSorceryPoints).toBe(state.currentSorceryPoints - cost);
          // Slot count increases by exactly 1
          expect(result.newSlots[level]).toBe((state.currentSlots[level] ?? 0) + 1);
          // Other slot levels are unchanged
          for (const otherLevel of ["1st", "2nd", "3rd"]) {
            if (otherLevel !== level) {
              expect(result.newSlots[otherLevel]).toBe(state.currentSlots[otherLevel] ?? 0);
            }
          }
        } else {
          // Insufficient SP — conversion should fail
          expect(result.success).toBe(false);
          expect(result.newSorceryPoints).toBe(state.currentSorceryPoints);
          expect(result.newSlots[level]).toBe(state.currentSlots[level] ?? 0);
        }
      }),
      { numRuns: 500 }
    );
  });

  it("Property 6: Slot-to-SP conversion yields exactly 1 SP per slot level", () => {
    /**
     * **Validates: Requirements 6.11**
     *
     * When converting a slot to SP succeeds, the SP gained equals the
     * slot's numeric level (1 for 1st, 2 for 2nd, 3 for 3rd), capped
     * at sorceryPointsMax. The slot count decreases by exactly 1.
     */
    fc.assert(
      fc.property(stateArb, slotLevelArb, (state, level) => {
        const result = convertSlotToSp(state, level);
        const slotCount = state.currentSlots[level] ?? 0;
        const gain = slotToSpGain(level);

        if (slotCount > 0) {
          // Conversion should succeed
          expect(result.success).toBe(true);
          // SP increases by the slot level, capped at max
          const expectedSp = Math.min(state.currentSorceryPoints + gain, state.sorceryPointsMax);
          expect(result.newSorceryPoints).toBe(expectedSp);
          // Slot count decreases by exactly 1
          expect(result.newSlots[level]).toBe(slotCount - 1);
          // Other slot levels are unchanged
          for (const otherLevel of ["1st", "2nd", "3rd"]) {
            if (otherLevel !== level) {
              expect(result.newSlots[otherLevel]).toBe(state.currentSlots[otherLevel] ?? 0);
            }
          }
        } else {
          // No slots to convert — should fail
          expect(result.success).toBe(false);
          expect(result.newSorceryPoints).toBe(state.currentSorceryPoints);
        }
      }),
      { numRuns: 500 }
    );
  });

  it("Property 6: SP-to-slot followed by slot-to-SP is resource-conservative", () => {
    /**
     * **Validates: Requirements 6.10, 6.11**
     *
     * Converting SP→slot then slot→SP back: the net SP change equals
     * -(cost - slotLevel). This is always a net loss (or break-even for
     * 1st level where cost=2, gain=1 → net loss of 1).
     * The round-trip never creates SP out of nothing.
     */
    fc.assert(
      fc.property(
        stateArb.filter((s) => s.currentSorceryPoints >= 5), // enough SP for any level
        slotLevelArb,
        (state, level) => {
          const cost = SP_TO_SLOT_COST[level];
          const gain = slotLevelNumber(level);

          // Step 1: SP → slot
          const afterCreate = convertSpToSlot(state, level);
          expect(afterCreate.success).toBe(true);

          // Step 2: slot → SP (using the slot we just created)
          const stateAfterCreate: ConversionState = {
            currentSorceryPoints: afterCreate.newSorceryPoints,
            sorceryPointsMax: state.sorceryPointsMax,
            currentSlots: afterCreate.newSlots,
          };
          const afterConvert = convertSlotToSp(stateAfterCreate, level);
          expect(afterConvert.success).toBe(true);

          // Net SP change: we spent `cost` and gained `gain`
          // Final SP should be original - cost + gain, capped at max
          const expectedFinalSp = Math.min(
            state.currentSorceryPoints - cost + gain,
            state.sorceryPointsMax
          );
          expect(afterConvert.newSorceryPoints).toBe(expectedFinalSp);

          // The round-trip always costs more SP than it returns (cost > gain for all levels)
          // 1st: cost=2, gain=1; 2nd: cost=3, gain=2; 3rd: cost=5, gain=3
          expect(cost).toBeGreaterThan(gain);
        }
      ),
      { numRuns: 300 }
    );
  });
});
