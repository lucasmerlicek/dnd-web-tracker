import type { FamiliarStatBlock } from "@/types/character";

export const FAMILIAR_STAT_BLOCKS: Record<string, FamiliarStatBlock> = {
  falcon: {
    name: "Falcon",
    type: "beast",
    ac: 13,
    maxHp: 1,
    speed: "10 ft, fly 60 ft",
    abilities: {
      STR: { value: 5, modifier: -3 },
      DEX: { value: 16, modifier: 3 },
      CON: { value: 8, modifier: -1 },
      INT: { value: 2, modifier: -4 },
      WIS: { value: 14, modifier: 2 },
      CHA: { value: 6, modifier: -2 },
    },
    passivePerception: 14,
    traits: ["Keen Sight: Advantage on Perception checks relying on sight"],
  },
  fox: {
    name: "Fox",
    type: "beast",
    ac: 13,
    maxHp: 2,
    speed: "30 ft, burrow 5 ft",
    abilities: {
      STR: { value: 2, modifier: -4 },
      DEX: { value: 16, modifier: 3 },
      CON: { value: 11, modifier: 0 },
      INT: { value: 3, modifier: -4 },
      WIS: { value: 12, modifier: 1 },
      CHA: { value: 6, modifier: -2 },
    },
    passivePerception: 13,
    traits: [
      "Keen Hearing: Advantage on Perception checks relying on hearing",
      "Darkvision 60 ft",
    ],
  },
  hound: {
    name: "Hound of Ill Omen",
    type: "monstrosity",
    ac: 14,
    maxHp: 37,
    speed: "50 ft",
    abilities: {
      STR: { value: 17, modifier: 3 },
      DEX: { value: 15, modifier: 2 },
      CON: { value: 15, modifier: 2 },
      INT: { value: 3, modifier: -4 },
      WIS: { value: 12, modifier: 1 },
      CHA: { value: 7, modifier: -2 },
    },
    traits: [
      "Target has disadvantage on saves vs caster's spells while Hound is within 5 ft",
      "Can move through creatures and objects as difficult terrain",
    ],
    attacks: [
      {
        name: "Bite",
        toHit: 5,
        damageDice: "2d6+3",
        damageType: "piercing",
        description: "DC 13 STR save or knocked prone",
      },
    ],
  },
};
