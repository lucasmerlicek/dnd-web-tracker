/**
 * Pure functions for the Strength of the Grave feature.
 *
 * Strength of the Grave is a Shadow Sorcerer ability that allows a CHA saving
 * throw when reduced to 0 HP (non-radiant, non-crit). On success, the
 * character stays at 1 HP instead. Usable once per long rest.
 */

/**
 * Determine whether the Strength of the Grave prompt should appear.
 *
 * Returns true iff:
 * - newHp <= 0
 * - damageType is not "radiant"
 * - the hit was not a critical hit
 * - the feature has not already been used since the last long rest
 */
export function shouldPromptStrengthOfGrave(
  currentHp: number,
  newHp: number,
  damageType: string | undefined,
  isCriticalHit: boolean,
  strengthOfTheGraveUsed: boolean
): boolean {
  return (
    newHp <= 0 &&
    damageType !== "radiant" &&
    !isCriticalHit &&
    !strengthOfTheGraveUsed
  );
}

/**
 * Calculate the DC for the Strength of the Grave CHA saving throw.
 *
 * DC = 5 + damage taken.
 */
export function calcStrengthOfGraveDC(damageTaken: number): number {
  return 5 + damageTaken;
}

/**
 * Resolve the outcome of a Strength of the Grave saving throw.
 *
 * If rollTotal >= dc the character survives at 1 HP; otherwise they drop to 0.
 */
export function applyStrengthOfGraveResult(
  rollTotal: number,
  dc: number
): { survived: boolean; newHp: number } {
  const survived = rollTotal >= dc;
  return { survived, newHp: survived ? 1 : 0 };
}
