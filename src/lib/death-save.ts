import type { CharacterData } from "@/types";

export interface DeathSaveState {
  successes: number;
  failures: number;
}

/**
 * Resolve one death saving throw.
 *
 * - Natural 20: regain 1 HP and reset saves (bonuses don't matter).
 * - Natural 1: two failures (bonuses don't rescue it).
 * - Otherwise: success if d20 + bonus >= 10, failure if not.
 *
 * `bonus` covers gear like Ring/Cloak of Protection (+1 to all saves) and
 * Ramil's Family Ring (+2 to death saves). Counts are capped at 3.
 */
export function resolveDeathSave(
  current: DeathSaveState,
  natural: number,
  bonus = 0
): Partial<CharacterData> {
  if (natural === 20) {
    return { currentHp: 1, deathSaves: { successes: 0, failures: 0 } };
  }

  let successes = current.successes;
  let failures = current.failures;

  if (natural === 1) {
    failures += 2;
  } else if (natural + bonus >= 10) {
    successes += 1;
  } else {
    failures += 1;
  }

  return {
    deathSaves: { successes: Math.min(3, successes), failures: Math.min(3, failures) },
  };
}
