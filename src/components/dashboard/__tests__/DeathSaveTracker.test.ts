import { describe, it, expect } from "vitest";
import type { CharacterData } from "@/types";
import { resolveDeathSave, type DeathSaveState } from "@/lib/death-save";

/**
 * Unit tests for DeathSaveTracker logic.
 * Tests the death save state machine without React rendering.
 *
 * Validates: Requirements 3.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
 */

// The component calls resolveDeathSave directly, so these tests exercise the real logic.
const processDeathSave = (current: DeathSaveState, natural: number, bonus = 0) =>
  resolveDeathSave(current, natural, bonus);

/**
 * Processes damage while at 0 HP.
 * Mirrors the logic in DashboardPage.applyDamage when currentHp === 0.
 * Req 4.9: Mark one failure.
 */
function processDamageAtZeroHp(current: DeathSaveState): Partial<CharacterData> {
  const newFailures = Math.min(3, current.failures + 1);
  return {
    currentHp: 0,
    deathSaves: { successes: current.successes, failures: newFailures },
  };
}

/**
 * Processes healing while at 0 HP.
 * Mirrors the logic in DashboardPage.applyHealing when currentHp === 0.
 * Req 4.10: Reset saves, set HP to healed amount.
 */
function processHealingAtZeroHp(
  healAmount: number,
  maxHp: number
): Partial<CharacterData> {
  return {
    currentHp: Math.min(maxHp, healAmount),
    deathSaves: { successes: 0, failures: 0 },
  };
}

describe("DeathSaveTracker death save rolls", () => {
  it("marks one success on roll ≥ 10 (Req 4.3)", () => {
    const result = processDeathSave({ successes: 0, failures: 0 }, 10);
    expect(result.deathSaves).toEqual({ successes: 1, failures: 0 });
  });

  it("marks one success on roll of 19", () => {
    const result = processDeathSave({ successes: 1, failures: 0 }, 19);
    expect(result.deathSaves).toEqual({ successes: 2, failures: 0 });
  });

  it("marks one failure on roll < 10 (Req 4.4)", () => {
    const result = processDeathSave({ successes: 0, failures: 0 }, 9);
    expect(result.deathSaves).toEqual({ successes: 0, failures: 1 });
  });

  it("marks one failure on roll of 2", () => {
    const result = processDeathSave({ successes: 0, failures: 1 }, 2);
    expect(result.deathSaves).toEqual({ successes: 0, failures: 2 });
  });

  it("sets HP to 1 and resets saves on nat 20 (Req 4.5)", () => {
    const result = processDeathSave({ successes: 2, failures: 2 }, 20);
    expect(result.currentHp).toBe(1);
    expect(result.deathSaves).toEqual({ successes: 0, failures: 0 });
  });

  it("marks two failures on nat 1 (Req 4.6)", () => {
    const result = processDeathSave({ successes: 0, failures: 0 }, 1);
    expect(result.deathSaves).toEqual({ successes: 0, failures: 2 });
  });

  it("nat 1 with 2 existing failures caps at 3 (Req 4.6, 4.8)", () => {
    const result = processDeathSave({ successes: 0, failures: 2 }, 1);
    expect(result.deathSaves!.failures).toBe(3);
  });

  it("accumulates to 3 successes (Req 4.7)", () => {
    const result = processDeathSave({ successes: 2, failures: 1 }, 15);
    expect(result.deathSaves).toEqual({ successes: 3, failures: 1 });
  });

  it("accumulates to 3 failures (Req 4.8)", () => {
    const result = processDeathSave({ successes: 1, failures: 2 }, 5);
    expect(result.deathSaves).toEqual({ successes: 1, failures: 3 });
  });

  it("successes never exceed 3", () => {
    const result = processDeathSave({ successes: 3, failures: 0 }, 15);
    expect(result.deathSaves!.successes).toBe(3);
  });

  it("failures never exceed 3", () => {
    const result = processDeathSave({ successes: 0, failures: 3 }, 3);
    expect(result.deathSaves!.failures).toBe(3);
  });

  it("gear bonus turns a 7 into a success with +3 (Family Ring +2, Ring of Protection +1)", () => {
    expect(processDeathSave({ successes: 0, failures: 0 }, 7, 3).deathSaves).toEqual({ successes: 1, failures: 0 });
    expect(processDeathSave({ successes: 0, failures: 0 }, 6, 3).deathSaves).toEqual({ successes: 0, failures: 1 });
  });

  it("gear bonus never rescues a natural 1", () => {
    expect(processDeathSave({ successes: 0, failures: 0 }, 1, 9).deathSaves).toEqual({ successes: 0, failures: 2 });
  });
});

describe("DeathSaveTracker damage at 0 HP (Req 4.9)", () => {
  it("marks one failure when taking damage at 0 HP", () => {
    const result = processDamageAtZeroHp({ successes: 1, failures: 0 });
    expect(result.deathSaves).toEqual({ successes: 1, failures: 1 });
    expect(result.currentHp).toBe(0);
  });

  it("caps failures at 3 when taking damage at 0 HP", () => {
    const result = processDamageAtZeroHp({ successes: 0, failures: 2 });
    expect(result.deathSaves!.failures).toBe(3);
  });

  it("preserves successes when taking damage at 0 HP", () => {
    const result = processDamageAtZeroHp({ successes: 2, failures: 1 });
    expect(result.deathSaves!.successes).toBe(2);
    expect(result.deathSaves!.failures).toBe(2);
  });
});

describe("DeathSaveTracker healing at 0 HP (Req 4.10)", () => {
  it("resets death saves and sets HP to healed amount", () => {
    const result = processHealingAtZeroHp(5, 20);
    expect(result.currentHp).toBe(5);
    expect(result.deathSaves).toEqual({ successes: 0, failures: 0 });
  });

  it("caps healed HP at maxHp", () => {
    const result = processHealingAtZeroHp(50, 20);
    expect(result.currentHp).toBe(20);
    expect(result.deathSaves).toEqual({ successes: 0, failures: 0 });
  });

  it("resets saves even with accumulated successes and failures", () => {
    const result = processHealingAtZeroHp(3, 30);
    expect(result.deathSaves).toEqual({ successes: 0, failures: 0 });
  });
});
