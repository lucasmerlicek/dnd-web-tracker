import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  pushSnapshot,
  popSnapshot,
  captureSnapshot,
  UndoSnapshot,
} from "../undo-stack";
import type { CharacterData } from "../../types/character";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const mutableKeys: (keyof CharacterData)[] = [
  "currentHp", "ac", "baseAc", "inspiration", "luckPoints",
  "shieldActive", "mageArmorActive", "hitDiceAvailable",
];

const arbCharacterData: fc.Arbitrary<CharacterData> = fc
  .record({
    currentHp: fc.integer({ min: 0, max: 200 }),
    maxHp: fc.integer({ min: 1, max: 200 }),
    ac: fc.integer({ min: 0, max: 30 }),
    baseAc: fc.integer({ min: 0, max: 30 }),
    defaultBaseAc: fc.integer({ min: 0, max: 30 }),
    inspiration: fc.integer({ min: 0, max: 2 }),
    luckPoints: fc.integer({ min: 0, max: 5 }),
    level: fc.integer({ min: 1, max: 20 }),
    shieldActive: fc.boolean(),
    mageArmorActive: fc.boolean(),
    hitDiceTotal: fc.integer({ min: 1, max: 20 }),
    hitDiceAvailable: fc.integer({ min: 0, max: 20 }),
    hitDiceSize: fc.constantFrom(6, 8, 10, 12),
  })
  .map(
    (partial) =>
      ({
        characterName: "PropTest",
        race: "Human",
        charClass: "Fighter",
        proficiencyBonus: 2,
        stats: {} as CharacterData["stats"],
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
        ...partial,
      } as CharacterData)
  );

const arbKeySubset: fc.Arbitrary<(keyof CharacterData)[]> = fc
  .subarray(mutableKeys, { minLength: 1 })
  .filter((arr) => arr.length > 0);

// ---------------------------------------------------------------------------
// Property 4: Undo round-trip
// ---------------------------------------------------------------------------

describe("Feature: dnd-tracker-enhancements, Property 4: Undo round-trip", () => {
  it("applying a mutation then undoing restores original fields", () => {
    fc.assert(
      fc.property(
        arbCharacterData,
        arbKeySubset,
        (originalData, keys) => {
          const snapshot = captureSnapshot(originalData, keys);
          const stack = pushSnapshot([], snapshot);
          const { snapshot: popped } = popSnapshot(stack);
          expect(popped).not.toBeNull();

          const mutatedData = { ...originalData };
          for (const key of keys) {
            if (typeof originalData[key] === "boolean") {
              (mutatedData as Record<string, unknown>)[key] = !originalData[key];
            } else if (typeof originalData[key] === "number") {
              (mutatedData as Record<string, unknown>)[key] = (originalData[key] as number) + 1;
            }
          }

          const restoredData = { ...mutatedData, ...popped!.fields };

          for (const key of keys) {
            if (key in snapshot.fields) {
              expect(restoredData[key]).toEqual(originalData[key]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Undo stack size cap
// ---------------------------------------------------------------------------

describe("Feature: dnd-tracker-enhancements, Property 5: Undo stack size cap", () => {
  it("stack never exceeds 20 after any number of pushes", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (numPushes) => {
          let stack: UndoSnapshot[] = [];

          for (let i = 0; i < numPushes; i++) {
            const snapshot: UndoSnapshot = {
              timestamp: i,
              fields: { currentHp: i },
            };
            stack = pushSnapshot(stack, snapshot);
            expect(stack.length).toBeLessThanOrEqual(20);
          }

          expect(stack.length).toBe(Math.min(numPushes, 20));
        }
      ),
      { numRuns: 100 }
    );
  });
});
