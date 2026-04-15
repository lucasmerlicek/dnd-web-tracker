/**
 * Apply Empowered Spell reroll: for each die whose value is <= dieSides/2,
 * replace it with a new random value in [1, dieSides].
 * Returns the new rolls array.
 */
export function applyEmpoweredReroll(
  rolls: number[],
  dieSides: number,
  rng: () => number = Math.random,
): number[] {
  const threshold = dieSides / 2;
  return rolls.map((v) =>
    v <= threshold ? Math.floor(rng() * dieSides) + 1 : v,
  );
}

/**
 * Deduct 1 SP for Empowered Spell.
 * Returns the new sorcery points value.
 */
export function deductEmpoweredSp(currentSorceryPoints: number): number {
  return currentSorceryPoints - 1;
}
