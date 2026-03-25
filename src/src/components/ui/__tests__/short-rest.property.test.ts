import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { CharacterData, Action, ClassResources } from "@/types";

/**
 * Property 8: Short rest healing never exceeds maxHp and hit dice spent never exceeds available
 *
 * **Validates: Requirements 11.3, 11.4, 11.7**
 *
 * This test generates arbitrary pre-rest character states and hit dice spending
 * amounts, then verifies that:
 * - HP after healing is always clamped to [0, maxHp]
 * - Hit dice spent never exceeds available hit dice
 * - Each die rolled contributes at least 1 HP (minimum floor)
 */

// --- Pure short rest logic extracted from dashboard/page.tsx ---

interface ShortRestResult {
  currentHp: number;
  hitDiceAvailable: number;
  diceRolls: number[];
  totalHealing: number;
}

function applyShortRest(
  data: CharacterData,
  hitDiceToSpend: number,
  rollFn: (hitDiceSize: number) => number
): ShortRestResult {
  const diceToSpend = Math.min(
    Math.max(0, hitDiceToSpend),
    data.hitDiceAvailable
  );
  const conMod = data.stats.CON.modifier;

  const diceRolls: number[] = [];
  let totalHealing = 0;
  for (let i = 0; i < diceToSpend; i++) {
    const roll = Math.max(1, rollFn(data.hitDiceSize) + conMod);
    diceRolls.push(roll);
    totalHealing += roll;
  }

  return {
    currentHp: Math.min(data.maxHp, data.currentHp + totalHealing),
    hitDiceAvailable: data.hitDiceAvailable - diceToSpend,
    diceRolls,
    totalHealing,
  };
}

// --- Arbitraries ---

const actionArb: fc.Arbitrary<Action> = fc
  .record({
    name: fc.string({ minLength: 1, maxLength: 20 }),
    description: fc.string({ maxLength: 50 }),
    available: fc.boolean(),
    recharge: fc.constantFrom("short_rest" as const, "long_rest" as const),
    uses: fc.integer({ min: 0, max: 5 }),
    maxUses: fc.integer({ min: 1, max: 5 }),
  })
  .map((a) => ({
    ...a,
    uses: Math.min(a.uses, a.maxUses),
  }));

const classResourcesArb: fc.Arbitrary<ClassResources> = fc.oneof(
  // Sorcerer-like (Madea)
  fc.record({
    sorceryPointsMax: fc.integer({ min: 1, max: 10 }),
    currentSorceryPoints: fc.integer({ min: 0, max: 10 }),
    ravenFormActive: fc.boolean(),
    ravenFormUsesRemaining: fc.integer({ min: 0, max: 3 }),
    ravenFormMaxUses: fc.integer({ min: 1, max: 3 }),
    sorcerousRestorationUsed: fc.boolean(),
    feyBaneUsed: fc.boolean(),
    feyMistyStepUsed: fc.boolean(),
  }).map((cr) => ({
    ...cr,
    currentSorceryPoints: Math.min(cr.currentSorceryPoints, cr.sorceryPointsMax),
    ravenFormUsesRemaining: Math.min(cr.ravenFormUsesRemaining, cr.ravenFormMaxUses),
  })),
  // Wizard/Bladesinger-like (Ramil)
  fc.record({
    bladesongActive: fc.boolean(),
    bladesongUsesRemaining: fc.integer({ min: 0, max: 5 }),
    bladesongMaxUses: fc.integer({ min: 1, max: 5 }),
    druidCharmPersonUsed: fc.boolean(),
  }).map((cr) => ({
    ...cr,
    bladesongUsesRemaining: Math.min(cr.bladesongUsesRemaining, cr.bladesongMaxUses),
  })),
  // Minimal
  fc.constant({} as ClassResources)
);

const actionsMapArb: fc.Arbitrary<Record<string, Action>> = fc
  .array(fc.tuple(fc.string({ minLength: 1, maxLength: 10 }), actionArb), {
    minLength: 0,
    maxLength: 4,
  })
  .map((entries) => Object.fromEntries(entries));

