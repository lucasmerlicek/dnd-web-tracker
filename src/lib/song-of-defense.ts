/**
 * Song of Defense (Bladesinger, Wizard 10).
 *
 * When you take damage while Bladesong is active, you can take a Reaction to
 * expend one spell slot and reduce the damage by five times the slot's level.
 */

const SLOT_LEVEL: Record<string, number> = {
  "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5,
  "6th": 6, "7th": 7, "8th": 8, "9th": 9,
};

/** Damage reduction for expending a slot of the given level key. */
export function songOfDefenseReduction(levelKey: string): number {
  return (SLOT_LEVEL[levelKey] ?? 0) * 5;
}

/** Slot levels with at least one slot remaining, lowest first. */
export function availableSlotLevels(currentSlots: Record<string, number>): string[] {
  return Object.keys(currentSlots)
    .filter((lvl) => SLOT_LEVEL[lvl] !== undefined && (currentSlots[lvl] ?? 0) > 0)
    .sort((a, b) => SLOT_LEVEL[a] - SLOT_LEVEL[b]);
}

export interface SongOfDefenseResult {
  success: boolean;
  newSlots: Record<string, number>;
  reduction: number;
  error?: string;
}

/**
 * Expend one slot of `levelKey`. Requires Bladesong to be active and a slot
 * to be available; otherwise fails with state unchanged. Never mutates input.
 */
export function expendSongOfDefense(
  currentSlots: Record<string, number>,
  levelKey: string,
  bladesongActive: boolean
): SongOfDefenseResult {
  if (!bladesongActive) {
    return { success: false, newSlots: { ...currentSlots }, reduction: 0, error: "Bladesong must be active" };
  }
  const remaining = currentSlots[levelKey] ?? 0;
  if (SLOT_LEVEL[levelKey] === undefined || remaining <= 0) {
    return { success: false, newSlots: { ...currentSlots }, reduction: 0, error: `No ${levelKey} slots remaining` };
  }
  return {
    success: true,
    newSlots: { ...currentSlots, [levelKey]: remaining - 1 },
    reduction: songOfDefenseReduction(levelKey),
  };
}
