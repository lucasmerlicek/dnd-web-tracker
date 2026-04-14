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

/** Arbitrary subset of mutable CharacterData keys we can snapshot/mutate. */
const mutableKeys: (keyof CharacterData)[] = [
  "currentHp",
  "ac",
  "baseAc",
  "inspiration",
  "luckPoints",
  "shieldActive",
  "mageArmorActive",
  "hitDiceAvailable",
];

/** Generate a minimal but valid CharacterData with random numeric fields. */
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

/** Pick a non-empty subset of mutable keys. */
const arbKeySubset: fc.Arbitrary<(keyof CharacterData)[]> = fc
  .subarray(mutableKeys, { minLength: 1 })
  .filter((arr) => arr.length > 0);

/** Generate a partial mutation for the given keys with new random values. */
function arbMutationForKeys(
  keys: (keyof CharacterData)[]
): fc.Arbitrary<Partial<CharacterData>> {
  return fc
    .record({
      currentHp: fc.integer({ min: 0, max: 200 }),
      ac: fc.integer({ min: 0, max: 30 }),
      baseAc: fc.integer({ min: 0, max: 30 }),
      inspiration: fc.integer({ min: 0, max: 2 }),
      luckPoints: fc.integer({ min: 0, max: 5 }),
      shieldActive: fc.boolean(),
      mageArmorActive: fc.boolean(),
      hitDiceAvailable: fc.integer({ min: 0, max: 20 }),
    })
    .map((full) => {
      const partial: Partial<CharacterData> = {};
      for (const k of keys) {
        if (k in full) {
          (partial as Record<string, unknown>)[k] = (
            full as Record<string, unknown>
          )[k];
        }
      }
      return partial;
    });
}

// ---------------------------------------------------------------------------
// Property 4: Undo round-trip
// ---------------------------------------------------------------------------

describe("Feature: dnd-tracker-enhancements, Property 4: Undo round-trip", () => {
  /**
   * **Validates: Requirements 4.2, 4.6**
   *
   * For any valid CharacterData state S and any partial mutation P,
   * capturing a snapshot of the changed keys, applying P to produce S',
   * then restoring the snapshot fields should recover the original values
   * for every key that was changed.
   */
  it("applying a mutation then undoing restores original fields", () => {
    fc.assert(
      fc.property(
        arbCharacterData,
        arbKeySubset,
        (originalData, keys) => {
          // 1. Capture snapshot of the keys we're about to change
          const snapshot = captureSnapshot(originalData, keys);

          // 2. Push snapshot onto a stack and verify we can pop it back
          const stack = pushSnapshot([], snapshot);
          const { snapshot: popped } = popSnapshot(stack);
          expect(popped).not.toBeNull();

          // 3. Simulate applying a mutation (create mutated copy)
          const mutatedData = { ...originalData };
          // Apply arbitrary new values to the keys
          for (const key of keys) {
            // Just flip/change the value to ensure it's different
            if (typeof originalData[key] === "boolean") {
              (mutatedData as Record<string, unknown>)[key] =
                !originalData[key];
            } else if (typeof originalData[key] === "number") {
              (mutatedData as Record<string, unknown>)[key] =
                (originalData[key] as number) + 1;
            }
          }

          // 4. Restore: apply the snapshot fields back onto the mutated data
          const restoredData = { ...mutatedData, ...popped!.fields };

          // 5. Verify: every snapshotted key matches the original
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
  /**
   * **Validates: Requirements 4.3**
   *
   * For any sequence of N pushes (up to 100), the undo stack length
   * should never exceed 20 (the default cap).
   */
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

            // Invariant: stack size never exceeds 20
            expect(stack.length).toBeLessThanOrEqual(20);
          }

          // Final size is min(numPushes, 20)
          expect(stack.length).toBe(Math.min(numPushes, 20));
        }
      ),
      { numRuns: 100 }
    );
  });
});
