/**
 * Arcane Recovery (Wizard).
 *
 * Once per long rest, when you finish a short rest, you can recover expended
 * spell slots with a combined level no higher than half your Wizard level
 * (rounded up). None of the recovered slots can be 6th level or higher.
 */

const SLOT_LEVEL: Record<string, number> = {
  "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5,
  "6th": 6, "7th": 7, "8th": 8, "9th": 9,
};

/** Highest slot level Arcane Recovery may restore. */
export const ARCANE_RECOVERY_MAX_SLOT_LEVEL = 5;

/** Extract the Wizard level from a class string like "Fighter 1 / Wizard 11 (Bladesinger)". */
export function getWizardLevel(charClass: string): number {
  const m = charClass.match(/wizard\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : 0;
}

/** Combined slot levels recoverable: half the Wizard level, rounded up. */
export function arcaneRecoveryBudget(wizardLevel: number): number {
  return wizardLevel > 0 ? Math.ceil(wizardLevel / 2) : 0;
}

/** Slot levels eligible for recovery: 5th or lower, present, and at least one expended. */
export function recoverableSlotLevels(
  spellSlots: Record<string, number>,
  currentSlots: Record<string, number>
): string[] {
  return Object.keys(spellSlots)
    .filter((lvl) => {
      const n = SLOT_LEVEL[lvl];
      if (!n || n > ARCANE_RECOVERY_MAX_SLOT_LEVEL) return false;
      return (currentSlots[lvl] ?? 0) < (spellSlots[lvl] ?? 0);
    })
    .sort((a, b) => SLOT_LEVEL[a] - SLOT_LEVEL[b]);
}

/** Sum of slot levels in a selection, e.g. { "2nd": 1, "3rd": 1 } -> 5. */
export function selectionCost(selection: Record<string, number>): number {
  return Object.entries(selection).reduce(
    (sum, [lvl, count]) => sum + (SLOT_LEVEL[lvl] ?? 0) * Math.max(0, count),
    0
  );
}

export interface ArcaneRecoveryResult {
  success: boolean;
  newSlots: Record<string, number>;
  error?: string;
}

/**
 * Validate and apply an Arcane Recovery selection. Never mutates its inputs.
 * Fails (state unchanged) if a level is 6th+, exceeds the expended count for
 * that level, or the total cost exceeds the budget.
 */
export function applyArcaneRecovery(
  spellSlots: Record<string, number>,
  currentSlots: Record<string, number>,
  selection: Record<string, number>,
  budget: number
): ArcaneRecoveryResult {
  const unchanged = { ...currentSlots };
  const newSlots = { ...currentSlots };

  for (const [lvl, count] of Object.entries(selection)) {
    if (count <= 0) continue;
    const n = SLOT_LEVEL[lvl];
    if (!n || n > ARCANE_RECOVERY_MAX_SLOT_LEVEL) {
      return { success: false, newSlots: unchanged, error: `Cannot recover ${lvl}-level slots` };
    }
    const expended = (spellSlots[lvl] ?? 0) - (currentSlots[lvl] ?? 0);
    if (count > expended) {
      return { success: false, newSlots: unchanged, error: `Only ${expended} ${lvl} slot(s) expended` };
    }
    newSlots[lvl] = (currentSlots[lvl] ?? 0) + count;
  }

  const cost = selectionCost(selection);
  if (cost > budget) {
    return { success: false, newSlots: unchanged, error: `Selection costs ${cost}, budget is ${budget}` };
  }
  return { success: true, newSlots };
}
