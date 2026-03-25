import type { Weapon, CharacterData } from "@/types";

/**
 * Calculate the ability modifier used for a weapon's attack/damage.
 * - DEX for finesse weapons (encoded in attackStat)
 * - STR otherwise
 * - INT when Bladesong is active (Ramil) for non-STR weapons
 */
export function getWeaponAbilityMod(
  weapon: Weapon,
  stats: CharacterData["stats"],
  bladesongActive: boolean
): number {
  if (bladesongActive && weapon.attackStat !== "STR") {
    return stats.INT.modifier;
  }
  return stats[weapon.attackStat].modifier;
}

/**
 * Calculate the attack bonus for a weapon.
 * Attack bonus = proficiency bonus + ability modifier + magic bonus
 */
export function calcAttackBonus(
  weapon: Weapon,
  proficiencyBonus: number,
  stats: CharacterData["stats"],
  bladesongActive: boolean
): number {
  return proficiencyBonus + getWeaponAbilityMod(weapon, stats, bladesongActive) + weapon.magicBonus;
}

/**
 * Calculate the damage bonus for a weapon.
 * Damage bonus = ability modifier + magic bonus
 * For off-hand attacks: only add ability modifier if Two-Weapon Fighting style is active.
 */
export function calcDamageBonus(
  weapon: Weapon,
  stats: CharacterData["stats"],
  bladesongActive: boolean,
  isOffHand: boolean,
  hasTwoWeaponFighting: boolean
): number {
  const abilityMod = getWeaponAbilityMod(weapon, stats, bladesongActive);
  if (isOffHand && !hasTwoWeaponFighting) {
    return weapon.magicBonus;
  }
  return abilityMod + weapon.magicBonus;
}
