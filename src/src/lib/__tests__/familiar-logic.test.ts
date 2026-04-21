import { describe, it, expect } from "vitest";
import {
  createFamiliar,
  applyFamiliarDamage,
  dismissFamiliar,
  removeDead,
} from "../familiar-logic";
import type { FamiliarInstance } from "../../types/character";

describe("createFamiliar", () => {
  it("creates a falcon with correct stats and 0 tempHp", () => {
    const f = createFamiliar("falcon");
    expect(f.familiarType).toBe("falcon");
    expect(f.maxHp).toBe(1);
    expect(f.currentHp).toBe(1);
    expect(f.tempHp).toBe(0);
    expect(f.id).toBeTruthy();
    expect(f.summonedAt).toBeGreaterThan(0);
  });

  it("creates a fox with correct stats and 0 tempHp", () => {
    const f = createFamiliar("fox");
    expect(f.familiarType).toBe("fox");
    expect(f.maxHp).toBe(2);
    expect(f.currentHp).toBe(2);
    expect(f.tempHp).toBe(0);
  });

  it("creates a hound with tempHp = floor(sorcererLevel / 2)", () => {
    const f = createFamiliar("hound", 7);
    expect(f.familiarType).toBe("hound");
    expect(f.maxHp).toBe(37);
    expect(f.currentHp).toBe(37);
    expect(f.tempHp).toBe(3);
  });

  it("hound at level 1 gets tempHp 0", () => {
    const f = createFamiliar("hound", 1);
    expect(f.tempHp).toBe(0);
  });

  it("hound at level 20 gets tempHp 10", () => {
    const f = createFamiliar("hound", 20);
    expect(f.tempHp).toBe(10);
  });

  it("hound without sorcererLevel gets tempHp 0", () => {
    const f = createFamiliar("hound");
    expect(f.tempHp).toBe(0);
  });
});

describe("applyFamiliarDamage", () => {
  it("reduces tempHp first, then currentHp", () => {
    const familiar: FamiliarInstance = {
      id: "test-1", familiarType: "hound", currentHp: 37, maxHp: 37, tempHp: 5, summonedAt: 1000,
    };
    const result = applyFamiliarDamage(familiar, 8);
    expect(result.tempHp).toBe(0);
    expect(result.currentHp).toBe(34);
  });

  it("damage exactly equal to tempHp leaves currentHp unchanged", () => {
    const familiar: FamiliarInstance = {
      id: "test-2", familiarType: "hound", currentHp: 37, maxHp: 37, tempHp: 5, summonedAt: 1000,
    };
    const result = applyFamiliarDamage(familiar, 5);
    expect(result.tempHp).toBe(0);
    expect(result.currentHp).toBe(37);
  });

  it("clamps currentHp to 0 on overkill", () => {
    const familiar: FamiliarInstance = {
      id: "test-3", familiarType: "falcon", currentHp: 1, maxHp: 1, tempHp: 0, summonedAt: 1000,
    };
    const result = applyFamiliarDamage(familiar, 100);
    expect(result.tempHp).toBe(0);
    expect(result.currentHp).toBe(0);
  });

  it("damage with 0 tempHp goes straight to currentHp", () => {
    const familiar: FamiliarInstance = {
      id: "test-4", familiarType: "fox", currentHp: 2, maxHp: 2, tempHp: 0, summonedAt: 1000,
    };
    const result = applyFamiliarDamage(familiar, 1);
    expect(result.tempHp).toBe(0);
    expect(result.currentHp).toBe(1);
  });
});

describe("dismissFamiliar", () => {
  it("removes the familiar with the given ID", () => {
    const familiars: FamiliarInstance[] = [
      { id: "a", familiarType: "falcon", currentHp: 1, maxHp: 1, tempHp: 0, summonedAt: 1 },
      { id: "b", familiarType: "hound", currentHp: 37, maxHp: 37, tempHp: 5, summonedAt: 2 },
    ];
    const result = dismissFamiliar(familiars, "a");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b");
  });

  it("returns same array when ID not found", () => {
    const familiars: FamiliarInstance[] = [
      { id: "a", familiarType: "falcon", currentHp: 1, maxHp: 1, tempHp: 0, summonedAt: 1 },
    ];
    const result = dismissFamiliar(familiars, "nonexistent");
    expect(result).toHaveLength(1);
  });
});

describe("removeDead", () => {
  it("filters out familiars with currentHp <= 0", () => {
    const familiars: FamiliarInstance[] = [
      { id: "a", familiarType: "falcon", currentHp: 0, maxHp: 1, tempHp: 0, summonedAt: 1 },
      { id: "b", familiarType: "hound", currentHp: 10, maxHp: 37, tempHp: 0, summonedAt: 2 },
      { id: "c", familiarType: "fox", currentHp: 0, maxHp: 2, tempHp: 0, summonedAt: 3 },
    ];
    const result = removeDead(familiars);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b");
  });

  it("returns empty array when all are dead", () => {
    const familiars: FamiliarInstance[] = [
      { id: "a", familiarType: "falcon", currentHp: 0, maxHp: 1, tempHp: 0, summonedAt: 1 },
    ];
    expect(removeDead(familiars)).toHaveLength(0);
  });

  it("preserves all familiars when none are dead", () => {
    const familiars: FamiliarInstance[] = [
      { id: "a", familiarType: "falcon", currentHp: 1, maxHp: 1, tempHp: 0, summonedAt: 1 },
      { id: "b", familiarType: "fox", currentHp: 2, maxHp: 2, tempHp: 0, summonedAt: 2 },
    ];
    expect(removeDead(familiars)).toHaveLength(2);
  });
});
