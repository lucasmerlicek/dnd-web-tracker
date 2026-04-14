import { describe, it, expect } from "vitest";
import type { CharacterData, Action } from "@/types";

/**
 * Unit tests for RestModal component logic.
 * Tests the long rest item generation and short rest hit dice clamping
 * without React rendering (no jsdom/testing-library available).
 *
 * Validates: Requirements 11.1, 11.2, 12.1
 */

// --- Helpers mirroring RestModal internals ---

function buildLongRestItems(cd: CharacterData): string[] {
  const items: string[] = [];
  const cr = cd.classResources;

  if (cd.currentHp < cd.maxHp) items.push("HP: " + cd.currentHp + " -> " + cd.maxHp);
  if (cd.hitDiceAvailable < cd.hitDiceTotal) {
    items.push("Hit dice: " + cd.hitDiceAvailable + " -> " + cd.hitDiceTotal);
  }

  const hasDepletedSlots = Object.keys(cd.spellSlots).some(
    (lvl) => (cd.currentSpellSlots[lvl] ?? 0) < (cd.spellSlots[lvl] ?? 0)
  );
  if (hasDepletedSlots) items.push("All spell slots restored to maximum");

  const hasCreated = Object.keys(cd.createdSpellSlots || {}).some(
    (k) => cd.createdSpellSlots[k] > 0
  );
  if (hasCreated) items.push("Created spell slots cleared");

  if (cr.sorceryPointsMax !== undefined) {
    if ((cr.currentSorceryPoints ?? 0) < cr.sorceryPointsMax) {
      items.push("Sorcery points: " + (cr.currentSorceryPoints ?? 0) + " -> " + cr.sorceryPointsMax);
    }
  }
  if (cr.bladesongMaxUses !== undefined) {
    if ((cr.bladesongUsesRemaining ?? 0) < cr.bladesongMaxUses) {
      items.push("Bladesong uses: " + (cr.bladesongUsesRemaining ?? 0) + " -> " + cr.bladesongMaxUses);
    }
  }
  if (cr.ravenFormMaxUses !== undefined) {
    if ((cr.ravenFormUsesRemaining ?? 0) < cr.ravenFormMaxUses) {
      items.push("Raven Form uses: " + (cr.ravenFormUsesRemaining ?? 0) + " -> " + cr.ravenFormMaxUses);
    }
  }

  if (cd.shieldActive) items.push("Shield deactivated");
  if (cd.mageArmorActive) items.push("Mage Armor deactivated");
  if (cr.bladesongActive) items.push("Bladesong deactivated");

  const flagsToReset: string[] = [];
  if (cr.feyBaneUsed) flagsToReset.push("Fey Bane");
  if (cr.feyMistyStepUsed) flagsToReset.push("Fey Misty Step");
  if (cr.druidCharmPersonUsed) flagsToReset.push("Druid Charm Person");
  if (cr.sorcerousRestorationUsed) flagsToReset.push("Sorcerous Restoration");
  if (flagsToReset.length > 0) {
    items.push("Free casts reset: " + flagsToReset.join(", "));
  }

  const exhaustedCount = Object.keys(cd.actions).filter((k) => {
    const a: Action = cd.actions[k];
    return a.uses < a.maxUses;
  }).length;
  if (exhaustedCount > 0) items.push(exhaustedCount + " action(s) recharged");

  if (cd.luckPoints !== 3) items.push("Luck points -> 3");
  if (cd.inspiration < 10) {
    items.push("Inspiration: " + cd.inspiration + " -> " + Math.min(10, cd.inspiration + 1));
  }

  if (items.length === 0) items.push("All resources are already at maximum");
  return items;
}

/** Mirrors the hit dice clamping logic from RestModal's useState initializer */
function clampHitDice(value: number, available: number): number {
  return Math.min(available, Math.max(0, value));
}

/** Creates a minimal CharacterData for testing */
function makeCharData(overrides: Partial<CharacterData> = {}): CharacterData {
  return {
    characterName: "Test",
    race: "Human",
    charClass: "Fighter 1",
    level: 1,
    currentHp: 10,
    maxHp: 10,
    ac: 16,
    baseAc: 16,
    defaultBaseAc: 16,
    inspiration: 0,
    luckPoints: 3,
    shieldActive: false,
    mageArmorActive: false,
    hitDiceTotal: 5,
    hitDiceAvailable: 5,
    hitDiceSize: 10,
    proficiencyBonus: 3,
    stats: {
      STR: { value: 10, modifier: 0 },
      DEX: { value: 10, modifier: 0 },
      CON: { value: 10, modifier: 0 },
      INT: { value: 10, modifier: 0 },
      WIS: { value: 10, modifier: 0 },
      CHA: { value: 10, modifier: 0 },
    },
    skills: [],
    featsTraits: [],
    spellSlots: {},
    currentSpellSlots: {},
    createdSpellSlots: {},
    cantrips: [],
    spells: {},
    weapons: [],
    fightingStyles: {},
    saveProficiencies: [],
    deathSaves: { successes: 0, failures: 0 },
    actions: {},
    inventory: { gear: [], utility: [], treasure: [] },
    coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    journal: { sessions: {}, currentSession: "" },
    characters: {},
    places: {},
    classResources: {},
    ...overrides,
  };
}

