export type AbilityName = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";

export interface Skill {
  name: string;
  stat: AbilityName;
  proficient: boolean;
  modifier: number;
}

export interface Weapon {
  name: string;
  damageDice: string;
  damageType: string;
  attackStat: AbilityName;
  properties: string[];
  magicBonus: number;
  usesDueling: boolean;
  twoHanded: boolean;
}

export interface Action {
  name: string;
  description: string;
  available: boolean;
  recharge: "short_rest" | "long_rest";
  uses: number;
  maxUses: number;
  dice?: string;
  bonus?: number;
}

export interface ClassResources {
  // Sorcerer (Madea)
  sorceryPointsMax?: number;
  currentSorceryPoints?: number;
  ravenFormActive?: boolean;
  ravenFormUsesRemaining?: number;
  ravenFormMaxUses?: number;
  sorcerousRestorationUsed?: boolean;

  // Wizard/Bladesinger (Ramil)
  bladesongActive?: boolean;
  bladesongUsesRemaining?: number;
  bladesongMaxUses?: number;
  preparedSpells?: string[];
  autoPreparedSpells?: string[];

  // Shared feat flags
  feyBaneUsed?: boolean;
  feyMistyStepUsed?: boolean;
  druidCharmPersonUsed?: boolean;
}

export interface CharacterData {
  // Identity
  characterName: string;
  race: string;
  charClass: string;
  level: number;

  // Health
  currentHp: number;
  maxHp: number;
  ac: number;
  baseAc: number;
  defaultBaseAc: number;

  // Resources
  inspiration: number;
  luckPoints: number;

  // Toggles
  shieldActive: boolean;
  mageArmorActive: boolean;

  // Hit Dice
  hitDiceTotal: number;
  hitDiceAvailable: number;
  hitDiceSize: number;

  // Ability Scores
  proficiencyBonus: number;
  stats: Record<AbilityName, { value: number; modifier: number }>;

  // Skills
  skills: Skill[];

  // Feats
  featsTraits: string[];

  // Spells
  spellSlots: Record<string, number>;
  currentSpellSlots: Record<string, number>;
  createdSpellSlots: Record<string, number>;
  cantrips: string[];
  spells: Record<string, string[]>;

  // Weapons
  weapons: Weapon[];
  fightingStyles: Record<string, boolean>;

  // Saves
  saveProficiencies: AbilityName[];
  deathSaves: { successes: number; failures: number };

  // Actions
  actions: Record<string, Action>;

  // Inventory
  inventory: {
    gear: string[];
    utility: string[];
    treasure: string[];
  };
  coins: { cp: number; sp: number; ep: number; gp: number; pp: number };

  // Journal
  journal: {
    sessions: Record<string, string>;
    currentSession: string;
  };
  characters: Record<string, string>;
  places: Record<string, string>;

  // Class-specific resources
  classResources: ClassResources;
}