const characterDataArb: fc.Arbitrary<CharacterData> = fc
  .record({
    maxHp: fc.integer({ min: 1, max: 100 }),
    currentHp: fc.integer({ min: 0, max: 100 }),
    defaultBaseAc: fc.integer({ min: 8, max: 20 }),
    ac: fc.integer({ min: 5, max: 30 }),
    baseAc: fc.integer({ min: 8, max: 25 }),
    inspiration: fc.integer({ min: 0, max: 10 }),
    luckPoints: fc.integer({ min: 0, max: 3 }),
    shieldActive: fc.boolean(),
    mageArmorActive: fc.boolean(),
    hitDiceTotal: fc.integer({ min: 1, max: 10 }),
    hitDiceAvailable: fc.integer({ min: 0, max: 10 }),
    hitDiceSize: fc.constantFrom(6, 10),
    conModifier: fc.integer({ min: -3, max: 5 }),
    actions: actionsMapArb,
    classResources: classResourcesArb,
  })
  .map((partial) => ({
    characterName: "Test",
    race: "Human",
    charClass: "Fighter 1",
    level: 5,
    proficiencyBonus: 3,
    stats: {
      STR: { value: 10, modifier: 0 },
      DEX: { value: 14, modifier: 2 },
      CON: { value: 10 + partial.conModifier * 2, modifier: partial.conModifier },
      INT: { value: 16, modifier: 3 },
      WIS: { value: 10, modifier: 0 },
      CHA: { value: 8, modifier: -1 },
    },
    skills: [],
    featsTraits: [],
    cantrips: [],
    spells: {},
    spellSlots: {},
    currentSpellSlots: {},
    createdSpellSlots: {},
    weapons: [],
    fightingStyles: {},
    saveProficiencies: [] as const,
    deathSaves: { successes: 0, failures: 0 },
    inventory: { gear: [], utility: [], treasure: [] },
    coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    journal: { sessions: {}, currentSession: "" },
    characters: {},
    places: {},
    ...partial,
    currentHp: Math.min(partial.currentHp, partial.maxHp),
    hitDiceAvailable: Math.min(partial.hitDiceAvailable, partial.hitDiceTotal),
  } as CharacterData));

/** Generates a raw die roll in [1, sides] */
const dieRollArb = (sides: number) => fc.integer({ min: 1, max: sides });

// --- Property tests ---

describe("Short rest hit die healing property tests", () => {
  it("Property 8: Short rest healing never exceeds maxHp and hit dice spent never exceeds available", () => {
    /**
     * **Validates: Requirements 11.3, 11.4, 11.7**
     */
    fc.assert(
      fc.property(
        characterDataArb,
        fc.integer({ min: -2, max: 15 }), // hitDiceToSpend (intentionally wider than valid range)
        fc.func(fc.integer({ min: 1, max: 20 })), // rollFn producing raw die results
        (preRest, hitDiceToSpend, rollFn) => {
          const result = applyShortRest(preRest, hitDiceToSpend, rollFn);

          // Req 11.4: HP after healing never exceeds maxHp
          expect(result.currentHp).toBeLessThanOrEqual(preRest.maxHp);
          expect(result.currentHp).toBeGreaterThanOrEqual(0);

          // Req 11.4: HP should be at least what it was before (healing can't reduce HP)
          expect(result.currentHp).toBeGreaterThanOrEqual(preRest.currentHp);

          // Req 11.7: Hit dice spent never exceeds available
          expect(result.hitDiceAvailable).toBeGreaterThanOrEqual(0);
          expect(result.hitDiceAvailable).toBeLessThanOrEqual(preRest.hitDiceAvailable);

          // The number of dice actually spent
          const actualSpent = preRest.hitDiceAvailable - result.hitDiceAvailable;
          expect(actualSpent).toBeGreaterThanOrEqual(0);
          expect(actualSpent).toBeLessThanOrEqual(preRest.hitDiceAvailable);

          // Req 11.3: Each die rolled contributes at least 1 (Math.max(1, roll + conMod))
          for (const roll of result.diceRolls) {
            expect(roll).toBeGreaterThanOrEqual(1);
          }

          // Number of dice rolls matches actual dice spent
          expect(result.diceRolls.length).toBe(actualSpent);

          // Total healing equals sum of individual rolls
          const expectedTotal = result.diceRolls.reduce((sum, r) => sum + r, 0);
          expect(result.totalHealing).toBe(expectedTotal);

          // Final HP = min(maxHp, preRest.currentHp + totalHealing)
          expect(result.currentHp).toBe(
            Math.min(preRest.maxHp, preRest.currentHp + result.totalHealing)
          );
        }
      ),
      { numRuns: 500 }
    );
  });
});