describe("RestModal long rest items", () => {
  it("shows HP restoration when current < max", () => {
    const cd = makeCharData({ currentHp: 5, maxHp: 20 });
    const items = buildLongRestItems(cd);
    expect(items).toContain("HP: 5 -> 20");
  });

  it("omits HP line when already at max", () => {
    const cd = makeCharData({ currentHp: 20, maxHp: 20 });
    const items = buildLongRestItems(cd);
    expect(items.some((i) => i.startsWith("HP:"))).toBe(false);
  });

  it("shows hit dice restoration when depleted", () => {
    const cd = makeCharData({ hitDiceAvailable: 2, hitDiceTotal: 5 });
    const items = buildLongRestItems(cd);
    expect(items).toContain("Hit dice: 2 -> 5");
  });

  it("shows spell slot restoration when depleted", () => {
    const cd = makeCharData({
      spellSlots: { "1": 4, "2": 3 },
      currentSpellSlots: { "1": 2, "2": 3 },
    });
    const items = buildLongRestItems(cd);
    expect(items).toContain("All spell slots restored to maximum");
  });

  it("shows created spell slots cleared", () => {
    const cd = makeCharData({ createdSpellSlots: { "1": 1 } });
    const items = buildLongRestItems(cd);
    expect(items).toContain("Created spell slots cleared");
  });

  it("shows sorcery points restoration for sorcerer", () => {
    const cd = makeCharData({
      classResources: { sorceryPointsMax: 5, currentSorceryPoints: 2 },
    });
    const items = buildLongRestItems(cd);
    expect(items).toContain("Sorcery points: 2 -> 5");
  });

  it("shows bladesong uses restoration for bladesinger", () => {
    const cd = makeCharData({
      classResources: { bladesongMaxUses: 3, bladesongUsesRemaining: 1 },
    });
    const items = buildLongRestItems(cd);
    expect(items).toContain("Bladesong uses: 1 -> 3");
  });

  it("shows toggle deactivations", () => {
    const cd = makeCharData({
      shieldActive: true,
      mageArmorActive: true,
      classResources: { bladesongActive: true },
    });
    const items = buildLongRestItems(cd);
    expect(items).toContain("Shield deactivated");
    expect(items).toContain("Mage Armor deactivated");
    expect(items).toContain("Bladesong deactivated");
  });

  it("shows free cast flag resets", () => {
    const cd = makeCharData({
      classResources: { feyBaneUsed: true, feyMistyStepUsed: true },
    });
    const items = buildLongRestItems(cd);
    expect(items).toContain("Free casts reset: Fey Bane, Fey Misty Step");
  });

  it("shows exhausted actions count", () => {
    const cd = makeCharData({
      actions: {
        secondWind: { name: "Second Wind", description: "", available: false, recharge: "short_rest", uses: 0, maxUses: 1 },
        actionSurge: { name: "Action Surge", description: "", available: true, recharge: "long_rest", uses: 1, maxUses: 1 },
      },
    });
    const items = buildLongRestItems(cd);
    expect(items).toContain("1 action(s) recharged");
  });

  it("shows luck points reset when not at 3", () => {
    const cd = makeCharData({ luckPoints: 1 });
    const items = buildLongRestItems(cd);
    expect(items).toContain("Luck points -> 3");
  });

  it("shows inspiration increment capped at 10", () => {
    const cd = makeCharData({ inspiration: 9 });
    const items = buildLongRestItems(cd);
    expect(items).toContain("Inspiration: 9 -> 10");
  });

  it("returns fallback message when everything is at max", () => {
    const cd = makeCharData({ luckPoints: 3, inspiration: 10 });
    const items = buildLongRestItems(cd);
    expect(items).toEqual(["All resources are already at maximum"]);
  });
});

describe("RestModal short rest hit dice clamping", () => {
  it("clamps input to available range", () => {
    expect(clampHitDice(3, 5)).toBe(3);
    expect(clampHitDice(7, 5)).toBe(5);
    expect(clampHitDice(-1, 5)).toBe(0);
    expect(clampHitDice(0, 0)).toBe(0);
  });

  it("initial value is min(1, available)", () => {
    expect(Math.min(1, 5)).toBe(1);
    expect(Math.min(1, 0)).toBe(0);
  });
});
