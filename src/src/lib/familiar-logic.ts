import type { FamiliarInstance } from "../types/character";
import { FAMILIAR_STAT_BLOCKS } from "../data/familiar-registry";

/**
 * Create a new familiar instance of the given type.
 *
 * For hound familiars, tempHp is set to floor(sorcererLevel / 2).
 * For all other types, tempHp is 0.
 */
export function createFamiliar(
  type: "falcon" | "fox" | "hound",
  sorcererLevel?: number
): FamiliarInstance {
  const statBlock = FAMILIAR_STAT_BLOCKS[type];

  return {
    id: crypto.randomUUID(),
    familiarType: type,
    currentHp: statBlock.maxHp,
    maxHp: statBlock.maxHp,
    tempHp:
      type === "hound" && sorcererLevel != null
        ? Math.floor(sorcererLevel / 2)
        : 0,
    summonedAt: Date.now(),
  };
}

/**
 * Apply damage to a familiar, reducing tempHp first, then currentHp.
 * Both values are clamped to 0.
 */
export function applyFamiliarDamage(
  familiar: FamiliarInstance,
  damage: number
): FamiliarInstance {
  const absorbed = Math.min(damage, familiar.tempHp);
  const remaining = damage - absorbed;

  return {
    ...familiar,
    tempHp: familiar.tempHp - absorbed,
    currentHp: Math.max(0, familiar.currentHp - remaining),
  };
}

/**
 * Dismiss a familiar by ID, returning the filtered array without it.
 */
export function dismissFamiliar(
  familiars: FamiliarInstance[],
  familiarId: string
): FamiliarInstance[] {
  return familiars.filter((f) => f.id !== familiarId);
}

/**
 * Remove all dead familiars (currentHp <= 0) from the array.
 */
export function removeDead(
  familiars: FamiliarInstance[]
): FamiliarInstance[] {
  return familiars.filter((f) => f.currentHp > 0);
}
