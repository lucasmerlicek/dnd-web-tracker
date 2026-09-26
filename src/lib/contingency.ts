/**
 * Contingency (6th-level evocation).
 *
 * Casting Contingency also casts a bound spell of 5th level or lower, expending
 * spell slots for both: the 6th-level slot for Contingency itself plus a slot
 * at the bound spell's level.
 */

const SLOT_LEVEL: Record<string, number> = {
  "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5,
  "6th": 6, "7th": 7, "8th": 8, "9th": 9,
};

export const CONTINGENCY_SLOT = "6th";
export const CONTINGENCY_MAX_BOUND_LEVEL = 5;

/** Bound-spell slot levels the character has (5th or lower), lowest first. */
export function contingencyBindLevels(spellSlots: Record<string, number>): string[] {
  return Object.keys(spellSlots)
    .filter((lvl) => {
      const n = SLOT_LEVEL[lvl];
      return n !== undefined && n <= CONTINGENCY_MAX_BOUND_LEVEL;
    })
    .sort((a, b) => SLOT_LEVEL[a] - SLOT_LEVEL[b]);
}

export interface ContingencyResult {
  success: boolean;
  newSlots: Record<string, number>;
  error?: string;
}

/**
 * Expend one 6th-level slot and one slot at `boundLevel`. Fails with state
 * unchanged if either slot is unavailable or the bound level is above 5th.
 * Never mutates its input.
 */
export function castContingency(
  currentSlots: Record<string, number>,
  boundLevel: string
): ContingencyResult {
  const unchanged = { ...currentSlots };
  const n = SLOT_LEVEL[boundLevel];
  if (n === undefined || n > CONTINGENCY_MAX_BOUND_LEVEL) {
    return { success: false, newSlots: unchanged, error: "Bound spell must be 5th level or lower" };
  }
  if ((currentSlots[CONTINGENCY_SLOT] ?? 0) <= 0) {
    return { success: false, newSlots: unchanged, error: "No 6th-level slots remaining" };
  }
  if ((currentSlots[boundLevel] ?? 0) <= 0) {
    return { success: false, newSlots: unchanged, error: `No ${boundLevel} slots remaining for the bound spell` };
  }
  return {
    success: true,
    newSlots: {
      ...currentSlots,
      [CONTINGENCY_SLOT]: currentSlots[CONTINGENCY_SLOT] - 1,
      [boundLevel]: currentSlots[boundLevel] - 1,
    },
  };
}
