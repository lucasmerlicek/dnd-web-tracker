import type { GearItem, StatModifier } from '../types/character';

export function aggregateGearModifiers(items: GearItem[]): StatModifier[] {
  return items
    .filter((item) => item.equipped)
    .flatMap((item) => item.statModifiers);
}

export function getEquippedAcBonus(items: GearItem[]): number {
  return aggregateGearModifiers(items)
    .filter((mod) => mod.stat === 'ac')
    .reduce((sum, mod) => sum + mod.value, 0);
}
