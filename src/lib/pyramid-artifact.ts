/**
 * Pyramid Artifact (Ramil).
 *
 * Once per long rest, as a bonus action, recover one expended spell slot of
 * any level.
 */
import type { CharacterData } from "@/types";

const SLOT_LEVEL: Record<string, number> = {
  "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5,
  "6th": 6, "7th": 7, "8th": 8, "9th": 9,
};

/** True if the character carries the Pyramid Artifact (utility or gear). */
export function hasPyramidArtifact(data: CharacterData): boolean {
  const items = [
    ...(data.inventoryItems?.utility ?? []),
    ...(data.inventoryItems?.gear ?? []),
  ];
  return items.some((i) => /pyramid/i.test(i.name));
}

/** Slot levels with at least one expended slot, lowest first. */
export function expendedSlotLevels(
  spellSlots: Record<string, number>,
  currentSlots: Record<string, number>
): string[] {
  return Object.keys(spellSlots)
    .filter((lvl) => SLOT_LEVEL[lvl] !== undefined && (currentSlots[lvl] ?? 0) < (spellSlots[lvl] ?? 0))
    .sort((a, b) => SLOT_LEVEL[a] - SLOT_LEVEL[b]);
}

export interface PyramidResult {
  success: boolean;
  newSlots: Record<string, number>;
  error?: string;
}

/**
 * Recover one slot of `level`. Fails with state unchanged if the artifact was
 * already used this long rest or no slot of that level is expended.
 * Never mutates its inputs.
 */
export function recoverWithPyramid(
  spellSlots: Record<string, number>,
  currentSlots: Record<string, number>,
  level: string,
  alreadyUsed: boolean
): PyramidResult {
  const unchanged = { ...currentSlots };
  if (alreadyUsed) {
    return { success: false, newSlots: unchanged, error: "Already used — recharges on a long rest" };
  }
  const max = spellSlots[level] ?? 0;
  const cur = currentSlots[level] ?? 0;
  if (SLOT_LEVEL[level] === undefined || cur >= max) {
    return { success: false, newSlots: unchanged, error: `No expended ${level} slot to recover` };
  }
  return { success: true, newSlots: { ...currentSlots, [level]: cur + 1 } };
}
