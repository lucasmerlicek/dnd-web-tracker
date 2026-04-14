import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type {
  AbilityName, Skill, Weapon, Action, ClassResources, CharacterData,
} from "@/types/character";

const abilityNameArb: fc.Arbitrary<AbilityName> = fc.constantFrom("STR", "DEX", "CON", "INT", "WIS", "CHA");

const skillArb: fc.Arbitrary<Skill> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  stat: abilityNameArb,
  proficient: fc.boolean(),
  modifier: fc.integer({ min: -5, max: 15 }),
});

const weaponArb: fc.Arbitrary<Weapon> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  damageDice: fc.stringMatching(/^[1-4]d(4|6|8|10|12)$/),
  damageType: fc.constantFrom("slashing", "piercing", "bludgeoning", "fire", "cold"),
  attackStat: abilityNameArb,
  properties: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 4 }),
  magicBonus: fc.integer({ min: 0, max: 3 }),
  usesDueling: fc.boolean(),
  twoHanded: fc.boolean(),
});

const rechargeArb = fc.constantFrom<"short_rest" | "long_rest">("short_rest", "long_rest");

const actionArb: fc.Arbitrary<Action> = fc.record(
  {
    name: fc.string({ minLength: 1, maxLength: 30 }),
    description: fc.string({ maxLength: 100 }),
    available: fc.boolean(),
    recharge: rechargeArb,
    uses: fc.integer({ min: 0, max: 10 }),
    maxUses: fc.integer({ min: 1, max: 10 }),
    dice: fc.stringMatching(/^[1-4]d(4|6|8|10|12)$/),
    bonus: fc.integer({ min: -5, max: 15 }),
  },
  { requiredKeys: ["name", "description", "available", "recharge", "uses", "maxUses"] }
);

const classResourcesArb: fc.Arbitrary<ClassResources> = fc.record(
  {
    sorceryPointsMax: fc.integer({ min: 0, max: 20 }),
    currentSorceryPoints: fc.integer({ min: 0, max: 20 }),
    ravenFormActive: fc.boolean(),
    ravenFormUsesRemaining: fc.integer({ min: 0, max: 5 }),
    ravenFormMaxUses: fc.integer({ min: 0, max: 5 }),
    sorcerousRestorationUsed: fc.boolean(),
    bladesongActive: fc.boolean(),
    bladesongUsesRemaining: fc.integer({ min: 0, max: 5 }),
    bladesongMaxUses: fc.integer({ min: 0, max: 5 }),
    preparedSpells: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
    autoPreparedSpells: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
    feyBaneUsed: fc.boolean(),
    feyMistyStepUsed: fc.boolean(),
    druidCharmPersonUsed: fc.boolean(),
  },
  { requiredKeys: [] }
);

const abilityScoreArb = fc.record({
  value: fc.integer({ min: 1, max: 30 }),
  modifier: fc.integer({ min: -5, max: 10 }),
});

const statsArb: fc.Arbitrary<Record<AbilityName, { value: number; modifier: number }>> = fc.record({
  STR: abilityScoreArb, DEX: abilityScoreArb, CON: abilityScoreArb,
  INT: abilityScoreArb, WIS: abilityScoreArb, CHA: abilityScoreArb,
});

const spellLevelKey = fc.constantFrom("1", "2", "3");
const spellSlotsArb = fc.dictionary(spellLevelKey, fc.integer({ min: 0, max: 5 }));
const spellsByLevelArb = fc.dictionary(
  spellLevelKey,
  fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 8 })
);
const actionsRecordArb = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 20 }), actionArb, { maxKeys: 5 }
);
const coinsArb = fc.record({
  cp: fc.integer({ min: 0, max: 9999 }), sp: fc.integer({ min: 0, max: 9999 }),
  ep: fc.integer({ min: 0, max: 9999 }), gp: fc.integer({ min: 0, max: 9999 }),
  pp: fc.integer({ min: 0, max: 9999 }),
});
const inventoryArb = fc.record({
  gear: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
  utility: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
  treasure: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
});
const journalArb = fc.record({
  sessions: fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.string({ maxLength: 200 }), { maxKeys: 5 }),
  currentSession: fc.string({ minLength: 1, maxLength: 20 }),
});
const stringDictArb = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 20 }), fc.string({ maxLength: 100 }), { maxKeys: 5 }
);
const deathSavesArb = fc.record({
  successes: fc.integer({ min: 0, max: 3 }), failures: fc.integer({ min: 0, max: 3 }),
});
const fightingStylesArb = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 20 }), fc.boolean(), { maxKeys: 3 }
);

const characterDataArb: fc.Arbitrary<CharacterData> = fc.record({
  characterName: fc.string({ minLength: 1, maxLength: 30 }),
  race: fc.string({ minLength: 1, maxLength: 20 }),
  charClass: fc.string({ minLength: 1, maxLength: 40 }),
  level: fc.integer({ min: 1, max: 20 }),
  currentHp: fc.integer({ min: 0, max: 200 }),
  maxHp: fc.integer({ min: 1, max: 200 }),
  ac: fc.integer({ min: 5, max: 30 }),
  baseAc: fc.integer({ min: 5, max: 30 }),
  defaultBaseAc: fc.integer({ min: 5, max: 30 }),
  inspiration: fc.integer({ min: 0, max: 10 }),
  luckPoints: fc.integer({ min: 0, max: 3 }),
  shieldActive: fc.boolean(),
  mageArmorActive: fc.boolean(),
  hitDiceTotal: fc.integer({ min: 1, max: 20 }),
  hitDiceAvailable: fc.integer({ min: 0, max: 20 }),
  hitDiceSize: fc.constantFrom(6, 8, 10, 12),
  proficiencyBonus: fc.integer({ min: 2, max: 6 }),
  stats: statsArb,
  skills: fc.array(skillArb, { minLength: 1, maxLength: 18 }),
  featsTraits: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
  spellSlots: spellSlotsArb,
  currentSpellSlots: spellSlotsArb,
  createdSpellSlots: spellSlotsArb,
  cantrips: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 8 }),
  spells: spellsByLevelArb,
  weapons: fc.array(weaponArb, { maxLength: 5 }),
  fightingStyles: fightingStylesArb,
  saveProficiencies: fc.array(abilityNameArb, { maxLength: 6 }),
  deathSaves: deathSavesArb,
  actions: actionsRecordArb,
  inventory: inventoryArb,
  coins: coinsArb,
  journal: journalArb,
  characters: stringDictArb,
  places: stringDictArb,
  classResources: classResourcesArb,
});

describe("CharacterData JSON round-trip", () => {
  it("Property 1: Round-trip JSON serialization preserves all CharacterData fields", () => {
    fc.assert(
      fc.property(characterDataArb, (original: CharacterData) => {
        const serialized = JSON.stringify(original);
        const deserialized = JSON.parse(serialized) as CharacterData;
        expect(deserialized).toEqual(original);
      }),
      { numRuns: 200 }
    );
  });
});
