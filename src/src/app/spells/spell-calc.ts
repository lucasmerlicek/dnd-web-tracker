import type { AbilityName } from "@/types/character";
import type { SpellData } from "@/types/spell";
import { METAMAGIC_OPTIONS } from "@/types/spell";

/**
 * Parse a dice expression like "8d6" into its count and sides.
 * Returns null if the expression is invalid.
 */
export function parseDiceExpression(
  expr: string
): { count: number; sides: number } | null {
  const match = expr.match(/^(\d+)d(\d+)$/);
  if (!match) return null;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  if (count <= 0 || sides <= 0) return null;
  return { count, sides };
}

/**
 * Spell attack modifier = proficiency + spellcasting ability modifier
 */
export function calcSpellAttackBonus(
  proficiencyBonus: number,
  spellcastingAbility: AbilityName,
  stats: Record<AbilityName, { value: number; modifier: number }>
): number {
  return proficiencyBonus + stats[spellcastingAbility].modifier;
}

/**
 * Spell save DC = 8 + proficiency + spellcasting ability modifier
 */
export function calcSpellSaveDC(
  proficiencyBonus: number,
  spellcastingAbility: AbilityName,
  stats: Record<AbilityName, { value: number; modifier: number }>
): number {
  return 8 + proficiencyBonus + stats[spellcastingAbility].modifier;
}

/**
 * Cantrip scaling multiplier based on character level.
 * 1 at levels 1–4, 2 at 5–10, 3 at 11–16, 4 at 17–20.
 */
function cantripDiceMultiplier(characterLevel: number): number {
  if (characterLevel >= 17) return 4;
  if (characterLevel >= 11) return 3;
  if (characterLevel >= 5) return 2;
  return 1;
}

/**
 * Returns the damage dice string for a cantrip at the given character level.
 * E.g. calcCantripDice("1d10", 5) => "2d10"
 */
export function calcCantripDice(
  baseDice: string,
  characterLevel: number
): string {
  const parsed = parseDiceExpression(baseDice);
  if (!parsed) return baseDice;
  const multiplier = cantripDiceMultiplier(characterLevel);
  return `${parsed.count * multiplier}d${parsed.sides}`;
}

/**
 * Returns the damage dice string when upcasting a spell.
 * E.g. calcUpcastDamage("8d6", 3, 5, "1d6") => "10d6"
 */
export function calcUpcastDamage(
  baseDamage: string,
  baseLevel: number,
  castLevel: number,
  upcastPerLevel: string
): string {
  const baseParsed = parseDiceExpression(baseDamage);
  const perLevelParsed = parseDiceExpression(upcastPerLevel);
  if (!baseParsed || !perLevelParsed) return baseDamage;
  const levelsAbove = castLevel - baseLevel;
  const newCount = baseParsed.count + levelsAbove * perLevelParsed.count;
  return `${newCount}d${baseParsed.sides}`;
}

/**
 * Whether a character can ritual-cast a given spell.
 * Wizards can ritual-cast any ritual spell (even unprepared).
 * Sorcerers cannot ritual-cast.
 */
export function canRitualCast(
  spell: SpellData,
  charClass: string,
  _preparedSpells: string[],
  _spellName: string
): boolean {
  if (!spell.ritual) return false;
  if (charClass.toLowerCase().includes("wizard")) return true;
  return false;
}

/**
 * Attempt to consume a spell slot. Returns new slot state or error.
 */
export function consumeSpellSlot(
  currentSlots: Record<string, number>,
  level: string
): { newSlots: Record<string, number>; success: boolean; error?: string } {
  const available = currentSlots[level] ?? 0;
  if (available <= 0) {
    return {
      newSlots: { ...currentSlots },
      success: false,
      error: `No spell slots remaining at level ${level}`,
    };
  }
  return {
    newSlots: { ...currentSlots, [level]: available - 1 },
    success: true,
  };
}

/**
 * Attempt to apply a Metamagic option. Returns new SP or error.
 */
export function applyMetamagic(
  option: "empowered" | "quickened",
  currentSP: number
): { newSP: number; success: boolean; error?: string } {
  const cost = METAMAGIC_OPTIONS[option].cost;
  if (currentSP < cost) {
    return {
      newSP: currentSP,
      success: false,
      error: `Insufficient sorcery points for ${METAMAGIC_OPTIONS[option].name} (need ${cost}, have ${currentSP})`,
    };
  }
  return {
    newSP: currentSP - cost,
    success: true,
  };
}

/**
 * Returns the spellcasting ability for a given class.
 * "CHA" for Sorcerer, "INT" for Wizard.
 */
export function getSpellcastingAbility(charClass: string): AbilityName {
  if (charClass.toLowerCase().includes("sorcerer")) return "CHA";
  return "INT";
}
