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

export interface HitDicePool {
  className: string;
  dieSize: number;
  total: number;
  available: number;
}

export interface StatModifier {
  stat: string;
  value: number;
}

export interface InventoryItemBase {
  id: string;
  name: string;
  description: string;
  quantity: number;
}

export interface GearItem extends InventoryItemBase {
  equipped: boolean;
  requiresAttunement: boolean;
  attuned: boolean;
  statModifiers: StatModifier[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UtilityItem extends InventoryItemBase {}

export interface TreasureItem extends InventoryItemBase {
  estimatedValue: number;
}

export interface SpellCreatedWeapon {
  id: string;
  name: string;
  sourceSpell: string;
  castLevel: number;
  damageDice: string;
  damageType: string;
  attackStat: AbilityName;
  properties: string[];
  magicBonus: number;
  active: boolean;
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
  innateSorceryActive?: boolean;
  innateSorceryUsesRemaining?: number;
  innateSorceryMaxUses?: number;

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

  // Hit Dice (legacy single-pool — kept for backward compatibility)
  hitDiceTotal: number;
  hitDiceAvailable: number;
  hitDiceSize: number;

  // Hit Dice (multiclass pools)
  hitDicePools?: HitDicePool[];

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

  // Inventory (legacy string arrays — kept for backward compatibility)
  inventory: {
    gear: string[];
    utility: string[];
    treasure: string[];
  };

  // Inventory (structured items)
  inventoryItems?: {
    gear: GearItem[];
    utility: UtilityItem[];
    treasure: TreasureItem[];
  };

  coins: { cp: number; sp: number; ep: number; gp: number; pp: number };

  // Spell-created weapons
  spellCreatedWeapons?: SpellCreatedWeapon[];

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
