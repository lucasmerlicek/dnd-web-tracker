import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  availableSlotLevels,
  songOfDefenseReduction,
  expendSongOfDefense,
} from "../song-of-defense";
import {
  applyArcaneRecovery,
  arcaneRecoveryBudget,
  getWizardLevel,
  recoverableSlotLevels,
  selectionCost,
} from "../arcane-recovery";
import { castContingency, contingencyBindLevels } from "../contingency";

describe("Song of Defense", () => {
  it("reduction is 5 × slot level", () => {
    expect(songOfDefenseReduction("1st")).toBe(5);
    expect(songOfDefenseReduction("5th")).toBe(25);
    expect(songOfDefenseReduction("6th")).toBe(30);
  });

  it("only lists levels with slots remaining, lowest first", () => {
    expect(availableSlotLevels({ "3rd": 1, "1st": 2, "2nd": 0, "6th": 1 })).toEqual(["1st", "3rd", "6th"]);
  });

  it("requires Bladesong and an available slot", () => {
    const slots = { "2nd": 1 };
    expect(expendSongOfDefense(slots, "2nd", false).success).toBe(false);
    expect(expendSongOfDefense({ "2nd": 0 }, "2nd", true).success).toBe(false);
    const ok = expendSongOfDefense(slots, "2nd", true);
    expect(ok).toMatchObject({ success: true, reduction: 10, newSlots: { "2nd": 0 } });
    expect(slots["2nd"]).toBe(1); // input not mutated
  });
});

describe("Arcane Recovery", () => {
  it("parses wizard level and computes budget (half, rounded up)", () => {
    expect(getWizardLevel("Fighter 1 / Wizard 11 (Bladesinger)")).toBe(11);
    expect(getWizardLevel("Sorcerer 9")).toBe(0);
    expect(arcaneRecoveryBudget(11)).toBe(6);
    expect(arcaneRecoveryBudget(9)).toBe(5);
    expect(arcaneRecoveryBudget(0)).toBe(0);
  });

  it("only offers expended slots of 5th level or lower", () => {
    const max = { "1st": 4, "3rd": 3, "5th": 2, "6th": 1 };
    const cur = { "1st": 4, "3rd": 1, "5th": 1, "6th": 0 };
    expect(recoverableSlotLevels(max, cur)).toEqual(["3rd", "5th"]);
  });

  it("rejects 6th-level, over-budget, and over-expended selections", () => {
    const max = { "3rd": 3, "5th": 2, "6th": 1 };
    const cur = { "3rd": 0, "5th": 0, "6th": 0 };
    expect(applyArcaneRecovery(max, cur, { "6th": 1 }, 6).success).toBe(false);
    expect(applyArcaneRecovery(max, cur, { "5th": 1, "3rd": 1 }, 6).success).toBe(false); // 8 > 6
    expect(applyArcaneRecovery(max, { ...cur, "3rd": 3 }, { "3rd": 1 }, 6).success).toBe(false);
    const ok = applyArcaneRecovery(max, cur, { "3rd": 2 }, 6);
    expect(ok).toEqual({ success: true, newSlots: { "3rd": 2, "5th": 0, "6th": 0 } });
  });

  it("property: successful recovery never exceeds budget or slot maximums", () => {
    const levels = ["1st", "2nd", "3rd", "4th", "5th"];
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 5, maxLength: 5 }),
        fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 5, maxLength: 5 }),
        fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 5, maxLength: 5 }),
        fc.integer({ min: 1, max: 10 }),
        (maxes, used, picks, wizLevel) => {
          const max: Record<string, number> = {};
          const cur: Record<string, number> = {};
          const sel: Record<string, number> = {};
          levels.forEach((l, i) => {
            max[l] = maxes[i];
            cur[l] = Math.max(0, maxes[i] - used[i]);
            sel[l] = picks[i];
          });
          const budget = arcaneRecoveryBudget(wizLevel);
          const res = applyArcaneRecovery(max, cur, sel, budget);
          if (res.success) {
            expect(selectionCost(sel)).toBeLessThanOrEqual(budget);
            for (const l of levels) expect(res.newSlots[l]).toBeLessThanOrEqual(max[l]);
          } else {
            expect(res.newSlots).toEqual(cur);
          }
        }
      ),
      { numRuns: 300 }
    );
  });
});

describe("Contingency", () => {
  it("bind levels are the character's slots at 5th or lower", () => {
    expect(contingencyBindLevels({ "6th": 1, "2nd": 3, "5th": 2, "1st": 4 })).toEqual(["1st", "2nd", "5th"]);
  });

  it("expends the 6th slot plus the bound-spell slot", () => {
    const res = castContingency({ "6th": 1, "3rd": 2 }, "3rd");
    expect(res).toEqual({ success: true, newSlots: { "6th": 0, "3rd": 1 } });
  });

  it("fails without a 6th slot, a bound slot, or with a bound level above 5th", () => {
    expect(castContingency({ "6th": 0, "3rd": 2 }, "3rd").success).toBe(false);
    expect(castContingency({ "6th": 1, "3rd": 0 }, "3rd").success).toBe(false);
    expect(castContingency({ "6th": 2 }, "6th").success).toBe(false);
  });
});
