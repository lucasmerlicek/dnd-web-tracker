import { describe, it, expect } from "vitest";
import {
  shouldPromptStrengthOfGrave,
  calcStrengthOfGraveDC,
  applyStrengthOfGraveResult,
} from "../strength-of-the-grave";

describe("shouldPromptStrengthOfGrave", () => {
  it("returns true when all conditions are met", () => {
    expect(shouldPromptStrengthOfGrave(10, 0, "fire", false, false)).toBe(true);
  });

  it("returns true when newHp is negative", () => {
    expect(shouldPromptStrengthOfGrave(10, -5, "necrotic", false, false)).toBe(true);
  });

  it("returns false when newHp > 0", () => {
    expect(shouldPromptStrengthOfGrave(10, 1, "fire", false, false)).toBe(false);
  });

  it("returns false when damage type is radiant", () => {
    expect(shouldPromptStrengthOfGrave(10, 0, "radiant", false, false)).toBe(false);
  });

  it("returns false when hit is critical", () => {
    expect(shouldPromptStrengthOfGrave(10, 0, "fire", true, false)).toBe(false);
  });

  it("returns false when feature already used", () => {
    expect(shouldPromptStrengthOfGrave(10, 0, "fire", false, true)).toBe(false);
  });

  it("returns true when damageType is undefined (untyped damage)", () => {
    expect(shouldPromptStrengthOfGrave(10, 0, undefined, false, false)).toBe(true);
  });
});

describe("calcStrengthOfGraveDC", () => {
  it("returns 5 + damageTaken", () => {
    expect(calcStrengthOfGraveDC(10)).toBe(15);
  });

  it("returns 6 for 1 damage", () => {
    expect(calcStrengthOfGraveDC(1)).toBe(6);
  });

  it("returns 5 for 0 damage", () => {
    expect(calcStrengthOfGraveDC(0)).toBe(5);
  });
});

describe("applyStrengthOfGraveResult", () => {
  it("survives when roll meets DC exactly", () => {
    const result = applyStrengthOfGraveResult(15, 15);
    expect(result.survived).toBe(true);
    expect(result.newHp).toBe(1);
  });

  it("survives when roll exceeds DC", () => {
    const result = applyStrengthOfGraveResult(20, 15);
    expect(result.survived).toBe(true);
    expect(result.newHp).toBe(1);
  });

  it("fails when roll is below DC", () => {
    const result = applyStrengthOfGraveResult(14, 15);
    expect(result.survived).toBe(false);
    expect(result.newHp).toBe(0);
  });

  it("fails when roll is 1 and DC is high", () => {
    const result = applyStrengthOfGraveResult(1, 105);
    expect(result.survived).toBe(false);
    expect(result.newHp).toBe(0);
  });
});
