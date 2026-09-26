import type { AbilityName, CharacterData, GearItem, StatModifier } from '../types/character';

/**
 * All stat modifiers granted by the wearer's active gear. An item counts only
 * if it's equipped and, when it requires attunement, attuned.
 */
export function aggregateGearModifiers(items: GearItem[]): StatModifier[] {
  return items
    .filter(isGearActive)
    .flatMap((item) => item.statModifiers);
}

/** Sum of active gear modifiers for one stat key, e.g. "save" or "deathSave". */
export function getGearBonus(items: GearItem[] | undefined, stat: string): number {
  return aggregateGearModifiers(items ?? [])
    .filter((mod) => mod.stat === stat && mod.mode !== 'set')
    .reduce((sum, mod) => sum + mod.value, 0);
}

const ABILITIES: AbilityName[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

/** An item grants its bonuses when equipped and, if it needs attunement, attuned. */
export function isGearActive(item: GearItem): boolean {
  return item.equipped && (!item.requiresAttunement || item.attuned);
}

/**
 * Returns character data with ability scores adjusted by active gear, plus
 * matching skill modifiers. Used for display/rolls only — never persisted.
 * Returns the input unchanged (same reference) when no gear affects scores.
 */
export function applyGearAbilityScores(data: CharacterData): CharacterData {
  const gear = data.inventoryItems?.gear ?? [];
  const mods = gear.filter(isGearActive).flatMap((g) => g.statModifiers);
  if (mods.length === 0) return data;

  let changed = false;
  const stats = { ...data.stats };
  const deltas: Partial<Record<AbilityName, number>> = {};

  for (const ability of ABILITIES) {
    const base = data.stats[ability];
    if (!base) continue;
    let value = base.value;
    for (const mod of mods) {
      if (mod.stat.toUpperCase() !== ability) continue;
      value = mod.mode === 'set' ? Math.max(value, mod.value) : value + mod.value;
    }
    if (value !== base.value) {
      const modifier = Math.floor((value - 10) / 2);
      stats[ability] = { value, modifier };
      deltas[ability] = modifier - base.modifier;
      changed = true;
    }
  }
  if (!changed) return data;

  const skills = data.skills.map((s) =>
    deltas[s.stat] ? { ...s, modifier: s.modifier + (deltas[s.stat] ?? 0) } : s
  );
  // defaultBaseAc is stored as armor base + DEX mod (e.g. unarmored 10 + DEX),
  // so shift it by the DEX modifier change. Neither character wears heavy armor.
  const dexDelta = deltas.DEX ?? 0;
  return { ...data, stats, skills, defaultBaseAc: data.defaultBaseAc + dexDelta };
}

export function getEquippedAcBonus(items: GearItem[]): number {
  return getGearBonus(items, 'ac');
}
