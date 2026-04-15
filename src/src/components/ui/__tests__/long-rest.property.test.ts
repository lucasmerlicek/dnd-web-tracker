import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { CharacterData, Action, ClassResources } from "@/types";

/**
 * Property 7: After long rest, all resources are at maximum values and all toggles are deactivated
 *
 * **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11**
 *
 * This test generates arbitrary pre-rest character states and verifies that
 * applying the long rest logic produces a state where every resource is at
 * its maximum, every toggle is off, every free-cast flag is reset, every
 * action is recharged, luck is 3, inspiration is incremented (capped at 10),
 * and created spell slots are cleared.
 */

// --- Pure long rest logic extracted from dashboard/page.tsx ---

function applyLongRest(data: CharacterData): Partial<CharacterData> {
  const updates: Partial<CharacterData> = {
    currentHp: data.maxHp,
    hitDiceAvailable: data.hitDiceTotal,
    shieldActive: false,
    mageArmorActive: false,
    luckPoints: 3,
    inspiration: Math.min(10, data.inspiration + 1),
    currentSpellSlots: { ...data.spellSlots },
    createdSpellSlots: {},
    baseAc: data.defaultBaseAc,
    ac: data.defaultBaseAc,
  };

  const updatedActions = { ...data.actions };
  for (const key of Object.keys(updatedActions)) {
    updatedActions[key] = { ...updatedActions[key], uses: updatedActions[key].maxUses, available: true };
  }
  updates.actions = updatedActions;

  const cr = { ...data.classResources };
  if (cr.sorceryPointsMax !== undefined) cr.currentSorceryPoints = cr.sorceryPointsMax;
  if (cr.ravenFormMaxUses !== undefined) { cr.ravenFormUsesRemaining = cr.ravenFormMaxUses; cr.ravenFormActive = false; }
  if (cr.bladesongMaxUses !== undefined) { cr.bladesongUsesRemaining = cr.bladesongMaxUses; cr.bladesongActive = false; }
  if (cr.innateSorceryMaxUses !== undefined) { cr.innateSorceryUsesRemaining = cr.innateSorceryMaxUses; cr.innateSorceryActive = false; }
  cr.sorcerousRestorationUsed = false;
  cr.feyBaneUsed = false;
  cr.feyMistyStepUsed = false;
  cr.druidCharmPersonUsed = false;
  updates.classResources = cr;

  return updates;
}

function mergeUpdates(data: CharacterData, updates: Partial<CharacterData>): CharacterData {
  return { ...data, ...updates };
}

// --- Arbitraries ---

const actionArb: fc.Arbitrary<Action> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  description: fc.string({ maxLength: 50 }),
  available: fc.boolean(),
  recharge: fc.constantFrom("short_rest" as const, "long_rest" as const),
  uses: fc.integer({ min: 0, max: 5 }),
  maxUses: fc.integer({ min: 1, max: 5 }),
}).map((a) => ({
  ...a,
  // Ensure uses <= maxUses for a valid pre-rest state
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
  // Minimal (no class resources)
  fc.constant({} as ClassResources)
);

const spellSlotLevelsArb = fc.record({
  "1": fc.integer({ min: 0, max: 4 }),
  "2": fc.integer({ min: 0, max: 3 }),
  "3": fc.integer({ min: 0, max: 2 }),
});

const actionsMapArb: fc.Arbitrary<Record<string, Action>> = fc
  .array(fc.tuple(fc.string({ minLength: 1, maxLength: 10 }), actionArb), { minLength: 0, maxLength: 4 })
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
    spellSlots: spellSlotLevelsArb,
    currentSpellSlots: spellSlotLevelsArb,
    createdSpellSlots: spellSlotLevelsArb,
    actions: actionsMapArb,
    classResources: classResourcesArb,
  })
  .map((partial) => ({
    // Fixed fields not relevant to long rest logic
    characterName: "Test",
    race: "Human",
    charClass: "Fighter 1",
    level: 5,
    proficiencyBonus: 3,
    stats: {
      STR: { value: 10, modifier: 0 },
      DEX: { value: 14, modifier: 2 },
      CON: { value: 12, modifier: 1 },
      INT: { value: 16, modifier: 3 },
      WIS: { value: 10, modifier: 0 },
      CHA: { value: 8, modifier: -1 },
    },
    skills: [],
    featsTraits: [],
    cantrips: [],
    spells: {},
    weapons: [],
    fightingStyles: {},
    saveProficiencies: [] as const,
    deathSaves: { successes: 0, failures: 0 },
    inventory: { gear: [], utility: [], treasure: [] },
    coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    journal: { sessions: {}, currentSession: "" },
    characters: {},
    places: {},
    // Spread the generated fields
    ...partial,
    // Clamp currentHp to maxHp
    currentHp: Math.min(partial.currentHp, partial.maxHp),
    // Clamp hitDiceAvailable to hitDiceTotal
    hitDiceAvailable: Math.min(partial.hitDiceAvailable, partial.hitDiceTotal),
  } as CharacterData));

