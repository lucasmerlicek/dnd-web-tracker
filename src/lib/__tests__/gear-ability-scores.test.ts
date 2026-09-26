import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { applyGearAbilityScores, isGearActive } from "../gear-stats";
import type { CharacterData, GearItem } from "../../types/character";

function makeChar(dex: number, gear: GearItem[]): CharacterData {
  const mod = Math.floor((dex - 10) / 2);
  return {
    stats: {
      STR: { value: 8, modifier: -1 },
      DEX: { value: dex, modifier: mod },
      CON: { value: 18, modifier: 4 },
      INT: { value: 14, modifier: 2 },
      WIS: { value: 10, modifier: 0 },
      CHA: { value: 20, modifier: 5 },
    },
    skills: [
      { name: "Stealth", stat: "DEX", proficient: false, modifier: mod },
      { name: "Acrobatics", stat: "DEX", proficient: true, modifier: mod + 4 },
      { name: "Arcana", stat: "INT", proficient: true, modifier: 6 },
    ],
    inventoryItems: { gear, utility: [], treasure: [] },
    defaultBaseAc: 10 + mod,
  } as unknown as CharacterData;
}

const bracers = (equipped: boolean, attuned: boolean): GearItem => ({
  id: "b",
  name: "Bracers of Dexterity",
  description: "",
  quantity: 1,
  equipped,
  requiresAttunement: true,
  attuned,
  statModifiers: [{ stat: "DEX", value: 18, mode: "set" }],
});

describe("gear ability scores", () => {
  it("only applies attunement items when equipped AND attuned", () => {
    expect(isGearActive(bracers(true, false))).toBe(false);
    expect(isGearActive(bracers(false, true))).toBe(false);
    expect(isGearActive(bracers(true, true))).toBe(true);
  });

  it("sets DEX to 18 and shifts DEX skills by the modifier delta", () => {
    const out = applyGearAbilityScores(makeChar(10, [bracers(true, true)]));
    expect(out.stats.DEX).toEqual({ value: 18, modifier: 4 });
    expect(out.skills.find((s) => s.name === "Stealth")!.modifier).toBe(4);
    expect(out.skills.find((s) => s.name === "Acrobatics")!.modifier).toBe(8); // keeps proficiency
    expect(out.skills.find((s) => s.name === "Arcana")!.modifier).toBe(6); // untouched
    expect(out.defaultBaseAc).toBe(14); // unarmored 10 + DEX 0 -> 10 + DEX 4
  });

  it("returns the same object when no gear is active", () => {
    const c = makeChar(10, [bracers(true, false)]);
    expect(applyGearAbilityScores(c)).toBe(c);
  });

  it("property: 'set' never lowers a score and never mutates input", () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 20 }), fc.integer({ min: 3, max: 20 }), (dex, setTo) => {
        const item = { ...bracers(true, true), statModifiers: [{ stat: "DEX", value: setTo, mode: "set" as const }] };
        const c = makeChar(dex, [item]);
        const before = JSON.stringify(c);
        const out = applyGearAbilityScores(c);
        expect(out.stats.DEX.value).toBe(Math.max(dex, setTo));
        expect(out.stats.DEX.modifier).toBe(Math.floor((Math.max(dex, setTo) - 10) / 2));
        expect(JSON.stringify(c)).toBe(before);
      }),
      { numRuns: 200 }
    );
  });
});
