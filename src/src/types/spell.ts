import type { AbilityName } from "./character";

export type SpellSchool =
  | "Abjuration"
  | "Conjuration"
  | "Divination"
  | "Enchantment"
  | "Evocation"
  | "Illusion"
  | "Necromancy"
  | "Transmutation";

export interface SpellData {
  name: string;
  level: number; // 0 for cantrip, 1-9 for leveled
  school: SpellSchool;
  castingTime: string; // e.g. "1 action", "1 bonus action", "1 reaction"
  range: string; // e.g. "120 feet", "Self", "Touch"
  components: {
    verbal: boolean;
    somatic: boolean;
    material: boolean;
    materialDescription?: string; // e.g. "a bit of phosphorus or a firefly"
  };
  duration: string; // e.g. "Instantaneous", "Concentration, up to 1 minute"
  description: string; // Full spell text
  damageDice?: string; // e.g. "8d6" (base damage)
  damageType?: string; // e.g. "lightning", "fire"
  saveType?: AbilityName; // e.g. "DEX" for Fireball
  attackRoll?: boolean; // true for spell attack spells
  ritual?: boolean; // true for ritual-tagged spells
  upcast?: {
    perLevel: string; // additional dice per level, e.g. "1d6"
  };
  cantripScaling?: boolean; // true if cantrip damage scales with character level
}

export const METAMAGIC_OPTIONS = {
  empowered: { name: "Empowered Spell", cost: 1 },
  quickened: { name: "Quickened Spell", cost: 2 },
} as const;

export const LEVEL_KEYS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  5: "5th",
  6: "6th",
  7: "7th",
  8: "8th",
  9: "9th",
};