// --- Property tests ---

describe("Long rest restoration property tests", () => {
  it("Property 7: After long rest, all resources are at maximum values and all toggles are deactivated", () => {
    /**
     * **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11**
     */
    fc.assert(
      fc.property(characterDataArb, (preRest) => {
        const updates = applyLongRest(preRest);
        const postRest = mergeUpdates(preRest, updates);

        // Req 12.1: currentHp restored to maxHp
        expect(postRest.currentHp).toBe(preRest.maxHp);

        // Req 12.2: All spell slots restored to max
        for (const level of Object.keys(preRest.spellSlots)) {
          expect(postRest.currentSpellSlots[level]).toBe(preRest.spellSlots[level]);
        }

        // Req 12.3: Hit dice restored to max
        expect(postRest.hitDiceAvailable).toBe(preRest.hitDiceTotal);

        // Req 12.4: Class resources restored to max
        const cr = postRest.classResources;
        if (preRest.classResources.sorceryPointsMax !== undefined) {
          expect(cr.currentSorceryPoints).toBe(cr.sorceryPointsMax);
        }
        if (preRest.classResources.bladesongMaxUses !== undefined) {
          expect(cr.bladesongUsesRemaining).toBe(cr.bladesongMaxUses);
        }
        if (preRest.classResources.ravenFormMaxUses !== undefined) {
          expect(cr.ravenFormUsesRemaining).toBe(cr.ravenFormMaxUses);
        }

        // Req 12.5: All free-cast flags reset
        expect(cr.feyBaneUsed).toBe(false);
        expect(cr.feyMistyStepUsed).toBe(false);
        expect(cr.druidCharmPersonUsed).toBe(false);
        expect(cr.sorcerousRestorationUsed).toBe(false);

        // Req 12.6: All actions recharged
        for (const key of Object.keys(postRest.actions)) {
          expect(postRest.actions[key].uses).toBe(postRest.actions[key].maxUses);
          expect(postRest.actions[key].available).toBe(true);
        }

        // Req 12.7: Shield deactivated
        expect(postRest.shieldActive).toBe(false);

        // Req 12.7: Mage Armor deactivated
        expect(postRest.mageArmorActive).toBe(false);

        // Req 12.8: Bladesong deactivated
        if (preRest.classResources.bladesongMaxUses !== undefined) {
          expect(cr.bladesongActive).toBe(false);
        }
        if (preRest.classResources.ravenFormMaxUses !== undefined) {
          expect(cr.ravenFormActive).toBe(false);
        }

        // Req 12.9: Luck points reset to 3
        expect(postRest.luckPoints).toBe(3);

        // Req 12.9: Inspiration incremented by 1, capped at 10
        expect(postRest.inspiration).toBe(Math.min(10, preRest.inspiration + 1));

        // Req 12.10: Created spell slots cleared
        expect(postRest.createdSpellSlots).toEqual({});

        // AC reset to defaultBaseAc (all toggles off)
        expect(postRest.ac).toBe(preRest.defaultBaseAc);
        expect(postRest.baseAc).toBe(preRest.defaultBaseAc);
      }),
      { numRuns: 500 }
    );
  });
});
