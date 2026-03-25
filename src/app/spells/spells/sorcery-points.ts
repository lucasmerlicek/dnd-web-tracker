/**
 * Pure sorcery point conversion logic.
 *
 * SP-to-slot costs (D&D 5E):
 *   1st-level slot = 2 SP
 *   2nd-level slot = 3 SP
 *   3rd-level slot = 5 SP
 *
 * Slot-to-SP conversion:
 *   Any slot → SP equal to the slot's level (1st = 1 SP, 2nd = 2 SP, 3rd = 3 SP)
 */

/** Cost in sorcery points to create a spell slot of the given level key. */
export const SP_TO_SLOT_COST: Record<string, number> = {
  "1st": 2,
  "2nd": 3,
  "3rd": 5,
};

/** Map a spell slot level key (e.g. "1st") to its numeric level. */
export function slotLevelNumber(level: string): number {
  const map: Record<string, number> = { "1st": 1, "2nd": 2, "3rd": 3 };
  return map[level] ?? 0;
}

/** SP gained when converting a slot of the given level to sorcery points. */
export function slotToSpGain(level: string): number {
  return slotLevelNumber(level);
}

export interface ConversionState {
  currentSorceryPoints: number;
  sorceryPointsMax: number;
  currentSlots: Record<string, number>;
}

export interface ConversionResult {
  newSorceryPoints: number;
  newSlots: Record<string, number>;
  success: boolean;
  error?: string;
}

/**
 * Convert sorcery points into a spell slot.
 * Returns the new state after conversion, or an error if insufficient SP.
 */
export function convertSpToSlot(
  state: ConversionState,
  level: string
): ConversionResult {
  const cost = SP_TO_SLOT_COST[level];
  if (cost === undefined) {
    return { newSorceryPoints: state.currentSorceryPoints, newSlots: { ...state.currentSlots }, success: false, error: `Invalid slot level: ${level}` };
  }
  if (state.currentSorceryPoints < cost) {
    return { newSorceryPoints: state.currentSorceryPoints, newSlots: { ...state.currentSlots }, success: false, error: "Not enough sorcery points" };
  }
  const newSlots = { ...state.currentSlots };
  newSlots[level] = (newSlots[level] ?? 0) + 1;
  return {
    newSorceryPoints: state.currentSorceryPoints - cost,
    newSlots,
    success: true,
  };
}

/**
 * Convert a spell slot into sorcery points.
 * Gain SP equal to the slot's level. SP is capped at sorceryPointsMax.
 */
export function convertSlotToSp(
  state: ConversionState,
  level: string
): ConversionResult {
  const current = state.currentSlots[level] ?? 0;
  if (current <= 0) {
    return { newSorceryPoints: state.currentSorceryPoints, newSlots: { ...state.currentSlots }, success: false, error: "No slots to convert" };
  }
  const gain = slotToSpGain(level);
  if (gain === 0) {
    return { newSorceryPoints: state.currentSorceryPoints, newSlots: { ...state.currentSlots }, success: false, error: `Invalid slot level: ${level}` };
  }
  const newSlots = { ...state.currentSlots };
  newSlots[level] = current - 1;
  return {
    newSorceryPoints: Math.min(state.currentSorceryPoints + gain, state.sorceryPointsMax),
    newSlots,
    success: true,
  };
}
